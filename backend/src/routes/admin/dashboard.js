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
      ]);

      // ---- Batch 2: Per-program completion rates for top 5 ----
      const activeLearnersCount = activeLearnersThisWeek.length;
      const activeLearnersLastCount = activeLearnersLastWeek.length;

      let programPerformance = [];
      if (topPrograms.length > 0) {
        const programIds = topPrograms.map(p => p.id);

        // Get total assigned lessons and completed lessons per program
        const perProgramStats = await Promise.all(
          programIds.map(async (programId) => {
            const program = topPrograms.find(p => p.id === programId);
            const lessonCount = program._count.lessons;
            const enrollmentCount = program._count.enrollments;

            if (lessonCount === 0 || enrollmentCount === 0) {
              return { programId, completionRate: 0 };
            }

            const totalAssigned = lessonCount * enrollmentCount;
            const completed = await prisma.progress.count({
              where: {
                status: 'COMPLETED',
                lesson: { programId },
              },
            });

            return {
              programId,
              completionRate: Math.round((completed / totalAssigned) * 100),
            };
          })
        );

        programPerformance = topPrograms.map(p => {
          const stats = perProgramStats.find(s => s.programId === p.id);
          return {
            id: p.id,
            name: p.name,
            enrollmentCount: p._count.enrollments,
            completionRate: stats?.completionRate || 0,
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

      return {
        stats: {
          totalPrograms,
          totalLearners,
          activeLearners: activeLearnersCount,
          todaySessions,
          overallCompletionRate,
        },
        trends: {
          programs: computeTrend(programsThisMonth, programsLastMonth),
          learners: computeTrend(learnersThisMonth, learnersLastMonth),
          activeLearners: computeTrend(activeLearnersCount, activeLearnersLastCount),
          todaySessions: computeTrend(todaySessions, yesterdaySessions),
        },
        enrollmentChart: chartData,
        dailyActiveUsers,
        programPerformance,
        recentActivity,
      };
    }, 180); // 3 min TTL

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
