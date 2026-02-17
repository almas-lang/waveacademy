// Cashfree Payment Gateway Utility
const crypto = require('crypto');

const CASHFREE_ENV = process.env.CASHFREE_ENV || 'sandbox';
const BASE_URL = CASHFREE_ENV === 'production'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

const APP_ID = process.env.CASHFREE_APP_ID;
const SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const WEBHOOK_SECRET = process.env.CASHFREE_WEBHOOK_SECRET;

/**
 * Create a Cashfree order
 */
async function createCashfreeOrder({ orderId, amount, currency, customerEmail, customerName, customerPhone, returnUrl, notifyUrl }) {
  if (!APP_ID || !SECRET_KEY) {
    throw new Error('Cashfree credentials not configured');
  }

  const response = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': APP_ID,
      'x-client-secret': SECRET_KEY,
      'x-api-version': '2023-08-01'
    },
    body: JSON.stringify({
      order_id: orderId,
      order_amount: amount,
      order_currency: currency || 'INR',
      customer_details: {
        customer_id: customerEmail.replace(/[^a-zA-Z0-9]/g, '_'),
        customer_email: customerEmail,
        customer_name: customerName,
        customer_phone: customerPhone
      },
      order_meta: {
        return_url: returnUrl,
        notify_url: notifyUrl
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Cashfree create order error:', data);
    throw new Error(data.message || 'Failed to create payment order');
  }

  return data;
}

/**
 * Get payment status for an order
 */
async function getPaymentStatus(orderId) {
  if (!APP_ID || !SECRET_KEY) {
    throw new Error('Cashfree credentials not configured');
  }

  const response = await fetch(`${BASE_URL}/orders/${orderId}/payments`, {
    method: 'GET',
    headers: {
      'x-client-id': APP_ID,
      'x-client-secret': SECRET_KEY,
      'x-api-version': '2023-08-01'
    }
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Cashfree get payment status error:', data);
    throw new Error(data.message || 'Failed to get payment status');
  }

  return data;
}

/**
 * Verify Cashfree webhook signature (HMAC-SHA256)
 */
function verifyWebhookSignature(timestamp, rawBody, signature) {
  if (!WEBHOOK_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CASHFREE_WEBHOOK_SECRET is not set — cannot verify webhooks in production');
    }
    console.warn('CASHFREE_WEBHOOK_SECRET not set, skipping verification (dev only)');
    return true;
  }

  try {
    const payload = timestamp + rawBody;
    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(payload)
      .digest('base64');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (err) {
    console.error('Webhook signature verification error:', err);
    return false;
  }
}

module.exports = {
  createCashfreeOrder,
  getPaymentStatus,
  verifyWebhookSignature
};
