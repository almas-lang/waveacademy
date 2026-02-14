// Email Utility using Resend
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.EMAIL_FROM || 'noreply@xperiencewave.com';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * Escape HTML to prevent XSS in email templates
 */
const escapeHtml = (str) => {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
};

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
            <p>Hi ${escapeHtml(name)},</p>
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
            <p>Hi ${escapeHtml(name)},</p>
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
      subject: `Reminder: ${escapeHtml(session.name)} - Starting Soon`,
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
            <p>Hi ${escapeHtml(name)},</p>
            <p>Your session is starting soon:</p>
            <div class="session-details">
              <strong>${escapeHtml(session.name)}</strong><br>
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

/**
 * Base email wrapper with consistent styling
 */
function emailWrapper(content) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #FF6B57;
          color: white !important;
          text-decoration: none;
          border-radius: 8px;
          margin: 20px 0;
          font-weight: 600;
        }
        .button-secondary {
          display: inline-block;
          padding: 12px 24px;
          background-color: #4F46E5;
          color: white !important;
          text-decoration: none;
          border-radius: 8px;
          margin: 20px 0;
          font-weight: 600;
        }
        .highlight { background: #FFF7ED; padding: 16px; border-radius: 8px; border-left: 4px solid #FF6B57; margin: 16px 0; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        ${content}
        <div class="footer">
          <p>XperienceWave Learning Platform</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send welcome email to self-registered user
 */
async function sendWelcomeEmail(email, name, programName) {
  try {
    const programText = programName
      ? `You've signed up for <strong>${escapeHtml(programName)}</strong> and your free lessons are ready to watch!`
      : `Your account is set up and you're ready to start learning!`;

    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: programName
        ? `Welcome! Your free lessons for ${programName} are ready`
        : 'Welcome to XperienceWave!',
      html: emailWrapper(`
        <h2>Welcome to XperienceWave!</h2>
        <p>Hi ${escapeHtml(name)},</p>
        <p>${programText}</p>
        <a href="${frontendUrl}/learner" class="button">Start Learning</a>
        <p>We're excited to have you on board. Dive into your free content and explore what XperienceWave has to offer.</p>
      `)
    });
    console.log(`Welcome email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }
}

/**
 * Send payment confirmation email
 */
async function sendPaymentConfirmationEmail(email, name, programName, amount, currency) {
  const currencySymbol = currency === 'INR' ? '₹' : '$';

  try {
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Payment Confirmed — Full access to ${programName}`,
      html: emailWrapper(`
        <h2>Payment Confirmed! 🎉</h2>
        <p>Hi ${escapeHtml(name)},</p>
        <p>Your payment has been processed successfully. You now have <strong>full access</strong> to all lessons in <strong>${escapeHtml(programName)}</strong>.</p>
        <div class="highlight">
          <strong>Payment Details</strong><br>
          Program: ${escapeHtml(programName)}<br>
          Amount: ${currencySymbol}${amount}
        </div>
        <a href="${frontendUrl}/learner" class="button">Continue Learning</a>
        <p>All lessons are now unlocked. Happy learning!</p>
      `)
    });
    console.log(`Payment confirmation email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send payment confirmation email:', error);
  }
}

/**
 * Non-payer email sequence (5 steps)
 */
const nonPayerEmails = {
  1: {
    subject: (programName) => `Your free lessons in ${programName} are waiting`,
    content: (name, programName) => `
      <h2>Your Free Lessons Are Waiting</h2>
      <p>Hi ${escapeHtml(name)},</p>
      <p>You signed up for <strong>${escapeHtml(programName)}</strong> but haven't started watching yet.</p>
      <p>Your free preview lessons are ready — take a few minutes to see what you'll learn.</p>
      <a href="${frontendUrl}/learner" class="button">Watch Free Lessons</a>
    `
  },
  2: {
    subject: (programName) => `Here's what you'll master in ${programName}`,
    content: (name, programName) => `
      <h2>What You'll Learn</h2>
      <p>Hi ${escapeHtml(name)},</p>
      <p>The full <strong>${escapeHtml(programName)}</strong> course covers everything you need to build real skills — from fundamentals to advanced techniques.</p>
      <div class="highlight">
        <strong>The full course includes:</strong><br>
        ✅ Step-by-step video lessons<br>
        ✅ Practical examples and exercises<br>
        ✅ Lifetime access to all content
      </div>
      <p>Start with the free lessons and see the quality for yourself.</p>
      <a href="${frontendUrl}/learner" class="button">Start Learning</a>
    `
  },
  3: {
    subject: (programName) => `Learners are loving ${programName}`,
    content: (name, programName) => `
      <h2>Join Learners Who Are Growing</h2>
      <p>Hi ${escapeHtml(name)},</p>
      <p>Other learners are already making progress in <strong>${escapeHtml(programName)}</strong> and building valuable skills.</p>
      <p>The free preview gives you a taste — upgrading unlocks the complete learning experience with all lessons and materials.</p>
      <a href="${frontendUrl}/learner" class="button-secondary">View Your Course</a>
    `
  },
  4: {
    subject: (programName) => `Don't miss out on ${programName}`,
    content: (name, programName) => `
      <h2>Ready to Unlock Everything?</h2>
      <p>Hi ${escapeHtml(name)},</p>
      <p>You've been exploring <strong>${escapeHtml(programName)}</strong> — great start!</p>
      <p>Upgrade now to get instant access to all lessons and materials. The sooner you start, the sooner you'll see results.</p>
      <a href="${frontendUrl}/learner" class="button">Upgrade Now</a>
    `
  },
  5: {
    subject: (programName) => `Final reminder: Complete your ${programName} enrollment`,
    content: (name, programName) => `
      <h2>One Last Reminder</h2>
      <p>Hi ${escapeHtml(name)},</p>
      <p>This is your final reminder about <strong>${escapeHtml(programName)}</strong>.</p>
      <p>Your free lessons are still available. Whenever you're ready, you can upgrade to unlock the full course and start your learning journey.</p>
      <a href="${frontendUrl}/learner" class="button-secondary">View Course</a>
      <p style="font-size: 13px; color: #666;">This is the last email we'll send about this. You're always welcome back when the time is right.</p>
    `
  }
};

async function sendNonPayerSequenceEmail(email, name, programName, step) {
  const template = nonPayerEmails[step];
  if (!template) return;

  try {
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: template.subject(programName),
      html: emailWrapper(template.content(name, programName))
    });
    console.log(`Non-payer email step ${step} sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send non-payer email step ${step}:`, error);
  }
}

/**
 * Payer email sequence (steps 2-3, step 1 is payment confirmation sent immediately)
 */
const payerEmails = {
  2: {
    subject: (programName) => `Tips to get the most from ${programName}`,
    content: (name, programName) => `
      <h2>Get the Most From Your Course</h2>
      <p>Hi ${escapeHtml(name)},</p>
      <p>Now that you have full access to <strong>${escapeHtml(programName)}</strong>, here are a few tips to maximize your learning:</p>
      <div class="highlight">
        <strong>Learning Tips:</strong><br>
        📝 Follow along with each lesson<br>
        🔄 Revisit lessons you find challenging<br>
        ⏰ Set a daily learning schedule<br>
        📊 Track your progress on the dashboard
      </div>
      <a href="${frontendUrl}/learner" class="button">Continue Learning</a>
    `
  },
  3: {
    subject: (programName) => `How's your progress in ${programName}?`,
    content: (name, programName) => `
      <h2>How's Your Learning Going?</h2>
      <p>Hi ${escapeHtml(name)},</p>
      <p>You've been learning <strong>${escapeHtml(programName)}</strong> for a few days now. How's it going?</p>
      <p>Check your dashboard to see your progress and pick up where you left off.</p>
      <a href="${frontendUrl}/learner" class="button">Check My Progress</a>
      <p>Keep going — consistency is the key to mastering any skill!</p>
    `
  }
};

async function sendPayerSequenceEmail(email, name, programName, step) {
  const template = payerEmails[step];
  if (!template) return;

  try {
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: template.subject(programName),
      html: emailWrapper(template.content(name, programName))
    });
    console.log(`Payer email step ${step} sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send payer email step ${step}:`, error);
  }
}

module.exports = {
  sendPasswordSetupEmail,
  sendPasswordResetEmail,
  sendSessionReminderEmail,
  sendWelcomeEmail,
  sendPaymentConfirmationEmail,
  sendNonPayerSequenceEmail,
  sendPayerSequenceEmail
};
