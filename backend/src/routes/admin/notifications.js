const express = require('express');
const router = express.Router();

// GET /admin/notifications - Get all notifications (admin view)
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total] = await Promise.all([
      req.prisma.notification.findMany({
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      }),
      req.prisma.notification.count()
    ]);

    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /admin/notifications/send - Send notification to users
router.post('/send', async (req, res, next) => {
  try {
    const { userIds, type, title, message, data } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds array is required' });
    }

    if (!type || !title || !message) {
      return res.status(400).json({ error: 'type, title, and message are required' });
    }

    const notifications = await req.prisma.notification.createMany({
      data: userIds.map(userId => ({
        userId,
        type,
        title,
        message,
        data: data || null
      }))
    });

    res.json({
      success: true,
      message: `Sent ${notifications.count} notifications`,
      count: notifications.count
    });
  } catch (error) {
    next(error);
  }
});

// POST /admin/notifications/send-to-program - Send notification to all enrolled learners in a program
router.post('/send-to-program', async (req, res, next) => {
  try {
    const { programId, type, title, message, data } = req.body;

    if (!programId || !type || !title || !message) {
      return res.status(400).json({ error: 'programId, type, title, and message are required' });
    }

    // Get all enrolled users in this program
    const enrollments = await req.prisma.enrollment.findMany({
      where: { programId },
      select: { userId: true }
    });

    if (enrollments.length === 0) {
      return res.json({
        success: true,
        message: 'No enrolled learners to notify',
        count: 0
      });
    }

    const userIds = enrollments.map(e => e.userId);

    const notifications = await req.prisma.notification.createMany({
      data: userIds.map(userId => ({
        userId,
        type,
        title,
        message,
        data: data || null
      }))
    });

    res.json({
      success: true,
      message: `Sent ${notifications.count} notifications`,
      count: notifications.count
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /admin/notifications/:id - Delete a notification
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    await req.prisma.notification.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Notification not found' });
    }
    next(error);
  }
});

module.exports = router;
