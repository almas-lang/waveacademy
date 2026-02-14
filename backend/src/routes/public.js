// Public Routes (no auth required)
const express = require('express');
const router = express.Router();

/**
 * GET /public/programs/:slug
 * Get program details by slug for registration page
 */
router.get('/programs/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;

    const program = await req.prisma.program.findUnique({
      where: { slug },
      include: {
        topics: {
          include: {
            subtopics: {
              include: {
                lessons: {
                  orderBy: { orderIndex: 'asc' },
                  select: {
                    id: true,
                    title: true,
                    type: true,
                    durationSeconds: true,
                    isFree: true,
                    orderIndex: true
                  }
                }
              },
              orderBy: { orderIndex: 'asc' }
            },
            lessons: {
              where: { subtopicId: null },
              orderBy: { orderIndex: 'asc' },
              select: {
                id: true,
                title: true,
                type: true,
                durationSeconds: true,
                isFree: true,
                orderIndex: true
              }
            }
          },
          orderBy: { orderIndex: 'asc' }
        },
        lessons: {
          where: { topicId: null, subtopicId: null },
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            title: true,
            type: true,
            durationSeconds: true,
            isFree: true,
            orderIndex: true
          }
        },
        _count: { select: { lessons: true } }
      }
    });

    if (!program || !program.isPublished) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Program not found' }
      });
    }

    // Build content tree (no contentUrl/contentText — titles only)
    const content = [];

    for (const topic of program.topics) {
      const topicItem = {
        id: topic.id,
        type: 'topic',
        name: topic.name,
        orderIndex: topic.orderIndex,
        children: []
      };

      for (const subtopic of topic.subtopics) {
        topicItem.children.push({
          id: subtopic.id,
          type: 'subtopic',
          name: subtopic.name,
          orderIndex: subtopic.orderIndex,
          children: subtopic.lessons.map(l => ({
            id: l.id,
            type: 'lesson',
            title: l.title,
            lessonType: l.type,
            durationSeconds: l.durationSeconds,
            isFree: l.isFree,
            orderIndex: l.orderIndex
          }))
        });
      }

      for (const lesson of topic.lessons) {
        topicItem.children.push({
          id: lesson.id,
          type: 'lesson',
          title: lesson.title,
          lessonType: lesson.type,
          durationSeconds: lesson.durationSeconds,
          isFree: lesson.isFree,
          orderIndex: lesson.orderIndex
        });
      }

      content.push(topicItem);
    }

    for (const lesson of program.lessons) {
      content.push({
        id: lesson.id,
        type: 'lesson',
        title: lesson.title,
        lessonType: lesson.type,
        durationSeconds: lesson.durationSeconds,
        isFree: lesson.isFree,
        orderIndex: lesson.orderIndex
      });
    }

    // Count free lessons
    let freeLessonCount = 0;
    const countFree = (items) => {
      for (const item of items) {
        if (item.type === 'lesson' && item.isFree) freeLessonCount++;
        if (item.children) countFree(item.children);
      }
    };
    countFree(content);

    res.json({
      success: true,
      data: {
        program: {
          id: program.id,
          name: program.name,
          description: program.description,
          thumbnailUrl: program.thumbnailUrl,
          price: program.price,
          currency: program.currency,
          totalLessons: program._count.lessons,
          freeLessons: freeLessonCount
        },
        content
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
