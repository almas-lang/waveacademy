// Authentication Routes
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendPasswordSetupEmail, sendPasswordResetEmail } = require('../utils/email');
const { authenticate } = require('../middleware/auth');
const { cacheDel } = require('../utils/cache');

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Set auth token as httpOnly cookie
 */
function setTokenCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

/**
 * Clear auth cookie
 */
function clearTokenCookie(res) {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  });
}

/**
 * Validate password strength
 * Returns error message or null if valid
 */
function validatePassword(password) {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character';
  return null;
}

/**
 * POST /auth/login
 * Login for admin and learners
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email and password required' }
      });
    }

    // Find user
    const user = await req.prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' }
      });
    }

    // Check if password is set
    if (!user.passwordHash) {
      return res.status(401).json({
        success: false,
        error: { code: 'PASSWORD_NOT_SET', message: 'Please set up your password first' }
      });
    }

    // Check status
    if (user.status === 'INACTIVE') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Account is inactive' }
      });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' }
      });
    }

    // Check active sessions + create in a serializable transaction to prevent race conditions
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    try {
      await req.prisma.$transaction(async (tx) => {
        const activeSessions = await tx.userSession.count({
          where: {
            userId: user.id,
            expiresAt: { gt: new Date() }
          }
        });

        if (activeSessions >= 2) {
          throw new Error('MAX_SESSIONS_REACHED');
        }

        await tx.userSession.create({
          data: {
            userId: user.id,
            token,
            deviceInfo: req.headers['user-agent'] || null,
            ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
            expiresAt
          }
        });
      }, { isolationLevel: 'Serializable' });
    } catch (txError) {
      if (txError.message === 'MAX_SESSIONS_REACHED') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'MAX_SESSIONS_REACHED',
            message: 'You are already logged in on 2 devices. Please logout from one device first.'
          }
        });
      }
      throw txError;
    }

    setTokenCookie(res, token);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/login-force
 * Login and logout all other devices
 */
router.post('/login-force', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email and password required' }
      });
    }

    // Find user
    const user = await req.prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' }
      });
    }

    if (user.status === 'INACTIVE') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Account is inactive' }
      });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' }
      });
    }

    // Delete all existing sessions for this user
    await req.prisma.userSession.deleteMany({
      where: { userId: user.id }
    });

    // Generate token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Create new session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await req.prisma.userSession.create({
      data: {
        userId: user.id,
        token,
        deviceInfo: req.headers['user-agent'] || null,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
        expiresAt
      }
    });

    setTokenCookie(res, token);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/setup-password
 * First-time password setup for new learners
 */
router.post('/setup-password', async (req, res, next) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'All fields required' }
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Passwords do not match' }
      });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: passwordError }
      });
    }

    // Find user with valid token
    const user = await req.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Invalid or expired setup link' }
      });
    }

    // Hash password and update user
    const passwordHash = await bcrypt.hash(password, 12);
    
    await req.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        status: 'ACTIVE'
      }
    });

    res.json({
      success: true,
      message: 'Password set successfully. You can now login.'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email required' }
      });
    }

    // Always return same response to prevent email enumeration
    const genericResponse = {
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent.'
    };

    const user = await req.prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return res.json(genericResponse);
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await req.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires
      }
    });

    // Send email
    await sendPasswordResetEmail(user.email, user.name, resetToken);

    res.json(genericResponse);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'All fields required' }
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Passwords do not match' }
      });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: passwordError }
      });
    }

    // Find user with valid token
    const user = await req.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Invalid or expired reset link' }
      });
    }

    // Check new password is not the same as the old one
    const isSamePassword = await bcrypt.compare(password, user.passwordHash);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'New password must be different from your current password' }
      });
    }

    // Hash password and update user
    const passwordHash = await bcrypt.hash(password, 12);
    
    await req.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null
      }
    });

    res.json({
      success: true,
      message: 'Password reset successfully. You can now login.'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /auth/admin/check
 * Check if any admin exists in the system
 */
router.get('/admin/check', async (req, res, next) => {
  try {
    const adminCount = await req.prisma.user.count({
      where: { role: 'ADMIN' }
    });

    res.json({
      success: true,
      data: { adminExists: adminCount > 0 }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/admin/setup
 * Create the first admin user (only works if no admin exists)
 */
router.post('/admin/setup', async (req, res, next) => {
  try {
    const { email, password, confirmPassword, name } = req.body;

    // Check if admin already exists
    const existingAdmin = await req.prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (existingAdmin) {
      return res.status(403).json({
        success: false,
        error: { code: 'ADMIN_EXISTS', message: 'An admin account already exists. Please login instead.' }
      });
    }

    // Validate input
    if (!email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email, password, and confirm password are required' }
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Passwords do not match' }
      });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: passwordError }
      });
    }

    // Check if email is already in use
    const existingUser = await req.prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: { code: 'EMAIL_EXISTS', message: 'This email is already registered' }
      });
    }

    // Create admin user
    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await req.prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name: name || 'Admin',
        role: 'ADMIN',
        status: 'ACTIVE'
      }
    });

    // Generate token and create session
    const token = jwt.sign(
      { userId: admin.id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await req.prisma.userSession.create({
      data: {
        userId: admin.id,
        token,
        deviceInfo: req.headers['user-agent'] || null,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
        expiresAt
      }
    });

    setTokenCookie(res, token);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role
        }
      },
      message: 'Admin account created successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/logout
 * Logout - removes server-side session
 */
router.post('/logout', async (req, res, next) => {
  try {
    // Read token from cookie or Authorization header
    const token = req.cookies?.token ||
      (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);

    if (token) {
      await req.prisma.userSession.delete({
        where: { token }
      }).catch(() => {});
      // Clear cached auth for this token
      await cacheDel(`auth:${token.slice(-16)}`);
    }

    clearTokenCookie(res);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/change-password
 * Change password for authenticated user
 */
router.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'All fields are required' }
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'New passwords do not match' }
      });
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: passwordError }
      });
    }

    // Get user with password hash
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user || !user.passwordHash) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATE', message: 'Unable to change password' }
      });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' }
      });
    }

    // Hash and update password
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await req.prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash }
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
