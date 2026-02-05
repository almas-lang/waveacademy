// Authentication & Authorization Middleware
const jwt = require('jsonwebtoken');

/**
 * Verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No token provided' }
      });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get fresh user data
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

      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'User not found' }
        });
      }

      if (user.status === 'INACTIVE') {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Account is inactive' }
        });
      }

      req.user = user;
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
