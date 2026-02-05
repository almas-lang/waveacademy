// XperienceWave LMS - Backend Entry Point
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

// Import routes
const authRoutes = require('./routes/auth');
const adminProgramRoutes = require('./routes/admin/programs');
const adminLearnerRoutes = require('./routes/admin/learners');
const adminSessionRoutes = require('./routes/admin/sessions');
const adminUploadRoutes = require('./routes/admin/upload');
const adminNotificationRoutes = require('./routes/admin/notifications');
const adminSearchRoutes = require('./routes/admin/search');
const learnerRoutes = require('./routes/learner');
const notificationRoutes = require('./routes/notifications');

// Initialize
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Make prisma available in routes
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRoutes);
app.use('/admin/programs', adminProgramRoutes);
app.use('/admin/learners', adminLearnerRoutes);
app.use('/admin/sessions', adminSessionRoutes);
app.use('/admin/upload', adminUploadRoutes);
app.use('/admin/notifications', adminNotificationRoutes);
app.use('/admin/search', adminSearchRoutes);
app.use('/learner', learnerRoutes);
app.use('/notifications', notificationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'SERVER_ERROR',
      message: err.message || 'Internal server error'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 LMS Backend running on port ${PORT}`);
  console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});
