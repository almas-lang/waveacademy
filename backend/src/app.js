// App factory — creates Express app with all middleware and routes
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/auth');
const adminProgramRoutes = require('./routes/admin/programs');
const adminLearnerRoutes = require('./routes/admin/learners');
const adminSessionRoutes = require('./routes/admin/sessions');
const adminUploadRoutes = require('./routes/admin/upload');
const adminNotificationRoutes = require('./routes/admin/notifications');
const adminDashboardRoutes = require('./routes/admin/dashboard');
const adminSearchRoutes = require('./routes/admin/search');
const learnerRoutes = require('./routes/learner');
const notificationRoutes = require('./routes/notifications');
const publicRoutes = require('./routes/public');
const paymentRoutes = require('./routes/payments');

function createApp(prisma) {
  const app = express();
  const isTest = process.env.NODE_ENV === 'test';

  // Middleware
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:3003',
    'https://learn.xperiencewave.com',
    process.env.FRONTEND_URL
  ].filter(Boolean);

  app.use(cors({
    origin: function(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true
  }));
  app.use(helmet());

  // Raw body for payment webhook (HMAC verification needs raw bytes)
  app.use('/payments/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json());
  app.use(cookieParser());

  // Make prisma available in routes
  app.use((req, res, next) => {
    req.prisma = prisma;
    next();
  });

  // Rate limiters — skip in test environment
  if (!isTest) {
    const generalLimiter = rateLimit({
      windowMs: 60 * 1000,
      max: 100,
      message: {
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many requests. Please slow down.'
        }
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.use(generalLimiter);
  }

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Routes
  if (!isTest) {
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 20,
      message: {
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many login attempts. Please try again in 15 minutes.'
        }
      },
      standardHeaders: true,
      legacyHeaders: false,
      validate: { ip: false },
    });
    const registerLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5,
      message: {
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many registration attempts. Please try again in 15 minutes.'
        }
      },
      standardHeaders: true,
      legacyHeaders: false,
      validate: { ip: false },
    });
    const passwordSetupLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 30,
      message: {
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many attempts. Please try again in 15 minutes.'
        }
      },
      standardHeaders: true,
      legacyHeaders: false,
      validate: { ip: false },
    });
    // Apply specific limiters: strict for login/register, relaxed for password setup/reset
    app.use('/auth/register', registerLimiter);
    app.use('/auth/setup-password', passwordSetupLimiter);
    app.use('/auth/reset-password', passwordSetupLimiter);
    app.use('/auth', authLimiter, authRoutes);
  } else {
    app.use('/auth', authRoutes);
  }

  // Public routes (no auth)
  app.use('/public', publicRoutes);

  app.use('/admin/programs', adminProgramRoutes);
  app.use('/admin/learners', adminLearnerRoutes);
  app.use('/admin/sessions', adminSessionRoutes);
  app.use('/admin/upload', adminUploadRoutes);
  app.use('/admin/notifications', adminNotificationRoutes);
  app.use('/admin/dashboard', adminDashboardRoutes);
  app.use('/admin/search', adminSearchRoutes);
  app.use('/learner', learnerRoutes);
  app.use('/payments', paymentRoutes);
  app.use('/notifications', notificationRoutes);

  // Error handling middleware
  app.use((err, req, res, next) => {
    if (!isTest) console.error('Error:', err);
    const status = err.status || 500;
    const isProd = process.env.NODE_ENV === 'production';
    res.status(status).json({
      success: false,
      error: {
        code: err.code || 'SERVER_ERROR',
        message: status >= 500 && isProd
          ? 'Internal server error'
          : err.message || 'Internal server error'
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

  return app;
}

module.exports = createApp;
