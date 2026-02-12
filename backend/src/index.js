// XperienceWave LMS - Backend Entry Point
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');

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

// Validate critical environment variables
const isProduction = process.env.NODE_ENV === 'production';
const REQUIRED_VARS = ['DATABASE_URL', 'JWT_SECRET'];
const missing = REQUIRED_VARS.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error(`FATAL: Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const WEAK_SECRETS = ['generate-a-64-character-random-string', 'secret', 'jwt_secret', 'changeme'];
if (process.env.JWT_SECRET.length < 32 || WEAK_SECRETS.includes(process.env.JWT_SECRET)) {
  if (isProduction) {
    console.error('FATAL: JWT_SECRET must be set to a strong value (32+ chars) in production');
    process.exit(1);
  } else {
    console.warn('⚠️  WARNING: JWT_SECRET is weak or missing. Set a strong 64-char random string before deploying.');
  }
}

// Initialize
const app = express();
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
const PORT = process.env.PORT || 3001;

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many login attempts. Please try again in 15 minutes.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
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
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true
}));
app.use(helmet());
app.use(express.json());
app.use(cookieParser());

// Make prisma available in routes
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// Apply general rate limiter to all routes
app.use(generalLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes - Auth routes get stricter rate limiting
app.use('/auth', authLimiter, authRoutes);
app.use('/admin/programs', adminProgramRoutes);
app.use('/admin/learners', adminLearnerRoutes);
app.use('/admin/sessions', adminSessionRoutes);
app.use('/admin/upload', adminUploadRoutes);
app.use('/admin/notifications', adminNotificationRoutes);
app.use('/admin/dashboard', adminDashboardRoutes);
app.use('/admin/search', adminSearchRoutes);
app.use('/learner', learnerRoutes);
app.use('/notifications', notificationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  const status = err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  res.status(status).json({
    success: false,
    error: {
      code: err.code || 'SERVER_ERROR',
      message: status >= 500 && isProduction
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

// Periodic cleanup: expired login sessions + old notifications
async function runCleanup() {
  try {
    const [expiredSessions, oldNotifications] = await Promise.all([
      prisma.userSession.deleteMany({
        where: { expiresAt: { lt: new Date() } }
      }),
      prisma.notification.deleteMany({
        where: { createdAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } } // 90 days
      })
    ]);
    if (expiredSessions.count > 0 || oldNotifications.count > 0) {
      console.log(`🧹 Cleanup: removed ${expiredSessions.count} expired sessions, ${oldNotifications.count} old notifications`);
    }
  } catch (err) {
    console.error('Cleanup error:', err.message);
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 LMS Backend running on port ${PORT}`);
  console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);

  // Run cleanup on startup and every 24 hours
  runCleanup();
  setInterval(runCleanup, 24 * 60 * 60 * 1000);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

// Global error handlers — prevent silent crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});
