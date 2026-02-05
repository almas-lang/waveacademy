// Admin Program Routes
const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../../middleware/auth');

// Apply auth to all routes
router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /admin/programs
 * List all programs with stats (with optional pagination)
 */
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, all } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // If 'all' is true, return all programs without pagination (for dropdowns)
    const paginationOptions = all === 'true' ? {} : {
      skip,
      take: parseInt(limit)
    };

    const [programs, total] = await Promise.all([
      req.prisma.program.findMany({
        include: {
          _count: {
            select: {
              enrollments: true,
              lessons: true
            }
          },
          lessons: {
            select: { durationSeconds: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        ...paginationOptions
      }),
      req.prisma.program.count()
    ]);

    const programsWithStats = programs.map(program => {
      const totalDuration = program.lessons.reduce((sum, l) => sum + (l.durationSeconds || 0), 0);
      return {
        id: program.id,
        name: program.name,
        description: program.description,
        thumbnailUrl: program.thumbnailUrl,
        isPublished: program.isPublished,
        learnerCount: program._count.enrollments,
        lessonCount: program._count.lessons,
        totalDurationHours: Math.round(totalDuration / 3600 * 10) / 10,
        createdAt: program.createdAt
      };
    });

    res.json({
      success: true,
      data: {
        programs: programsWithStats,
        pagination: all === 'true' ? null : {
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
 * POST /admin/programs
 * Create new program
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, description, thumbnailUrl } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Program name required' }
      });
    }

    const program = await req.prisma.program.create({
      data: {
        name,
        description,
        thumbnailUrl
      }
    });

    res.status(201).json({
      success: true,
      data: { program }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /admin/programs/:id
 * Get program with full content tree
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const program = await req.prisma.program.findUnique({
      where: { id },
      include: {
        topics: {
          include: {
            subtopics: {
              include: {
                lessons: {
                  include: { attachments: true },
                  orderBy: { orderIndex: 'asc' }
                }
              },
              orderBy: { orderIndex: 'asc' }
            },
            lessons: {
              where: { subtopicId: null },
              include: { attachments: true },
              orderBy: { orderIndex: 'asc' }
            }
          },
          orderBy: { orderIndex: 'asc' }
        },
        lessons: {
          where: { topicId: null, subtopicId: null },
          include: { attachments: true },
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

    // Build content tree
    const content = [];

    // Add topics with their subtopics and lessons
    for (const topic of program.topics) {
      const topicItem = {
        id: topic.id,
        type: 'topic',
        name: topic.name,
        orderIndex: topic.orderIndex,
        children: []
      };

      // Add subtopics
      for (const subtopic of topic.subtopics) {
        const subtopicItem = {
          id: subtopic.id,
          type: 'subtopic',
          name: subtopic.name,
          orderIndex: subtopic.orderIndex,
          children: subtopic.lessons.map(lesson => ({
            id: lesson.id,
            type: 'lesson',
            title: lesson.title,
            lessonType: lesson.type,
            contentUrl: lesson.contentUrl,
            contentText: lesson.contentText,
            instructorNotes: lesson.instructorNotes,
            thumbnailUrl: lesson.thumbnailUrl,
            durationSeconds: lesson.durationSeconds,
            orderIndex: lesson.orderIndex,
            attachments: lesson.attachments
          }))
        };
        topicItem.children.push(subtopicItem);
      }

      // Add lessons directly under topic
      for (const lesson of topic.lessons) {
        topicItem.children.push({
          id: lesson.id,
          type: 'lesson',
          title: lesson.title,
          lessonType: lesson.type,
          contentUrl: lesson.contentUrl,
          contentText: lesson.contentText,
          instructorNotes: lesson.instructorNotes,
          thumbnailUrl: lesson.thumbnailUrl,
          durationSeconds: lesson.durationSeconds,
          orderIndex: lesson.orderIndex,
          attachments: lesson.attachments
        });
      }

      content.push(topicItem);
    }

    // Add standalone lessons
    for (const lesson of program.lessons) {
      content.push({
        id: lesson.id,
        type: 'lesson',
        title: lesson.title,
        lessonType: lesson.type,
        contentUrl: lesson.contentUrl,
        contentText: lesson.contentText,
        instructorNotes: lesson.instructorNotes,
        thumbnailUrl: lesson.thumbnailUrl,
        durationSeconds: lesson.durationSeconds,
        orderIndex: lesson.orderIndex,
        attachments: lesson.attachments
      });
    }

    res.json({
      success: true,
      data: {
        program: {
          id: program.id,
          name: program.name,
          description: program.description,
          thumbnailUrl: program.thumbnailUrl,
          isPublished: program.isPublished
        },
        content
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /admin/programs/:id
 * Update program
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, thumbnailUrl } = req.body;

    const program = await req.prisma.program.update({
      where: { id },
      data: {
        name,
        description,
        thumbnailUrl
      }
    });

    res.json({
      success: true,
      data: { program }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /admin/programs/:id/publish
 * Toggle publish status
 */
router.post('/:id/publish', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isPublished } = req.body;

    const program = await req.prisma.program.update({
      where: { id },
      data: { isPublished }
    });

    res.json({
      success: true,
      data: { program },
      message: isPublished ? 'Program published' : 'Program unpublished'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /admin/programs/:id
 * Delete program and all content
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    await req.prisma.program.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Program and all content deleted'
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// TOPIC ROUTES
// ==========================================

/**
 * POST /admin/programs/topics
 * Create topic
 */
router.post('/topics', async (req, res, next) => {
  try {
    const { programId, name, orderIndex = 0 } = req.body;

    const topic = await req.prisma.topic.create({
      data: { programId, name, orderIndex }
    });

    res.status(201).json({
      success: true,
      data: { topic }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /admin/programs/topics/:id
 */
router.put('/topics/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, orderIndex } = req.body;

    const topic = await req.prisma.topic.update({
      where: { id },
      data: { name, orderIndex }
    });

    res.json({ success: true, data: { topic } });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /admin/programs/topics/:id
 */
router.delete('/topics/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await req.prisma.topic.delete({ where: { id } });
    res.json({ success: true, message: 'Topic deleted' });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// SUBTOPIC ROUTES
// ==========================================

router.post('/subtopics', async (req, res, next) => {
  try {
    const { topicId, name, orderIndex = 0 } = req.body;
    const subtopic = await req.prisma.subtopic.create({
      data: { topicId, name, orderIndex }
    });
    res.status(201).json({ success: true, data: { subtopic } });
  } catch (error) {
    next(error);
  }
});

router.put('/subtopics/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, orderIndex } = req.body;
    const subtopic = await req.prisma.subtopic.update({
      where: { id },
      data: { name, orderIndex }
    });
    res.json({ success: true, data: { subtopic } });
  } catch (error) {
    next(error);
  }
});

router.delete('/subtopics/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await req.prisma.subtopic.delete({ where: { id } });
    res.json({ success: true, message: 'Subtopic deleted' });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// LESSON ROUTES
// ==========================================

router.post('/lessons', async (req, res, next) => {
  try {
    const { programId, topicId, subtopicId, title, type, contentUrl, contentText, durationSeconds, orderIndex = 0, instructorNotes, thumbnailUrl } = req.body;

    const lesson = await req.prisma.lesson.create({
      data: {
        programId,
        topicId,
        subtopicId,
        title,
        type,
        contentUrl,
        contentText,
        durationSeconds,
        orderIndex,
        instructorNotes,
        thumbnailUrl
      }
    });

    // Send notifications to enrolled learners (async, don't wait)
    (async () => {
      try {
        // Get program name for notification message
        const program = await req.prisma.program.findUnique({
          where: { id: programId },
          select: { name: true }
        });

        // Get all enrolled users in this program
        const enrollments = await req.prisma.enrollment.findMany({
          where: { programId },
          select: { userId: true }
        });

        if (enrollments.length > 0 && program) {
          const userIds = enrollments.map(e => e.userId);
          await req.prisma.notification.createMany({
            data: userIds.map(userId => ({
              userId,
              type: 'NEW_LESSON',
              title: 'New Lesson Available',
              message: `A new lesson "${title}" has been added to ${program.name}`,
              data: { programId, lessonId: lesson.id, lessonTitle: title }
            }))
          });
          console.log(`Sent notifications to ${userIds.length} learners for new lesson "${title}"`);
        }
      } catch (notifError) {
        console.error('Failed to send lesson notifications:', notifError);
      }
    })();

    res.status(201).json({ success: true, data: { lesson } });
  } catch (error) {
    next(error);
  }
});

router.put('/lessons/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, type, contentUrl, contentText, durationSeconds, orderIndex, instructorNotes, thumbnailUrl } = req.body;

    const lesson = await req.prisma.lesson.update({
      where: { id },
      data: { title, type, contentUrl, contentText, durationSeconds, orderIndex, instructorNotes, thumbnailUrl }
    });

    res.json({ success: true, data: { lesson } });
  } catch (error) {
    next(error);
  }
});

router.delete('/lessons/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await req.prisma.lesson.delete({ where: { id } });
    res.json({ success: true, message: 'Lesson deleted' });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// REORDER CONTENT
// ==========================================

/**
 * PUT /admin/programs/:id/reorder
 * Reorder content items within a program
 */
router.put('/:id/reorder', async (req, res, next) => {
  try {
    const { id: programId } = req.params;
    const { items } = req.body;

    // Verify program exists
    const program = await req.prisma.program.findUnique({ where: { id: programId } });
    if (!program) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Program not found' }
      });
    }

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Items array required' }
      });
    }

    console.log('Reorder request:', { programId, items });

    // Process each item update
    for (const item of items) {
      const { id, type, orderIndex, parentId, parentType } = item;

      console.log('Processing item:', { id, type, orderIndex, parentId, parentType });

      if (type === 'topic') {
        await req.prisma.topic.update({
          where: { id },
          data: { orderIndex }
        });
      } else if (type === 'subtopic') {
        // Subtopics must have a parent topic
        if (!parentId) {
          console.warn('Subtopic without parent topic, skipping parent update');
          await req.prisma.subtopic.update({
            where: { id },
            data: { orderIndex }
          });
        } else {
          await req.prisma.subtopic.update({
            where: { id },
            data: {
              orderIndex,
              topicId: parentId // Update parent if moved to different topic
            }
          });
        }
      } else if (type === 'lesson') {
        const updateData = { orderIndex };

        // Handle lesson parent changes
        if (parentType === 'program' || !parentId) {
          updateData.topicId = null;
          updateData.subtopicId = null;
        } else if (parentType === 'topic') {
          updateData.topicId = parentId;
          updateData.subtopicId = null;
        } else if (parentType === 'subtopic') {
          updateData.subtopicId = parentId;
          // Get the topic from subtopic
          const subtopic = await req.prisma.subtopic.findUnique({
            where: { id: parentId },
            select: { topicId: true }
          });
          updateData.topicId = subtopic?.topicId || null;
        }

        await req.prisma.lesson.update({
          where: { id },
          data: updateData
        });
      }
    }

    res.json({
      success: true,
      message: 'Content reordered successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /admin/programs/:id/learners
 * Get learners enrolled in a program
 */
router.get('/:id/learners', async (req, res, next) => {
  try {
    const { id } = req.params;

    const enrollments = await req.prisma.enrollment.findMany({
      where: { programId: id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            status: true
          }
        }
      }
    });

    const learners = enrollments.map(e => e.user);

    res.json({
      success: true,
      data: { learners }
    });
  } catch (error) {
    next(error);
  }
});

// Lesson attachments
router.post('/lessons/:id/attachments', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, fileUrl, fileType } = req.body;

    const attachment = await req.prisma.lessonAttachment.create({
      data: { lessonId: id, name, fileUrl, fileType }
    });

    res.status(201).json({ success: true, data: { attachment } });
  } catch (error) {
    next(error);
  }
});

router.delete('/attachments/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await req.prisma.lessonAttachment.delete({ where: { id } });
    res.json({ success: true, message: 'Attachment deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
