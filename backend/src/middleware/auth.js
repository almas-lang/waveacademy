// Authentication & Authorization Middleware
const jwt = require('jsonwebtoken');
const { cacheGet, cacheDel } = require('../utils/cache');

/**
 * Verify JWT token and attach user to request
 * Caches session+user in Redis (60s TTL) to avoid 2 DB queries per request
 */
const authenticate = async (req, res, next) => {
  try {
    // Read token from httpOnly cookie first, then Authorization header as fallback
    const token = req.cookies?.token ||
      (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No token provided' }
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Try to get session+user from cache to avoid 2 DB queries per request
      const cacheKey = `auth:${token.slice(-16)}`;
      const authData = await cacheGet(cacheKey, async () => {
        const session = await req.prisma.userSession.findUnique({
          where: { token }
        });

        if (!session || session.expiresAt < new Date()) {
          if (session) {
            await req.prisma.userSession.delete({ where: { id: session.id } }).catch(() => {});
          }
          return null;
        }

        const user = await req.prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true
          }
        });

        if (!user || user.status === 'INACTIVE') {
          return null;
        }

        return { user, sessionId: session.id };
      }, 60); // 60 second TTL — short enough to pick up status changes

      if (!authData) {
        return res.status(401).json({
          success: false,
          error: { code: 'SESSION_EXPIRED', message: 'Session expired. Please login again.' }
        });
      }

      if (authData.user.status === 'INACTIVE') {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Account is inactive' }
        });
      }

      req.user = authData.user;
      req.sessionId = authData.sessionId;

      // Update last active timestamp (fire-and-forget, at most once per cache TTL)
      req.prisma.userSession.update({
        where: { id: authData.sessionId },
        data: { lastActive: new Date() }
      }).catch(() => {});

      next();
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' }
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Require admin role
 */
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Admin access required' }
    });
  }
  next();
};

/**
 * Require learner role
 */
const requireLearner = (req, res, next) => {
  if (req.user.role !== 'LEARNER') {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Learner access required' }
    });
  }
  next();
};

module.exports = {
  authenticate,
  requireAdmin,
  requireLearner
};
