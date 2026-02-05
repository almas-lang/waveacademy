// Learner Routes
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { authenticate, requireLearner } = require('../middleware/auth');

router.use(authenticate);
router.use(requireLearner);

/**
 * GET /learner/home
 * Learner home page data
 */
router.get('/home', async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get enrollments with progress
    const enrollments = await req.prisma.enrollment.findMany({
      where: { userId },
      include: {
        program: {
          include: {
            _count: { select: { lessons: true } }
          }
        }
      }
    });

    // Get progress for all lessons
    const progress = await req.prisma.progress.findMany({
      where: { userId },
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

    // Calculate program progress
    const enrolledPrograms = enrollments.map(enrollment => {
      const programProgress = progress.filter(
        p => p.lesson.programId === enrollment.programId
      );
      const completedCount = programProgress.filter(p => p.status === 'COMPLETED').length;
      const totalLessons = enrollment.program._count.lessons;

      return {
        id: enrollment.program.id,
        name: enrollment.program.name,
        description: enrollment.program.description,
        thumbnailUrl: enrollment.program.thumbnailUrl,
        completedLessons: completedCount,
        totalLessons,
        progressPercentage: totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0,
        lastAccessedAt: programProgress[0]?.lastAccessedAt || enrollment.enrolledAt
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
          { sessionPrograms: { some: { programId: null } } }, // All programs
          { sessionPrograms: { some: { programId: { in: programIds } } } }
        ]
      },
      take: 5,
      orderBy: { startTime: 'asc' }
    });

    res.json({
      success: true,
      data: {
        user: { name: req.user.name },
        enrolledPrograms,
        continueLearning,
        upcomingSessions: upcomingSessions.map(s => ({
          id: s.id,
          name: s.name,
          startTime: s.startTime,
          meetLink: s.meetLink
        }))
      }
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
          where: { topicId: null },
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    if (!program) {
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
      progress: progressMap.get(lesson.id) || { status: 'NOT_STARTED', watchPositionSeconds: 0 }
    });

    const content = [];

    for (const topic of program.topics) {
      const topicItem = {
        id: topic.id,
        type: 'topic',
        name: topic.name,
        children: []
      };

      for (const subtopic of topic.subtopics) {
        topicItem.children.push({
          id: subtopic.id,
          type: 'subtopic',
          name: subtopic.name,
          children: subtopic.lessons.map(buildLessonWithProgress)
        });
      }

      for (const lesson of topic.lessons) {
        topicItem.children.push(buildLessonWithProgress(lesson));
      }

      content.push(topicItem);
    }

    for (const lesson of program.lessons) {
      content.push(buildLessonWithProgress(lesson));
    }

    // Calculate overall progress
    const allLessons = await req.prisma.lesson.count({ where: { programId: id } });
    const completedLessons = progressRecords.filter(p => p.status === 'COMPLETED').length;

    res.json({
      success: true,
      data: {
        program: {
          id: program.id,
          name: program.name,
          description: program.description
        },
        content,
        overallProgress: {
          completed: completedLessons,
          total: allLessons,
          percentage: allLessons > 0 ? Math.round((completedLessons / allLessons) * 100) : 0
        }
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
        program: true,
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

    // Generate signed video URL if video
    let contentUrl = lesson.contentUrl;
    if (lesson.type === 'VIDEO' && contentUrl) {
      contentUrl = generateSignedVideoUrl(contentUrl);
    }

    // Get navigation (prev/next lessons)
    const programLessons = await req.prisma.lesson.findMany({
      where: { programId: lesson.programId },
      orderBy: [{ topicId: 'asc' }, { subtopicId: 'asc' }, { orderIndex: 'asc' }],
      select: { id: true, title: true }
    });

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
          nextLesson: nextLesson ? { id: nextLesson.id, title: nextLesson.title } : null
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
 * Get upcoming sessions
 */
router.get('/sessions', async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get enrolled program IDs
    const enrollments = await req.prisma.enrollment.findMany({
      where: { userId },
      select: { programId: true }
    });
    const programIds = enrollments.map(e => e.programId);

    const sessions = await req.prisma.session.findMany({
      where: {
        startTime: { gte: new Date() },
        OR: [
          { sessionPrograms: { some: { programId: null } } },
          { sessionPrograms: { some: { programId: { in: programIds } } } }
        ]
      },
      orderBy: { startTime: 'asc' },
      take: 20
    });

    res.json({
      success: true,
      data: {
        sessions: sessions.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          startTime: s.startTime,
          endTime: s.endTime,
          meetLink: s.meetLink
        }))
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

    const sessions = await req.prisma.session.findMany({
      where: {
        startTime: { gte: startDate, lte: endDate },
        OR: [
          { sessionPrograms: { some: { programId: null } } },
          { sessionPrograms: { some: { programId: { in: programIds } } } }
        ]
      },
      orderBy: { startTime: 'asc' }
    });

    res.json({
      success: true,
      data: { sessions }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /learner/profile
 * Get learner profile
 */
router.get('/profile', async (req, res, next) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        enrollments: {
          include: {
            program: { select: { name: true } }
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          mobile: user.mobile,
          registrationNumber: user.registrationNumber,
          createdAt: user.createdAt
        },
        enrolledPrograms: user.enrollments.map(e => e.program.name)
      }
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
