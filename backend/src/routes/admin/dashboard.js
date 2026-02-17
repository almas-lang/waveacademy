// Admin Dashboard Analytics
const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../../middleware/auth');
const { cacheGet } = require('../../utils/cache');

router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /admin/dashboard/analytics
 * Aggregated dashboard data: stats, trends, chart, performance, activity
 */
router.get('/analytics', async (req, res, next) => {
  try {
    const data = await cacheGet('dashboard:analytics', async () => {
      const prisma = req.prisma;
      const now = new Date();

      // Date boundaries
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfWeek.getDate() - 7);
      const startOfLastWeek = new Date(startOfWeek);
      startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

      // 6 months ago for chart
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

      // 30 days ago for DAU chart
      const thirtyDaysAgo = new Date(startOfToday);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

      // ---- Batch 1: All independent counts ----
      const [
        totalPrograms,
        programsThisMonth,
        programsLastMonth,
        totalLearners,
        learnersThisMonth,
        learnersLastMonth,
        todaySessions,
        yesterdaySessions,
        activeLearnersThisWeek,
        activeLearnersLastWeek,
        enrollmentsByMonth,
        topPrograms,
        totalCompletedLessons,
        recentEnrollments,
        recentCompletions,
        dailyActiveUsersRaw,
        totalRevenueAgg,
        revenueThisMonthAgg,
        revenueLastMonthAgg,
        revenueDailyRaw,
        revenueWeeklyRaw,
        revenueMonthlyRaw,
      ] = await Promise.all([
        // Programs
        prisma.program.count(),
        prisma.program.count({ where: { createdAt: { gte: startOfMonth } } }),
        prisma.program.count({ where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } } }),

        // Learners
        prisma.user.count({ where: { role: 'LEARNER' } }),
        prisma.user.count({ where: { role: 'LEARNER', createdAt: { gte: startOfMonth } } }),
        prisma.user.count({ where: { role: 'LEARNER', createdAt: { gte: startOfLastMonth, lt: startOfMonth } } }),

        // Today's sessions vs yesterday
        prisma.session.count({ where: { startTime: { gte: startOfToday, lt: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000) } } }),
        prisma.session.count({ where: { startTime: { gte: startOfYesterday, lt: startOfToday } } }),

        // Active learners (distinct users with login activity this week)
        prisma.userSession.findMany({
          where: { lastActive: { gte: startOfWeek }, user: { role: 'LEARNER' } },
          distinct: ['userId'],
          select: { userId: true },
        }),
        prisma.userSession.findMany({
          where: { lastActive: { gte: startOfLastWeek, lt: startOfWeek }, user: { role: 'LEARNER' } },
          distinct: ['userId'],
          select: { userId: true },
        }),

        // Enrollments by month (last 6 months)
        prisma.$queryRaw`
          SELECT
            TO_CHAR(DATE_TRUNC('month', enrolled_at), 'Mon') AS month,
            CAST(COUNT(*) AS INTEGER) AS enrollments
          FROM enrollments
          WHERE enrolled_at >= ${sixMonthsAgo}
          GROUP BY DATE_TRUNC('month', enrolled_at), TO_CHAR(DATE_TRUNC('month', enrolled_at), 'Mon')
          ORDER BY DATE_TRUNC('month', enrolled_at) ASC
        `,

        // Top 5 programs by enrollment
        prisma.program.findMany({
          take: 5,
          orderBy: { enrollments: { _count: 'desc' } },
          select: {
            id: true,
            name: true,
            _count: { select: { enrollments: true, lessons: true } },
          },
        }),

        // Total completed lessons (across all users)
        prisma.progress.count({ where: { status: 'COMPLETED' } }),

        // Recent enrollments
        prisma.enrollment.findMany({
          take: 8,
          orderBy: { enrolledAt: 'desc' },
          select: {
            enrolledAt: true,
            user: { select: { name: true } },
            program: { select: { name: true } },
          },
        }),

        // Recent completions
        prisma.progress.findMany({
          where: { status: 'COMPLETED', completedAt: { not: null } },
          take: 8,
          orderBy: { completedAt: 'desc' },
          select: {
            completedAt: true,
            user: { select: { name: true } },
            lesson: { select: { title: true } },
          },
        }),

        // Daily active users (last 30 days)
        prisma.$queryRaw`
          SELECT
            TO_CHAR(d.day, 'Mon DD') AS date,
            d.day AS raw_date,
            CAST(COALESCE(u.cnt, 0) AS INTEGER) AS users
          FROM generate_series(
            ${thirtyDaysAgo}::date,
            ${startOfToday}::date,
            '1 day'::interval
          ) AS d(day)
          LEFT JOIN (
            SELECT
              DATE_TRUNC('day', us.last_active) AS day,
              COUNT(DISTINCT us.user_id) AS cnt
            FROM user_sessions us
            JOIN users u ON u.id = us.user_id AND u.role = 'LEARNER'
            WHERE us.last_active >= ${thirtyDaysAgo}
            GROUP BY DATE_TRUNC('day', us.last_active)
          ) u ON DATE_TRUNC('day', d.day) = u.day
          ORDER BY d.day ASC
        `,

        // Revenue: total
        prisma.payment.aggregate({ where: { status: 'SUCCESS' }, _sum: { amount: true } }),

        // Revenue: this month
        prisma.payment.aggregate({ where: { status: 'SUCCESS', createdAt: { gte: startOfMonth } }, _sum: { amount: true } }),

        // Revenue: last month
        prisma.payment.aggregate({ where: { status: 'SUCCESS', createdAt: { gte: startOfLastMonth, lt: startOfMonth } }, _sum: { amount: true } }),

        // Daily revenue (last 30 days) — aggregated in SQL
        prisma.$queryRaw`
          SELECT TO_CHAR(d.day, 'Mon DD') AS label,
                 CAST(COALESCE(p.total, 0) AS FLOAT) AS revenue
          FROM generate_series(${thirtyDaysAgo}::date, ${startOfToday}::date, '1 day'::interval) AS d(day)
          LEFT JOIN (
            SELECT DATE_TRUNC('day', created_at) AS day, SUM(amount) AS total
            FROM payments WHERE status = 'SUCCESS' AND created_at >= ${thirtyDaysAgo}
            GROUP BY 1
          ) p ON DATE_TRUNC('day', d.day) = p.day
          ORDER BY d.day ASC
        `,

        // Weekly revenue (last 12 weeks) — aggregated in SQL
        prisma.$queryRaw`
          SELECT TO_CHAR(DATE_TRUNC('week', d.week), 'Mon DD') AS label,
                 CAST(COALESCE(p.total, 0) AS FLOAT) AS revenue
          FROM generate_series(
            DATE_TRUNC('week', ${startOfToday}::date - INTERVAL '11 weeks'),
            DATE_TRUNC('week', ${startOfToday}::date),
            '1 week'::interval
          ) AS d(week)
          LEFT JOIN (
            SELECT DATE_TRUNC('week', created_at) AS week, SUM(amount) AS total
            FROM payments WHERE status = 'SUCCESS' AND created_at >= ${sixMonthsAgo}
            GROUP BY 1
          ) p ON d.week = p.week
          ORDER BY d.week ASC
        `,

        // Monthly revenue (last 6 months) — aggregated in SQL
        prisma.$queryRaw`
          SELECT TO_CHAR(d.month, 'Mon') AS label,
                 CAST(COALESCE(p.total, 0) AS FLOAT) AS revenue
          FROM generate_series(${sixMonthsAgo}::date, ${startOfToday}::date, '1 month'::interval) AS d(month)
          LEFT JOIN (
            SELECT DATE_TRUNC('month', created_at) AS month, SUM(amount) AS total
            FROM payments WHERE status = 'SUCCESS' AND created_at >= ${sixMonthsAgo}
            GROUP BY 1
          ) p ON d.month = p.month
          ORDER BY d.month ASC
        `,
      ]);

      // ---- Batch 2: Per-program completion rates for top 5 ----
      const activeLearnersCount = activeLearnersThisWeek.length;
      const activeLearnersLastCount = activeLearnersLastWeek.length;

      let programPerformance = [];
      if (topPrograms.length > 0) {
        const programIds = topPrograms.map(p => p.id);

        // Single query: completed lessons per program (replaces N+1 loop)
        const completedByProgram = await prisma.progress.groupBy({
          by: ['lessonId'],
          where: {
            status: 'COMPLETED',
            lesson: { programId: { in: programIds } },
          },
          _count: { _all: true },
        });

        // Map lesson IDs to program IDs using a single batch query
        const lessonProgramMap = await prisma.lesson.findMany({
          where: { id: { in: completedByProgram.map(c => c.lessonId) } },
          select: { id: true, programId: true },
        });
        const lessonToProgram = Object.fromEntries(lessonProgramMap.map(l => [l.id, l.programId]));

        // Aggregate completed counts per program
        const completedCounts = {};
        for (const row of completedByProgram) {
          const pid = lessonToProgram[row.lessonId];
          if (pid) completedCounts[pid] = (completedCounts[pid] || 0) + row._count._all;
        }

        programPerformance = topPrograms.map(p => {
          const lessonCount = p._count.lessons;
          const enrollmentCount = p._count.enrollments;
          const totalAssigned = lessonCount * enrollmentCount;
          const completed = completedCounts[p.id] || 0;
          return {
            id: p.id,
            name: p.name,
            enrollmentCount,
            completionRate: totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0,
          };
        });
      }

      // ---- Compute trends ----
      function computeTrend(current, previous) {
        if (previous === 0) return { value: current > 0 ? 100 : 0, isPositive: true };
        const change = Math.round(((current - previous) / previous) * 100);
        return { value: Math.abs(change), isPositive: change >= 0 };
      }

      // ---- Overall completion rate ----
      const totalLessonsAssigned = await prisma.$queryRaw`
        SELECT CAST(COALESCE(SUM(lesson_count * enrollment_count), 0) AS INTEGER) AS total
        FROM (
          SELECT p.id,
            (SELECT COUNT(*) FROM lessons l WHERE l.program_id = p.id) AS lesson_count,
            (SELECT COUNT(*) FROM enrollments e WHERE e.program_id = p.id) AS enrollment_count
          FROM programs p
        ) sub
        WHERE lesson_count > 0 AND enrollment_count > 0
      `;
      const totalAssigned = totalLessonsAssigned[0]?.total || 0;
      const overallCompletionRate = totalAssigned > 0
        ? Math.round((totalCompletedLessons / totalAssigned) * 100)
        : 0;

      // ---- Enrollment chart: fill missing months ----
      const chartData = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthLabel = d.toLocaleString('en-US', { month: 'short' });
        const found = enrollmentsByMonth.find(r => r.month === monthLabel);
        chartData.push({
          month: monthLabel,
          enrollments: found ? Number(found.enrollments) : 0,
        });
      }

      // ---- Recent activity feed (merge + sort) ----
      const recentActivity = [
        ...recentEnrollments.map(e => ({
          type: 'enrollment',
          message: `${e.user.name} enrolled in ${e.program.name}`,
          timestamp: e.enrolledAt,
        })),
        ...recentCompletions.map(c => ({
          type: 'completion',
          message: `${c.user.name} completed "${c.lesson.title}"`,
          timestamp: c.completedAt,
        })),
      ]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 8);

      // ---- DAU chart: strip raw_date ----
      const dailyActiveUsers = dailyActiveUsersRaw.map(d => ({
        date: d.date,
        users: d.users,
      }));

      // ---- Revenue aggregation (pre-aggregated in SQL) ----
      const totalRevenue = totalRevenueAgg._sum.amount || 0;
      const revenueThisMonth = revenueThisMonthAgg._sum.amount || 0;
      const revenueLastMonth = revenueLastMonthAgg._sum.amount || 0;

      const revenueDaily = revenueDailyRaw.map(d => ({ label: d.label, revenue: Number(d.revenue) }));
      const revenueWeekly = revenueWeeklyRaw.map(d => ({ label: d.label, revenue: Number(d.revenue) }));
      const revenueMonthly = revenueMonthlyRaw.map(d => ({ label: d.label, revenue: Number(d.revenue) }));

      return {
        stats: {
          totalPrograms,
          totalLearners,
          activeLearners: activeLearnersCount,
          todaySessions,
          overallCompletionRate,
          totalRevenue,
        },
        trends: {
          programs: computeTrend(programsThisMonth, programsLastMonth),
          learners: computeTrend(learnersThisMonth, learnersLastMonth),
          activeLearners: computeTrend(activeLearnersCount, activeLearnersLastCount),
          todaySessions: computeTrend(todaySessions, yesterdaySessions),
          revenue: computeTrend(revenueThisMonth, revenueLastMonth),
        },
        enrollmentChart: chartData,
        dailyActiveUsers,
        programPerformance,
        recentActivity,
        revenueChart: {
          daily: revenueDaily,
          weekly: revenueWeekly,
          monthly: revenueMonthly,
        },
      };
    }, 180); // 3 min TTL

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
