const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticate);

// GET /notifications - Get current user's notifications
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      userId,
      ...(unreadOnly === 'true' ? { isRead: false } : {})
    };

    const [notifications, total, unreadCount] = await Promise.all([
      req.prisma.notification.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      req.prisma.notification.count({ where }),
      req.prisma.notification.count({
        where: { userId, isRead: false }
      })
    ]);

    res.json({
      notifications,
      unreadCount,
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

// GET /notifications/unread-count - Get unread count only
router.get('/unread-count', async (req, res, next) => {
  try {
    const userId = req.user.id;

    const count = await req.prisma.notification.count({
      where: { userId, isRead: false }
    });

    res.json({ unreadCount: count });
  } catch (error) {
    next(error);
  }
});

// PATCH /notifications/:id/read - Mark a notification as read
router.patch('/:id/read', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await req.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true }
    });

    if (notification.count === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// PATCH /notifications/read-all - Mark all notifications as read
router.patch('/read-all', async (req, res, next) => {
  try {
    const userId = req.user.id;

    await req.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// DELETE /notifications/:id - Delete a notification
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await req.prisma.notification.deleteMany({
      where: { id, userId }
    });

    if (notification.count === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
