// Admin Learner Routes
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { authenticate, requireAdmin } = require('../../middleware/auth');
const { sendPasswordSetupEmail, sendPasswordResetEmail } = require('../../utils/email');

router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /admin/learners
 * List all learners with filters
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, programId, search, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      role: 'LEARNER'
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (programId) {
      where.enrollments = {
        some: { programId }
      };
    }

    const [learners, total] = await Promise.all([
      req.prisma.user.findMany({
        where,
        include: {
          enrollments: {
            include: {
              program: { select: { name: true } }
            }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      req.prisma.user.count({ where })
    ]);

    const formattedLearners = learners.map(learner => ({
      id: learner.id,
      name: learner.name,
      email: learner.email,
      mobile: learner.mobile,
      status: learner.status,
      registrationNumber: learner.registrationNumber,
      enrolledPrograms: learner.enrollments.map(e => e.program.name),
      createdAt: learner.createdAt
    }));

    res.json({
      success: true,
      data: {
        learners: formattedLearners,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /admin/learners
 * Add new learner
 */
router.post('/', async (req, res, next) => {
  try {
    const { email, name, mobile, registrationNumber, programIds = [] } = req.body;

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email and name required' }
      });
    }

    // Check if email exists
    const existing = await req.prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'EMAIL_EXISTS', message: 'Email already registered' }
      });
    }

    // Generate setup token
    const setupToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create learner
    const learner = await req.prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        mobile,
        registrationNumber,
        role: 'LEARNER',
        status: 'PENDING_SETUP',
        passwordResetToken: setupToken,
        passwordResetExpires: tokenExpires,
        enrollments: {
          create: programIds.map(programId => ({ programId }))
        }
      },
      include: {
        enrollments: {
          include: { program: { select: { name: true } } }
        }
      }
    });

    // Send setup email
    try {
      await sendPasswordSetupEmail(learner.email, learner.name, setupToken);
    } catch (emailError) {
      console.error('Failed to send setup email:', emailError);
    }

    const setupLink = `${process.env.FRONTEND_URL}/auth/setup-password?token=${setupToken}`;

    res.status(201).json({
      success: true,
      data: {
        learner: {
          id: learner.id,
          email: learner.email,
          name: learner.name,
          status: learner.status,
          enrolledPrograms: learner.enrollments.map(e => e.program.name)
        },
        setupLink
      },
      message: 'Learner added. Setup email sent.'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /admin/learners/:id
 * Get learner details with progress
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const learner = await req.prisma.user.findUnique({
      where: { id },
      include: {
        enrollments: {
          include: {
            program: {
              include: {
                _count: { select: { lessons: true } }
              }
            }
          }
        }
      }
    });

    if (!learner || learner.role !== 'LEARNER') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Learner not found' }
      });
    }

    // Get completed counts per program and recent progress in parallel
    const enrolledProgramIds = learner.enrollments.map(e => e.programId);
    const [completedByProgram, recentProgress] = await Promise.all([
      req.prisma.progress.groupBy({
        by: ['lessonId'],
        where: {
          userId: id,
          status: 'COMPLETED',
          lesson: { programId: { in: enrolledProgramIds } }
        }
      }).then(async (results) => {
        // Get programId for each completed lesson
        if (results.length === 0) return new Map();
        const lessons = await req.prisma.lesson.findMany({
          where: { id: { in: results.map(r => r.lessonId) } },
          select: { id: true, programId: true }
        });
        const counts = new Map();
        for (const lesson of lessons) {
          counts.set(lesson.programId, (counts.get(lesson.programId) || 0) + 1);
        }
        return counts;
      }),
      req.prisma.progress.findMany({
        where: { userId: id },
        include: {
          lesson: { select: { title: true, type: true, programId: true } }
        },
        orderBy: { lastAccessedAt: 'desc' },
        take: 10
      })
    ]);

    // Calculate progress per program
    const programProgress = learner.enrollments.map(enrollment => {
      const completedCount = completedByProgram.get(enrollment.programId) || 0;
      const totalLessons = enrollment.program._count.lessons;

      return {
        programId: enrollment.programId,
        programName: enrollment.program.name,
        completedLessons: completedCount,
        totalLessons,
        percentage: totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0
      };
    });

    res.json({
      success: true,
      data: {
        learner: {
          id: learner.id,
          email: learner.email,
          name: learner.name,
          mobile: learner.mobile,
          registrationNumber: learner.registrationNumber,
          status: learner.status,
          createdAt: learner.createdAt
        },
        programProgress,
        recentProgress: recentProgress.map(p => ({
          lessonId: p.lessonId,
          lessonTitle: p.lesson.title,
          status: p.status,
          lastAccessed: p.lastAccessedAt
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /admin/learners/:id
 * Update learner
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, mobile, registrationNumber } = req.body;

    const learner = await req.prisma.user.update({
      where: { id },
      data: { name, mobile, registrationNumber }
    });

    res.json({
      success: true,
      data: { learner }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /admin/learners/:id/status
 * Change learner status
 */
router.put('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid status' }
      });
    }

    const learner = await req.prisma.user.update({
      where: { id },
      data: { status }
    });

    res.json({
      success: true,
      data: { learner },
      message: `Learner ${status.toLowerCase()}`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /admin/learners/:id/reset-password
 * Trigger password reset for learner
 */
router.post('/:id/reset-password', async (req, res, next) => {
  try {
    const { id } = req.params;

    const learner = await req.prisma.user.findUnique({
      where: { id }
    });

    if (!learner) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Learner not found' }
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await req.prisma.user.update({
      where: { id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: tokenExpires
      }
    });

    // Send reset email
    await sendPasswordResetEmail(learner.email, learner.name, resetToken);

    res.json({
      success: true,
      message: 'Password reset email sent to learner'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /admin/learners/:id/enroll
 * Add learner to program
 */
router.post('/:id/enroll', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { programId } = req.body;

    await req.prisma.enrollment.create({
      data: { userId: id, programId }
    });

    res.json({
      success: true,
      message: 'Learner enrolled in program'
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: { code: 'ALREADY_ENROLLED', message: 'Learner already enrolled' }
      });
    }
    next(error);
  }
});

/**
 * POST /admin/learners/:id/unenroll
 * Remove learner from program
 */
router.post('/:id/unenroll', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { programId } = req.body;

    // Delete the enrollment
    await req.prisma.enrollment.delete({
      where: {
        userId_programId: {
          userId: id,
          programId: programId
        }
      }
    });

    // Also delete any progress for lessons in this program
    await req.prisma.progress.deleteMany({
      where: {
        userId: id,
        lesson: {
          programId: programId
        }
      }
    });

    res.json({
      success: true,
      message: 'Learner removed from program'
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Enrollment not found' }
      });
    }
    next(error);
  }
});

/**
 * GET /admin/learners/:id/sessions
 * Get active sessions for a learner
 */
router.get('/:id/sessions', async (req, res, next) => {
  try {
    const { id } = req.params;

    const sessions = await req.prisma.userSession.findMany({
      where: {
        userId: id,
        expiresAt: { gt: new Date() }
      },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        createdAt: true,
        lastActive: true
      },
      orderBy: { lastActive: 'desc' }
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
 * POST /admin/learners/:id/logout-all
 * Force logout learner from all devices
 */
router.post('/:id/logout-all', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await req.prisma.userSession.deleteMany({
      where: { userId: id }
    });

    res.json({
      success: true,
      data: { sessionsRemoved: result.count },
      message: `Logged out from ${result.count} device(s)`
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
