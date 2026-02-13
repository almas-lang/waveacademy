// Learner Routes
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { authenticate, requireLearner } = require('../middleware/auth');
const { cacheGet, cacheDel } = require('../utils/cache');
const { expandRecurringSession } = require('../utils/recurrence');

router.use(authenticate);
router.use(requireLearner);

/**
 * GET /learner/home
 * Learner home page data
 */
router.get('/home', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cacheKey = `learner:home:${userId}`;

    const data = await cacheGet(cacheKey, async () => {
      // Get enrollments with progress (only published programs)
      const enrollments = await req.prisma.enrollment.findMany({
        where: { userId, program: { isPublished: true } },
        include: {
          program: {
            include: {
              _count: { select: { lessons: true } }
            }
          }
        }
      });

      // Get progress only for enrolled programs
      const enrolledProgramIds = enrollments.map(e => e.programId);
      const progress = await req.prisma.progress.findMany({
        where: {
          userId,
          lesson: { programId: { in: enrolledProgramIds } }
        },
        include: {
          lesson: {
            select: {
              id: true,
              title: true,
              programId: true,
              durationSeconds: true
            }
          }
        },
        orderBy: { lastAccessedAt: 'desc' }
      });

      // Build a set of completed lesson IDs for quick lookup
      const completedLessonIds = new Set(
        progress.filter(p => p.status === 'COMPLETED').map(p => p.lesson.id)
      );

      // For each program, get the content tree and find the first uncompleted lesson in course order
      const programTrees = await Promise.all(
        enrollments.map(e =>
          req.prisma.program.findUnique({
            where: { id: e.programId },
            include: {
              topics: {
                include: {
                  subtopics: {
                    include: {
                      lessons: { orderBy: { orderIndex: 'asc' }, select: { id: true, orderIndex: true } }
                    },
                    orderBy: { orderIndex: 'asc' }
                  },
                  lessons: {
                    where: { subtopicId: null },
                    orderBy: { orderIndex: 'asc' },
                    select: { id: true, orderIndex: true }
                  }
                },
                orderBy: { orderIndex: 'asc' }
              },
              lessons: {
                where: { topicId: null, subtopicId: null },
                orderBy: { orderIndex: 'asc' },
                select: { id: true, orderIndex: true }
              }
            }
          })
        )
      );

      // Helper: flatten content tree into ordered lesson IDs
      function flattenLessons(program) {
        const lessons = [];
        if (!program) return lessons;
        for (const topic of program.topics) {
          const children = [
            ...topic.subtopics.map(s => ({ type: 'subtopic', orderIndex: s.orderIndex, lessons: s.lessons })),
            ...topic.lessons.map(l => ({ type: 'lesson', orderIndex: l.orderIndex, lesson: l }))
          ].sort((a, b) => a.orderIndex - b.orderIndex);
          for (const child of children) {
            if (child.type === 'subtopic') {
              lessons.push(...child.lessons.map(l => l.id));
            } else {
              lessons.push(child.lesson.id);
            }
          }
        }
        lessons.push(...program.lessons.map(l => l.id));
        return lessons;
      }

      // Calculate program progress
      const enrolledPrograms = enrollments.map((enrollment, i) => {
        const programProgress = progress.filter(
          p => p.lesson.programId === enrollment.programId
        );
        const completedCount = programProgress.filter(p => p.status === 'COMPLETED').length;
        const totalLessons = enrollment.program._count.lessons;

        // Find first uncompleted lesson in course order
        const orderedLessonIds = flattenLessons(programTrees[i]);
        const nextLessonId = orderedLessonIds.find(id => !completedLessonIds.has(id)) || null;

        return {
          id: enrollment.program.id,
          name: enrollment.program.name,
          description: enrollment.program.description,
          thumbnailUrl: enrollment.program.thumbnailUrl,
          completedLessons: completedCount,
          totalLessons,
          progressPercentage: totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0,
          lastAccessedAt: programProgress[0]?.lastAccessedAt || enrollment.enrolledAt,
          nextLessonId
        };
      });

      // Find continue learning (last in-progress lesson)
      const inProgressLesson = progress.find(p => p.status === 'IN_PROGRESS');
      let continueLearning = null;

      if (inProgressLesson) {
        const program = enrollments.find(e => e.programId === inProgressLesson.lesson.programId);
        continueLearning = {
          lessonId: inProgressLesson.lesson.id,
          lessonTitle: inProgressLesson.lesson.title,
          programName: program?.program.name,
          watchPosition: inProgressLesson.watchPositionSeconds,
          totalDuration: inProgressLesson.lesson.durationSeconds
        };
      }

      // Get upcoming sessions
      const programIds = enrollments.map(e => e.programId);
      const upcomingSessions = await req.prisma.session.findMany({
        where: {
          startTime: { gte: new Date() },
          OR: [
            { sessionPrograms: { some: { programId: null } } },
            { sessionPrograms: { some: { programId: { in: programIds } } } }
          ]
        },
        take: 5,
        orderBy: { startTime: 'asc' }
      });

      // Learning stats (derived from already-fetched progress)
      const completedLessons = progress.filter(p => p.status === 'COMPLETED').length;
      const totalWatchSeconds = progress.reduce((sum, p) => sum + (p.watchPositionSeconds || 0), 0);
      const hoursLearned = Math.round(totalWatchSeconds / 360) / 10; // 1 decimal

      // Active days this week (Monday = start)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      startOfWeek.setHours(0, 0, 0, 0);

      const activeDaysThisWeek = new Set(
        progress
          .filter(p => p.lastAccessedAt && new Date(p.lastAccessedAt) >= startOfWeek)
          .map(p => new Date(p.lastAccessedAt).toDateString())
      ).size;

      // Current streak (consecutive days with activity)
      const uniqueDates = Array.from(new Set(
        progress
          .filter(p => p.lastAccessedAt)
          .map(p => {
            const d = new Date(p.lastAccessedAt);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          })
      )).sort().reverse();

      let currentStreak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const checkDate = new Date(today);

      // If not active today, start checking from yesterday
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      if (!uniqueDates.includes(todayStr)) {
        checkDate.setDate(checkDate.getDate() - 1);
      }

      for (let i = 0; i < 365; i++) {
        const checkStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
        if (uniqueDates.includes(checkStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      return {
        user: { name: req.user.name },
        enrolledPrograms,
        continueLearning,
        learningStats: {
          lessonsCompleted: completedLessons,
          hoursLearned,
          activeDaysThisWeek,
          currentStreak
        },
        upcomingSessions: upcomingSessions.map(s => ({
          id: s.id,
          name: s.name,
          startTime: s.startTime,
          meetLink: s.meetLink
        }))
      };
    }, 120); // 2 minutes (shorter TTL since it includes progress)

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /learner/programs/:id
 * Get program with content and progress
 */
router.get('/programs/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify enrollment
    const enrollment = await req.prisma.enrollment.findUnique({
      where: {
        userId_programId: { userId, programId: id }
      }
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not enrolled in this program' }
      });
    }

    // Get program with content
    const program = await req.prisma.program.findUnique({
      where: { id },
      include: {
        topics: {
          include: {
            subtopics: {
              include: {
                lessons: { orderBy: { orderIndex: 'asc' } }
              },
              orderBy: { orderIndex: 'asc' }
            },
            lessons: {
              where: { subtopicId: null },
              orderBy: { orderIndex: 'asc' }
            }
          },
          orderBy: { orderIndex: 'asc' }
        },
        lessons: {
          where: { topicId: null, subtopicId: null },
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    if (!program || !program.isPublished) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Program not found' }
      });
    }

    // Get user progress
    const progressRecords = await req.prisma.progress.findMany({
      where: { userId, lesson: { programId: id } }
    });

    const progressMap = new Map(
      progressRecords.map(p => [p.lessonId, p])
    );

    // Build content tree with progress
    const buildLessonWithProgress = (lesson) => ({
      id: lesson.id,
      type: 'lesson',
      title: lesson.title,
      lessonType: lesson.type,
      durationSeconds: lesson.durationSeconds,
      orderIndex: lesson.orderIndex,
      progress: progressMap.get(lesson.id) || { status: 'NOT_STARTED', watchPositionSeconds: 0 }
    });

    const content = [];

    for (const topic of program.topics) {
      const topicChildren = [];

      for (const subtopic of topic.subtopics) {
        topicChildren.push({
          id: subtopic.id,
          type: 'subtopic',
          name: subtopic.name,
          orderIndex: subtopic.orderIndex,
          children: subtopic.lessons.map(buildLessonWithProgress)
        });
      }

      for (const lesson of topic.lessons) {
        topicChildren.push(buildLessonWithProgress(lesson));
      }

      // Sort children by orderIndex so subtopics and direct lessons interleave correctly
      topicChildren.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

      content.push({
        id: topic.id,
        type: 'topic',
        name: topic.name,
        orderIndex: topic.orderIndex,
        children: topicChildren
      });
    }

    for (const lesson of program.lessons) {
      content.push(buildLessonWithProgress(lesson));
    }

    // Build progress map for frontend
    const progress = {};
    for (const p of progressRecords) {
      progress[p.lessonId] = {
        status: p.status,
        watchPositionSeconds: p.watchPositionSeconds || 0,
        completedAt: p.completedAt
      };
    }

    res.json({
      success: true,
      data: {
        program: {
          id: program.id,
          name: program.name,
          description: program.description,
          thumbnailUrl: program.thumbnailUrl
        },
        content,
        progress
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /learner/lessons/:id
 * Get lesson content with signed video URL
 */
router.get('/lessons/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const lesson = await req.prisma.lesson.findUnique({
      where: { id },
      include: {
        program: { select: { id: true, name: true } },
        attachments: true
      }
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Lesson not found' }
      });
    }

    // Verify enrollment
    const enrollment = await req.prisma.enrollment.findUnique({
      where: {
        userId_programId: { userId, programId: lesson.programId }
      }
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not enrolled in this program' }
      });
    }

    // Get or create progress
    let progress = await req.prisma.progress.findUnique({
      where: {
        userId_lessonId: { userId, lessonId: id }
      }
    });

    if (!progress) {
      progress = await req.prisma.progress.create({
        data: {
          userId,
          lessonId: id,
          status: 'NOT_STARTED'
        }
      });
    }

    // Update last accessed
    await req.prisma.progress.update({
      where: { id: progress.id },
      data: { lastAccessedAt: new Date() }
    });

    // Bust home cache so "Continue Learning" reflects this lesson
    await cacheDel(`learner:home:${userId}`);

    // Generate signed video URL if video
    let contentUrl = lesson.contentUrl;
    if (lesson.type === 'VIDEO' && contentUrl) {
      // Ensure embed URL format (not /play/) for responsive sizing
      contentUrl = contentUrl.replace('/play/', '/embed/');
      contentUrl = generateSignedVideoUrl(contentUrl);
    }

    // Get navigation - build flat lesson list matching the content tree order
    const programWithTree = await req.prisma.program.findUnique({
      where: { id: lesson.programId },
      include: {
        topics: {
          include: {
            subtopics: {
              include: {
                lessons: { orderBy: { orderIndex: 'asc' }, select: { id: true, title: true, orderIndex: true } }
              },
              orderBy: { orderIndex: 'asc' }
            },
            lessons: {
              where: { subtopicId: null },
              orderBy: { orderIndex: 'asc' },
              select: { id: true, title: true, orderIndex: true }
            }
          },
          orderBy: { orderIndex: 'asc' }
        },
        lessons: {
          where: { topicId: null, subtopicId: null },
          orderBy: { orderIndex: 'asc' },
          select: { id: true, title: true, orderIndex: true }
        }
      }
    });

    // Flatten in the same order the content tree renders
    const programLessons = [];
    if (programWithTree) {
      for (const topic of programWithTree.topics) {
        // Interleave subtopics and direct lessons by orderIndex
        const children = [
          ...topic.subtopics.map(s => ({ type: 'subtopic', orderIndex: s.orderIndex, lessons: s.lessons })),
          ...topic.lessons.map(l => ({ type: 'lesson', orderIndex: l.orderIndex, lesson: l }))
        ].sort((a, b) => a.orderIndex - b.orderIndex);

        for (const child of children) {
          if (child.type === 'subtopic') {
            programLessons.push(...child.lessons);
          } else {
            programLessons.push(child.lesson);
          }
        }
      }
      // Program-level lessons last
      programLessons.push(...programWithTree.lessons);
    }

    const currentIndex = programLessons.findIndex(l => l.id === id);
    const prevLesson = currentIndex > 0 ? programLessons[currentIndex - 1] : null;
    const nextLesson = currentIndex < programLessons.length - 1 ? programLessons[currentIndex + 1] : null;

    res.json({
      success: true,
      data: {
        lesson: {
          id: lesson.id,
          title: lesson.title,
          type: lesson.type,
          contentUrl,
          contentText: lesson.contentText,
          durationSeconds: lesson.durationSeconds,
          attachments: lesson.attachments
        },
        program: {
          id: lesson.program.id,
          name: lesson.program.name
        },
        progress: {
          status: progress.status,
          watchPositionSeconds: progress.watchPositionSeconds
        },
        navigation: {
          previousLesson: prevLesson ? { id: prevLesson.id, title: prevLesson.title } : null,
          nextLesson: nextLesson ? { id: nextLesson.id, title: nextLesson.title } : null,
          currentIndex: currentIndex + 1,
          totalLessons: programLessons.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /learner/lessons/:id/progress
 * Update watch progress
 */
router.post('/lessons/:id/progress', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { watchPositionSeconds } = req.body;
    const userId = req.user.id;

    const progress = await req.prisma.progress.upsert({
      where: {
        userId_lessonId: { userId, lessonId: id }
      },
      update: {
        watchPositionSeconds,
        status: 'IN_PROGRESS',
        lastAccessedAt: new Date()
      },
      create: {
        userId,
        lessonId: id,
        watchPositionSeconds,
        status: 'IN_PROGRESS'
      }
    });

    // Bust caches (progress changed)
    await Promise.all([
      cacheDel(`learner:home:${userId}`),
      cacheDel(`learner:profile:${userId}`)
    ]);

    res.json({
      success: true,
      data: {
        status: progress.status,
        watchPosition: progress.watchPositionSeconds
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /learner/lessons/:id/complete
 * Mark lesson as complete
 */
router.post('/lessons/:id/complete', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await req.prisma.progress.upsert({
      where: {
        userId_lessonId: { userId, lessonId: id }
      },
      update: {
        status: 'COMPLETED',
        completedAt: new Date(),
        lastAccessedAt: new Date()
      },
      create: {
        userId,
        lessonId: id,
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });

    // Bust caches (lesson completed)
    await Promise.all([
      cacheDel(`learner:home:${userId}`),
      cacheDel(`learner:profile:${userId}`)
    ]);

    // Get next lesson
    const lesson = await req.prisma.lesson.findUnique({
      where: { id },
      select: { programId: true }
    });

    const programLessons = await req.prisma.lesson.findMany({
      where: { programId: lesson.programId },
      orderBy: [{ topicId: 'asc' }, { subtopicId: 'asc' }, { orderIndex: 'asc' }],
      select: { id: true }
    });

    const currentIndex = programLessons.findIndex(l => l.id === id);
    const nextLesson = currentIndex < programLessons.length - 1 ? programLessons[currentIndex + 1] : null;

    res.json({
      success: true,
      message: 'Lesson marked as complete',
      data: {
        nextLessonId: nextLesson?.id
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /learner/sessions
 * Get sessions for a given month (defaults to current month)
 */
router.get('/sessions', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);
    const year = parseInt(req.query.year) || now.getFullYear();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Get enrolled program IDs
    const enrollments = await req.prisma.enrollment.findMany({
      where: { userId },
      select: { programId: true }
    });
    const programIds = enrollments.map(e => e.programId);

    const programFilter = {
      OR: [
        { sessionPrograms: { some: { programId: null } } },
        { sessionPrograms: { some: { programId: { in: programIds } } } }
      ]
    };

    const sessions = await req.prisma.session.findMany({
      where: {
        OR: [
          { isRecurring: false, startTime: { gte: startDate, lte: endDate }, ...programFilter },
          { isRecurring: true, startTime: { lte: endDate }, ...programFilter }
        ]
      },
      include: {
        sessionPrograms: {
          include: { program: { select: { name: true } } }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    // Expand recurring sessions
    let expandedSessions = [];
    for (const session of sessions) {
      if (session.isRecurring) {
        expandedSessions.push(...expandRecurringSession(session, startDate, endDate));
      } else {
        expandedSessions.push(session);
      }
    }
    expandedSessions.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    res.json({
      success: true,
      data: {
        sessions: expandedSessions.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          startTime: s.startTime,
          endTime: s.endTime,
          meetLink: s.meetLink,
          programName: s.sessionPrograms.find(sp => sp.program)?.program?.name || null
        })),
        total: expandedSessions.length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /learner/sessions/calendar
 * Get sessions for calendar view
 */
router.get('/sessions/calendar', async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const userId = req.user.id;

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

    const enrollments = await req.prisma.enrollment.findMany({
      where: { userId },
      select: { programId: true }
    });
    const programIds = enrollments.map(e => e.programId);

    const programFilter = {
      OR: [
        { sessionPrograms: { some: { programId: null } } },
        { sessionPrograms: { some: { programId: { in: programIds } } } }
      ]
    };

    const sessions = await req.prisma.session.findMany({
      where: {
        OR: [
          // Non-recurring sessions in date range
          { isRecurring: false, startTime: { gte: startDate, lte: endDate }, ...programFilter },
          // Recurring sessions that started before range end
          { isRecurring: true, startTime: { lte: endDate }, ...programFilter }
        ]
      },
      include: {
        sessionPrograms: {
          include: { program: { select: { name: true } } }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    // Expand recurring sessions into occurrences
    let expandedSessions = [];
    for (const session of sessions) {
      if (session.isRecurring) {
        expandedSessions.push(...expandRecurringSession(session, startDate, endDate));
      } else {
        expandedSessions.push(session);
      }
    }
    expandedSessions.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    res.json({
      success: true,
      data: {
        sessions: expandedSessions.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          startTime: s.startTime,
          endTime: s.endTime,
          meetLink: s.meetLink,
          programName: s.sessionPrograms.find(sp => sp.program)?.program?.name || null
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /learner/profile
 * Get learner profile with progress counts
 */
router.get('/profile', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cacheKey = `learner:profile:${userId}`;

    const data = await cacheGet(cacheKey, async () => {
      const user = await req.prisma.user.findUnique({
        where: { id: userId },
        include: {
          enrollments: {
            include: {
              program: { select: { id: true, name: true } }
            }
          }
        }
      });

      const enrolledProgramIds = user.enrollments.map(e => e.programId);
      const enrolledPrograms = user.enrollments.map(e => e.program.name);

      // Fetch all counts in parallel (2 queries instead of 2N)
      const [completedLessonsCount, totalLessonsCount, lessonsByProgram, completedByProgram] = await Promise.all([
        req.prisma.progress.count({
          where: { userId, status: 'COMPLETED' }
        }),
        req.prisma.lesson.count({
          where: { programId: { in: enrolledProgramIds } }
        }),
        req.prisma.lesson.groupBy({
          by: ['programId'],
          where: { programId: { in: enrolledProgramIds } },
          _count: true
        }),
        req.prisma.progress.groupBy({
          by: ['lesson'],
          where: { userId, status: 'COMPLETED', lesson: { programId: { in: enrolledProgramIds } } },
          _count: true
        }).catch(() => []) // fallback if groupBy on relation fails
      ]);

      // Derive completed programs using grouped counts
      let completedProgramsCount = 0;
      if (enrolledProgramIds.length > 0) {
        // Get completed count per program via a single query
        const completedPerProgram = await req.prisma.$queryRaw`
          SELECT l.program_id, COUNT(*)::int as completed
          FROM progress p
          JOIN lessons l ON l.id = p.lesson_id
          WHERE p.user_id = ${userId} AND p.status = 'COMPLETED'
          AND l.program_id = ANY(${enrolledProgramIds}::text[])
          GROUP BY l.program_id
        `;

        const lessonCountMap = new Map(lessonsByProgram.map(g => [g.programId, g._count]));
        const completedMap = new Map(completedPerProgram.map(r => [r.program_id, r.completed]));

        for (const programId of enrolledProgramIds) {
          const total = lessonCountMap.get(programId) || 0;
          const completed = completedMap.get(programId) || 0;
          if (total > 0 && completed >= total) {
            completedProgramsCount++;
          }
        }
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        registrationNumber: user.registrationNumber,
        createdAt: user.createdAt,
        enrolledPrograms,
        enrolledProgramsCount: enrolledPrograms.length,
        completedLessonsCount,
        totalLessonsCount,
        completedProgramsCount
      };
    }, 300); // 5 minutes

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Generate signed URL for Bunny.net video
 * Bunny Stream uses: token = SHA256(SECURITY_KEY + VIDEO_ID + EXPIRATION)
 *
 * Note: If token auth is not enabled in Bunny dashboard, set BUNNY_ENABLE_TOKEN_AUTH=false
 */
function generateSignedVideoUrl(embedUrl) {
  // Skip token signing if not enabled or no key
  if (!process.env.BUNNY_TOKEN_AUTH_KEY || process.env.BUNNY_ENABLE_TOKEN_AUTH === 'false') {
    return embedUrl;
  }

  try {
    // Extract the video ID from embed URL
    // Format: https://iframe.mediadelivery.net/embed/LIBRARY_ID/VIDEO_ID
    const url = new URL(embedUrl);
    const pathParts = url.pathname.split('/');
    const videoId = pathParts[pathParts.length - 1];

    if (!videoId) {
      return embedUrl;
    }

    const expiresAt = Math.floor(Date.now() / 1000) + 4 * 60 * 60; // 4 hours

    // Bunny Stream token format: SHA256(SECURITY_KEY + VIDEO_ID + EXPIRATION)
    const hashableBase = process.env.BUNNY_TOKEN_AUTH_KEY + videoId + expiresAt;
    const token = crypto
      .createHash('sha256')
      .update(hashableBase)
      .digest('hex');

    return `${embedUrl}?token=${token}&expires=${expiresAt}`;
  } catch (e) {
    console.error('Error generating signed video URL:', e);
    return embedUrl;
  }
}

module.exports = router;
