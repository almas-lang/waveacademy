// Email Utility using Resend
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.EMAIL_FROM || 'noreply@xperiencewave.com';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * Send password setup email to new learner
 */
async function sendPasswordSetupEmail(email, name, token) {
  const setupUrl = `${frontendUrl}/auth/setup-password?token=${token}`;
  
  try {
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Welcome to XperienceWave - Set Up Your Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background-color: #4F46E5; 
              color: white !important; 
              text-decoration: none; 
              border-radius: 8px;
              margin: 20px 0;
            }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Welcome to XperienceWave! 🎉</h2>
            <p>Hi ${name},</p>
            <p>You've been enrolled in a program on XperienceWave. To get started, please set up your password:</p>
            <a href="${setupUrl}" class="button">Set Up Password</a>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't expect this email, please ignore it.</p>
            <div class="footer">
              <p>XperienceWave Learning Platform</p>
            </div>
          </div>
        </body>
        </html>
      `
    });
    console.log(`Password setup email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send password setup email:', error);
    throw error;
  }
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(email, name, token) {
  const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;
  
  try {
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Reset Your Password - XperienceWave',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background-color: #4F46E5; 
              color: white !important; 
              text-decoration: none; 
              border-radius: 8px;
              margin: 20px 0;
            }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Reset Your Password</h2>
            <p>Hi ${name},</p>
            <p>You requested to reset your password. Click the button below:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <div class="footer">
              <p>XperienceWave Learning Platform</p>
            </div>
          </div>
        </body>
        </html>
      `
    });
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw error;
  }
}

/**
 * Send session reminder email
 */
async function sendSessionReminderEmail(email, name, session) {
  try {
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Reminder: ${session.name} - Starting Soon`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background-color: #10B981; 
              color: white !important; 
              text-decoration: none; 
              border-radius: 8px;
              margin: 20px 0;
            }
            .session-details { background: #f3f4f6; padding: 15px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Session Reminder 📅</h2>
            <p>Hi ${name},</p>
            <p>Your session is starting soon:</p>
            <div class="session-details">
              <strong>${session.name}</strong><br>
              Time: ${new Date(session.startTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
            </div>
            ${session.meetLink ? `<a href="${session.meetLink}" class="button">Join Google Meet</a>` : ''}
            <div class="footer">
              <p>XperienceWave Learning Platform</p>
            </div>
          </div>
        </body>
        </html>
      `
    });
  } catch (error) {
    console.error('Failed to send session reminder:', error);
  }
}

module.exports = {
  sendPasswordSetupEmail,
  sendPasswordResetEmail,
  sendSessionReminderEmail
};
