// Payment Routes
const express = require('express');
const router = express.Router();
const { authenticate, requireLearner } = require('../middleware/auth');
const { createCashfreeOrder, getPaymentStatus, verifyWebhookSignature } = require('../utils/cashfree');
const { sendPaymentConfirmationEmail } = require('../utils/email');
const { cacheDel } = require('../utils/cache');

/**
 * POST /payments/create-order
 * Create a Cashfree payment order for upgrading enrollment
 */
router.post('/create-order', authenticate, requireLearner, async (req, res, next) => {
  try {
    const { programId } = req.body;
    const userId = req.user.id;

    if (!programId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Program ID is required' }
      });
    }

    // Get enrollment
    const enrollment = await req.prisma.enrollment.findUnique({
      where: { userId_programId: { userId, programId } }
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_ENROLLED', message: 'You are not enrolled in this program' }
      });
    }

    if (enrollment.type === 'PAID' || enrollment.type === 'ADMIN') {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_PAID', message: 'You already have full access to this program' }
      });
    }

    // Get program with price
    const program = await req.prisma.program.findUnique({
      where: { id: programId }
    });

    if (!program || !program.price || parseFloat(program.price) <= 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_PRICE', message: 'This program does not have a price set' }
      });
    }

    // Get user details for Cashfree
    const user = await req.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, mobile: true }
    });

    // Create Cashfree order
    const amount = parseFloat(program.price);
    const cashfreeOrder = await createCashfreeOrder({
      orderId: `order_${enrollment.id}_${Date.now()}`,
      amount,
      currency: program.currency || 'INR',
      customerEmail: user.email,
      customerName: user.name,
      customerPhone: user.mobile || '9999999999',
      returnUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/programs/${programId}?payment=success`,
      notifyUrl: `${process.env.BACKEND_URL || 'http://localhost:3001'}/payments/webhook`
    });

    // Delete any existing PENDING payment for this enrollment (from failed/abandoned attempts)
    await req.prisma.payment.deleteMany({
      where: { enrollmentId: enrollment.id, status: 'PENDING' }
    });

    // Create Payment record — use our custom order_id (not cf_order_id)
    // Cashfree API endpoints expect the merchant's order_id
    const merchantOrderId = cashfreeOrder.order_id;

    await req.prisma.payment.create({
      data: {
        userId,
        enrollmentId: enrollment.id,
        programId,
        cashfreeOrderId: merchantOrderId,
        amount,
        currency: program.currency || 'INR',
        status: 'PENDING',
        metadata: { cfOrderId: cashfreeOrder.cf_order_id }
      }
    });

    res.json({
      success: true,
      data: {
        sessionId: cashfreeOrder.payment_session_id,
        orderId: merchantOrderId,
        orderAmount: amount,
        orderCurrency: program.currency || 'INR',
        cashfreeEnv: process.env.CASHFREE_ENV || 'sandbox'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /payments/verify
 * Verify payment status with Cashfree
 */
router.post('/verify', authenticate, requireLearner, async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const userId = req.user.id;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Order ID is required' }
      });
    }

    // Find payment
    const payment = await req.prisma.payment.findUnique({
      where: { cashfreeOrderId: orderId },
      include: { enrollment: true, program: true, user: true }
    });

    if (!payment || payment.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Payment not found' }
      });
    }

    // Already processed
    if (payment.status === 'SUCCESS') {
      return res.json({
        success: true,
        data: { status: 'SUCCESS', message: 'Payment already verified' }
      });
    }

    // Check with Cashfree
    const cashfreeStatus = await getPaymentStatus(orderId);
    const paymentDetails = cashfreeStatus?.filter?.(p => p.payment_status === 'SUCCESS')?.[0];

    if (paymentDetails) {
      // Update payment + enrollment (interactive transaction to prevent race)
      const updated = await req.prisma.$transaction(async (tx) => {
        const current = await tx.payment.findUnique({ where: { id: payment.id } });
        if (current.status === 'SUCCESS') return false;

        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'SUCCESS',
            cashfreePaymentId: paymentDetails.cf_payment_id?.toString(),
            paymentMethod: paymentDetails.payment_group || null
          }
        });
        await tx.enrollment.update({
          where: { id: payment.enrollmentId },
          data: { type: 'PAID', paidAt: new Date() }
        });
        return true;
      });

      if (!updated) {
        return res.json({
          success: true,
          data: { status: 'SUCCESS', message: 'Payment already verified' }
        });
      }

      // Bust learner caches
      await Promise.all([
        cacheDel(`learner:home:${userId}`),
        cacheDel(`learner:profile:${userId}`)
      ]);

      // Send confirmation email
      sendPaymentConfirmationEmail(
        payment.user.email,
        payment.user.name,
        payment.program.name,
        parseFloat(payment.amount),
        payment.program.currency || 'INR'
      ).catch(err => console.error('Failed to send payment email:', err));

      return res.json({
        success: true,
        data: { status: 'SUCCESS', message: 'Payment verified successfully' }
      });
    }

    // Check for failure
    const failedPayment = cashfreeStatus?.find?.(p => p.payment_status === 'FAILED');
    if (failedPayment) {
      await req.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          failureReason: failedPayment.payment_message || 'Payment failed'
        }
      });

      return res.json({
        success: true,
        data: { status: 'FAILED', message: failedPayment.payment_message || 'Payment failed' }
      });
    }

    // Still pending
    res.json({
      success: true,
      data: { status: 'PENDING', message: 'Payment is still being processed' }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /payments/webhook
 * Cashfree webhook callback (unauthenticated, HMAC verified)
 */
router.post('/webhook', async (req, res, next) => {
  try {
    // Verify HMAC signature
    const timestamp = req.headers['x-webhook-timestamp'];
    const signature = req.headers['x-webhook-signature'];

    if (!timestamp || !signature) {
      return res.status(400).json({ success: false, error: 'Missing signature headers' });
    }

    const rawBody = typeof req.body === 'string' ? req.body : req.body.toString();

    if (!verifyWebhookSignature(timestamp, rawBody, signature)) {
      return res.status(401).json({ success: false, error: 'Invalid signature' });
    }

    let payload;
    try {
      payload = typeof req.body === 'string' ? JSON.parse(req.body) : JSON.parse(rawBody);
    } catch (parseErr) {
      console.error('Webhook JSON parse error:', parseErr.message);
      return res.status(200).json({ success: true }); // Acknowledge to stop retries
    }

    const orderData = payload?.data?.order;
    const paymentData = payload?.data?.payment;

    if (!orderData?.order_id) {
      return res.status(200).json({ success: true }); // Acknowledge but skip
    }

    // Find payment by Cashfree order ID
    const payment = await req.prisma.payment.findUnique({
      where: { cashfreeOrderId: orderData.order_id },
      include: { user: true, program: true }
    });

    if (!payment) {
      return res.status(200).json({ success: true }); // Acknowledge unknown orders
    }

    // Idempotent: skip if already processed
    if (payment.status === 'SUCCESS') {
      return res.status(200).json({ success: true });
    }

    if (paymentData?.payment_status === 'SUCCESS') {
      // Verify payment amount matches what we expected
      const paidAmount = parseFloat(paymentData.payment_amount || orderData.order_amount);
      if (Math.abs(paidAmount - parseFloat(payment.amount)) > 0.01) {
        console.error(`Amount mismatch: expected ${payment.amount}, got ${paidAmount} for order ${orderData.order_id}`);
        await req.prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED', failureReason: 'Amount mismatch' }
        });
        return res.status(200).json({ success: true });
      }

      const updated = await req.prisma.$transaction(async (tx) => {
        // Re-read inside transaction to prevent race condition with duplicate webhooks
        const current = await tx.payment.findUnique({ where: { id: payment.id } });
        if (current.status === 'SUCCESS') return false;

        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'SUCCESS',
            cashfreePaymentId: paymentData.cf_payment_id?.toString(),
            paymentMethod: paymentData.payment_group || null
          }
        });
        await tx.enrollment.update({
          where: { id: payment.enrollmentId },
          data: { type: 'PAID', paidAt: new Date() }
        });
        return true;
      });

      if (updated) {
        // Bust caches
        await Promise.all([
          cacheDel(`learner:home:${payment.userId}`),
          cacheDel(`learner:profile:${payment.userId}`)
        ]);

        // Send confirmation email
        sendPaymentConfirmationEmail(
          payment.user.email,
          payment.user.name,
          payment.program.name,
          parseFloat(payment.amount),
          payment.program.currency || 'INR'
        ).catch(err => console.error('Webhook: Failed to send payment email:', err));
      }
    } else if (paymentData?.payment_status === 'FAILED') {
      await req.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          failureReason: paymentData.payment_message || 'Payment failed'
        }
      });
    }

    // Always return 200 to Cashfree
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    // Still return 200 to prevent Cashfree retries on server errors
    res.status(200).json({ success: true });
  }
});

module.exports = router;
