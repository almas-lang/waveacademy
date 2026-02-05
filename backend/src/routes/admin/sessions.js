// Admin Session Routes
const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../../middleware/auth');

router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /admin/sessions
 * List all sessions
 */
router.get('/', async (req, res, next) => {
  try {
    const { from, to, programId } = req.query;

    const where = {};

    if (from || to) {
      where.startTime = {};
      if (from) where.startTime.gte = new Date(from);
      if (to) where.startTime.lte = new Date(to);
    }

    if (programId) {
      where.sessionPrograms = {
        some: { programId }
      };
    }

    const sessions = await req.prisma.session.findMany({
      where,
      include: {
        sessionPrograms: {
          include: {
            program: { select: { name: true } }
          }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    const formattedSessions = sessions.map(session => ({
      id: session.id,
      name: session.name,
      description: session.description,
      startTime: session.startTime,
      endTime: session.endTime,
      meetLink: session.meetLink,
      isRecurring: session.isRecurring,
      recurrenceRule: session.recurrenceRule,
      programs: session.sessionPrograms.length === 0 
        ? ['All Programs']
        : session.sessionPrograms.map(sp => sp.program?.name || 'All Programs')
    }));

    res.json({
      success: true,
      data: { sessions: formattedSessions }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /admin/sessions
 * Create new session
 */
router.post('/', async (req, res, next) => {
  try {
    const { 
      name, 
      description, 
      startTime, 
      endTime, 
      meetLink, 
      isRecurring = false, 
      recurrenceRule,
      programIds = [] // Empty array = all programs
    } = req.body;

    if (!name || !startTime) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Name and start time required' }
      });
    }

    const session = await req.prisma.session.create({
      data: {
        name,
        description,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        meetLink,
        isRecurring,
        recurrenceRule,
        sessionPrograms: {
          create: programIds.length > 0
            ? programIds.map(programId => ({ programId }))
            : [{ programId: null }] // null = all programs
        }
      },
      include: {
        sessionPrograms: {
          include: { program: { select: { id: true, name: true } } }
        }
      }
    });

    // Send notifications to enrolled learners (async, don't block response)
    const prisma = req.prisma;
    (async () => {
      try {
        let enrolledUsers;

        if (programIds.length === 0) {
          // Session for all programs - notify all enrolled learners
          enrolledUsers = await prisma.enrollment.findMany({
            where: { status: 'ACTIVE' },
            select: { userId: true, programId: true },
            distinct: ['userId']
          });
        } else {
          // Session for specific programs - notify learners enrolled in those programs
          enrolledUsers = await prisma.enrollment.findMany({
            where: {
              programId: { in: programIds },
              status: 'ACTIVE'
            },
            select: { userId: true, programId: true },
            distinct: ['userId']
          });
        }

        // Format session time for notification message
        const sessionDate = new Date(startTime);
        const dateStr = sessionDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric'
        });
        const timeStr = sessionDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit'
        });

        // Create notifications
        if (enrolledUsers.length > 0) {
          await prisma.notification.createMany({
            data: enrolledUsers.map(enrollment => ({
              userId: enrollment.userId,
              type: 'NEW_SESSION',
              title: 'New Live Session Scheduled',
              message: `${name} - ${dateStr} at ${timeStr}`,
              data: {
                sessionId: session.id,
                programId: enrollment.programId,
                startTime: session.startTime,
                meetLink: meetLink
              }
            }))
          });
        }
      } catch (err) {
        console.error('Failed to send session notifications:', err);
      }
    })();

    res.status(201).json({
      success: true,
      data: { session }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /admin/sessions/:id
 * Get session details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const session = await req.prisma.session.findUnique({
      where: { id },
      include: {
        sessionPrograms: {
          include: { program: { select: { id: true, name: true } } }
        }
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Session not found' }
      });
    }

    res.json({
      success: true,
      data: { session }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /admin/sessions/:id
 * Update session
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      startTime,
      endTime,
      meetLink,
      isRecurring,
      recurrenceRule,
      programIds
    } = req.body;

    // Get current session to compare changes
    const oldSession = await req.prisma.session.findUnique({
      where: { id },
      include: {
        sessionPrograms: { select: { programId: true } }
      }
    });

    // Update session
    const session = await req.prisma.session.update({
      where: { id },
      data: {
        name,
        description,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        meetLink,
        isRecurring,
        recurrenceRule
      }
    });

    // Update program associations if provided
    if (programIds !== undefined) {
      // Delete existing associations
      await req.prisma.sessionProgram.deleteMany({
        where: { sessionId: id }
      });

      // Create new associations
      await req.prisma.sessionProgram.createMany({
        data: programIds.length > 0
          ? programIds.map(programId => ({ sessionId: id, programId }))
          : [{ sessionId: id, programId: null }]
      });
    }

    // Send notifications about session update (async, don't block response)
    const prisma = req.prisma;
    const finalProgramIds = programIds !== undefined ? programIds : oldSession.sessionPrograms.map(sp => sp.programId).filter(Boolean);

    (async () => {
      try {
        let enrolledUsers;

        if (finalProgramIds.length === 0) {
          // Session for all programs
          enrolledUsers = await prisma.enrollment.findMany({
            where: { status: 'ACTIVE' },
            select: { userId: true, programId: true },
            distinct: ['userId']
          });
        } else {
          // Session for specific programs
          enrolledUsers = await prisma.enrollment.findMany({
            where: {
              programId: { in: finalProgramIds },
              status: 'ACTIVE'
            },
            select: { userId: true, programId: true },
            distinct: ['userId']
          });
        }

        // Format session time for notification message
        const sessionDate = new Date(startTime || session.startTime);
        const dateStr = sessionDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric'
        });
        const timeStr = sessionDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit'
        });

        // Create notifications
        if (enrolledUsers.length > 0) {
          await prisma.notification.createMany({
            data: enrolledUsers.map(enrollment => ({
              userId: enrollment.userId,
              type: 'NEW_SESSION',
              title: 'Session Updated',
              message: `${name || session.name} - ${dateStr} at ${timeStr}`,
              data: {
                sessionId: session.id,
                programId: enrollment.programId,
                startTime: session.startTime,
                meetLink: meetLink || session.meetLink,
                isUpdate: true
              }
            }))
          });
        }
      } catch (err) {
        console.error('Failed to send session update notifications:', err);
      }
    })();

    res.json({
      success: true,
      data: { session }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /admin/sessions/:id
 * Delete session
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get session details before deleting for notification
    const session = await req.prisma.session.findUnique({
      where: { id },
      include: {
        sessionPrograms: { select: { programId: true } }
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Session not found' }
      });
    }

    // Delete the session
    await req.prisma.session.delete({
      where: { id }
    });

    // Send cancellation notifications (async, don't block response)
    const prisma = req.prisma;
    const programIds = session.sessionPrograms.map(sp => sp.programId).filter(Boolean);

    (async () => {
      try {
        let enrolledUsers;

        if (programIds.length === 0) {
          // Session was for all programs
          enrolledUsers = await prisma.enrollment.findMany({
            where: { status: 'ACTIVE' },
            select: { userId: true, programId: true },
            distinct: ['userId']
          });
        } else {
          // Session was for specific programs
          enrolledUsers = await prisma.enrollment.findMany({
            where: {
              programId: { in: programIds },
              status: 'ACTIVE'
            },
            select: { userId: true, programId: true },
            distinct: ['userId']
          });
        }

        // Format session time for notification message
        const sessionDate = new Date(session.startTime);
        const dateStr = sessionDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric'
        });
        const timeStr = sessionDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit'
        });

        // Create cancellation notifications
        if (enrolledUsers.length > 0) {
          await prisma.notification.createMany({
            data: enrolledUsers.map(enrollment => ({
              userId: enrollment.userId,
              type: 'NEW_SESSION',
              title: 'Session Cancelled',
              message: `${session.name} scheduled for ${dateStr} at ${timeStr} has been cancelled`,
              data: {
                programId: enrollment.programId,
                isCancellation: true
              }
            }))
          });
        }
      } catch (err) {
        console.error('Failed to send session cancellation notifications:', err);
      }
    })();

    res.json({
      success: true,
      message: 'Session deleted'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /admin/sessions/today
 * Get today's sessions for dashboard
 */
router.get('/dashboard/today', async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sessions = await req.prisma.session.findMany({
      where: {
        startTime: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        sessionPrograms: {
          include: { program: { select: { name: true } } }
        }
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

module.exports = router;
