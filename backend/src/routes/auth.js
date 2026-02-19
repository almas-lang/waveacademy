// Authentication Routes
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendPasswordSetupEmail, sendPasswordResetEmail } = require('../utils/email');
const { authenticate } = require('../middleware/auth');
const { cacheDel } = require('../utils/cache');

const { sendWelcomeEmail } = require('../utils/email');

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Set auth token as httpOnly cookie
 */
function setTokenCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
    ...(isProduction && process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  });
}

/**
 * Clear auth cookie
 */
function clearTokenCookie(res) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    ...(isProduction && process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  });
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
 * POST /auth/register
 * Self-registration for learners via program slug
 */
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, phone, password, confirmPassword, programSlug } = req.body;

    // Validate required fields
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Name, email, password, and confirm password are required' }
      });
    }

    if (!EMAIL_REGEX.test(email) || email.length > 254) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Please enter a valid email address' }
      });
    }

    if (name.length > 200) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Name must be 200 characters or less' }
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

    // Validate phone if provided
    if (phone && !/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Phone number must be 10 digits' }
      });
    }

    // Check if email already exists
    const existingUser = await req.prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: { code: 'EMAIL_EXISTS', message: 'An account with this email already exists. Please login instead.' }
      });
    }

    // Find program by slug if provided
    let program = null;
    if (programSlug) {
      program = await req.prisma.program.findUnique({
        where: { slug: programSlug }
      });

      if (!program || !program.isPublished) {
        return res.status(404).json({
          success: false,
          error: { code: 'PROGRAM_NOT_FOUND', message: 'Program not found' }
        });
      }
    }

    // Create user + enrollment in a transaction
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await req.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          name: name.trim(),
          mobile: phone || null,
          role: 'LEARNER',
          status: 'ACTIVE',
          leadSource: programSlug || 'direct'
        }
      });

      // Enroll in the specific course from the LP link
      if (program) {
        await tx.enrollment.create({
          data: { userId: newUser.id, programId: program.id, type: 'FREE' }
        });
      }

      return newUser;
    });

    // Create session + JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const expiresAt = new Date(Date.now() + COOKIE_MAX_AGE);
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

    // Fire-and-forget welcome email
    sendWelcomeEmail(user.email, user.name, program?.name).catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        programId: program?.id || null
      }
    });
  } catch (error) {
    next(error);
  }
});

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

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Please enter a valid email address' }
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

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Please enter a valid email address' }
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

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Please enter a valid email address' }
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

    // Validate input before transaction
    if (!email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email, password, and confirm password are required' }
      });
    }

    if (!EMAIL_REGEX.test(email) || email.length > 254) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Please enter a valid email address' }
      });
    }

    if (name && name.length > 200) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Name must be 200 characters or less' }
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

    // Atomic check-then-create in serializable transaction to prevent race condition
    const passwordHash = await bcrypt.hash(password, 12);
    let admin;
    try {
      admin = await req.prisma.$transaction(async (tx) => {
        const existingAdmin = await tx.user.findFirst({ where: { role: 'ADMIN' } });
        if (existingAdmin) throw new Error('ADMIN_EXISTS');

        const existingUser = await tx.user.findUnique({ where: { email: email.toLowerCase() } });
        if (existingUser) throw new Error('EMAIL_EXISTS');

        return tx.user.create({
          data: {
            email: email.toLowerCase(),
            passwordHash,
            name: name || 'Admin',
            role: 'ADMIN',
            status: 'ACTIVE'
          }
        });
      }, { isolationLevel: 'Serializable' });
    } catch (txError) {
      if (txError.message === 'ADMIN_EXISTS') {
        return res.status(403).json({
          success: false,
          error: { code: 'ADMIN_EXISTS', message: 'An admin account already exists. Please login instead.' }
        });
      }
      if (txError.message === 'EMAIL_EXISTS') {
        return res.status(400).json({
          success: false,
          error: { code: 'EMAIL_EXISTS', message: 'This email is already registered' }
        });
      }
      throw txError;
    }

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
 * GET /auth/me
 * Verify session and return current user
 */
router.get('/me', authenticate, async (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
      }
    }
  });
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
