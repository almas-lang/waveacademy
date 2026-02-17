// Wave Academy - Backend Entry Point
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

const { sendNonPayerSequenceEmail, sendPayerSequenceEmail } = require('./utils/email');
const { acquireLock } = require('./utils/cache');

// Run a function only if this instance acquires the distributed lock
async function runWithLock(lockKey, fn) {
  const acquired = await acquireLock(lockKey, 300); // 5 min lock
  if (!acquired) return; // Another instance is handling it
  try {
    await fn();
  } catch (err) {
    console.error(`Error in ${lockKey}:`, err.message);
  }
}

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

/**
 * Email sequences cron job
 * Non-payer: 5 steps sent on days 1, 2, 3, 5, 7 after registration
 * Payer: 2 steps sent on days 1, 3 after payment (step 1 = payment confirmation, sent immediately)
 */
async function runEmailSequences() {
  // Day offset -> step number for non-payer sequence
  const nonPayerSchedule = [
    { daysAgo: 1, step: 1 },
    { daysAgo: 2, step: 2 },
    { daysAgo: 3, step: 3 },
    { daysAgo: 5, step: 4 },
    { daysAgo: 7, step: 5 },
  ];

  // Day offset -> step number for payer sequence (step 1 sent at payment time)
  const payerSchedule = [
    { daysAgo: 1, step: 2 },
    { daysAgo: 3, step: 3 },
  ];

  const now = new Date();

  // --- Non-payer sequence ---
  for (const { daysAgo, step } of nonPayerSchedule) {
    try {
      const startOfDay = new Date(now);
      startOfDay.setDate(startOfDay.getDate() - daysAgo);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(startOfDay);
      endOfDay.setHours(23, 59, 59, 999);

      // Find users who registered X days ago with at least one FREE enrollment
      // and haven't received this step email yet
      const users = await prisma.user.findMany({
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay },
          enrollments: { some: { type: 'FREE' } },
          NOT: {
            emailLogs: { some: { sequenceType: 'non_payer', sequenceStep: step } }
          }
        },
        include: {
          enrollments: {
            where: { type: 'FREE' },
            include: { program: { select: { name: true } } },
            take: 1
          }
        }
      });

      for (const user of users) {
        const enrollment = user.enrollments[0];
        if (!enrollment) continue;

        await sendNonPayerSequenceEmail(user.email, user.name, enrollment.program.name, step);

        await prisma.emailLog.create({
          data: { userId: user.id, sequenceType: 'non_payer', sequenceStep: step }
        });
      }

      if (users.length > 0) {
        console.log(`📧 Non-payer step ${step}: sent ${users.length} emails`);
      }
    } catch (err) {
      console.error(`Email sequence error (non-payer step ${step}):`, err.message);
    }
  }

  // --- Payer sequence ---
  for (const { daysAgo, step } of payerSchedule) {
    try {
      const startOfDay = new Date(now);
      startOfDay.setDate(startOfDay.getDate() - daysAgo);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(startOfDay);
      endOfDay.setHours(23, 59, 59, 999);

      // Find users who paid X days ago and haven't received this step email
      const users = await prisma.user.findMany({
        where: {
          enrollments: { some: { type: 'PAID', paidAt: { gte: startOfDay, lte: endOfDay } } },
          NOT: {
            emailLogs: { some: { sequenceType: 'payer', sequenceStep: step } }
          }
        },
        include: {
          enrollments: {
            where: { type: 'PAID', paidAt: { gte: startOfDay, lte: endOfDay } },
            include: { program: { select: { name: true } } },
            take: 1
          }
        }
      });

      for (const user of users) {
        const enrollment = user.enrollments[0];
        if (!enrollment) continue;

        await sendPayerSequenceEmail(user.email, user.name, enrollment.program.name, step);

        await prisma.emailLog.create({
          data: { userId: user.id, sequenceType: 'payer', sequenceStep: step }
        });
      }

      if (users.length > 0) {
        console.log(`📧 Payer step ${step}: sent ${users.length} emails`);
      }
    } catch (err) {
      console.error(`Email sequence error (payer step ${step}):`, err.message);
    }
  }
}

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 LMS Backend running on port ${PORT}`);
  console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);

  // Run cleanup on startup and every 24 hours (distributed lock prevents duplicates)
  runWithLock('cron:cleanup', runCleanup);
  setInterval(() => runWithLock('cron:cleanup', runCleanup), 24 * 60 * 60 * 1000);

  // Run email sequences every hour (distributed lock prevents duplicates)
  setInterval(() => runWithLock('cron:email-sequences', runEmailSequences), 60 * 60 * 1000);
});

// Graceful shutdown — drain in-flight requests before exiting
function gracefulShutdown(signal) {
  console.log(`${signal} received, shutting down gracefully...`);

  // Stop accepting new connections, wait for in-flight requests to finish
  server.close(async () => {
    console.log('All connections closed.');
    await prisma.$disconnect();
    process.exit(0);
  });

  // Force exit after 10s if connections don't drain (Railway sends SIGKILL at 10s)
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Global error handlers — prevent silent crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});
