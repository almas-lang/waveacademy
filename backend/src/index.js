// XperienceWave LMS - Backend Entry Point
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const createApp = require('./app');

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
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

const app = createApp(prisma);
const PORT = process.env.PORT || 3001;

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
