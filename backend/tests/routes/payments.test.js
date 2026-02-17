const request = require('supertest');
const createApp = require('../../src/app');
const { createMockPrisma } = require('../helpers/mock-prisma');
const { TEST_LEARNER, mockAuthSession } = require('../helpers/auth');

jest.mock('../../src/utils/email', () => ({
  sendPaymentConfirmationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordSetupEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendSessionReminderEmail: jest.fn(),
}));
jest.mock('../../src/utils/cache', () => ({
  cacheGet: (_key, fn) => fn(),
  cacheDel: jest.fn(),
}));
jest.mock('../../src/utils/cashfree', () => ({
  createCashfreeOrder: jest.fn(),
  getPaymentStatus: jest.fn(),
  verifyWebhookSignature: jest.fn(),
}));

const { createCashfreeOrder, getPaymentStatus, verifyWebhookSignature } = require('../../src/utils/cashfree');
const { sendPaymentConfirmationEmail } = require('../../src/utils/email');
const { cacheDel } = require('../../src/utils/cache');

let app;
let mockPrisma;

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma = createMockPrisma();
  app = createApp(mockPrisma);
});

// ---------- POST /payments/create-order ----------

describe('POST /payments/create-order', () => {
  it('returns 400 when programId missing', async () => {
    const token = mockAuthSession(mockPrisma, TEST_LEARNER);

    const res = await request(app)
      .post('/payments/create-order')
      .set('Cookie', `token=${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when already paid', async () => {
    const token = mockAuthSession(mockPrisma, TEST_LEARNER);

    mockPrisma.enrollment.findUnique.mockResolvedValue({
      id: 'enroll-1',
      userId: TEST_LEARNER.id,
      programId: 'prog-1',
      type: 'PAID',
    });

    const res = await request(app)
      .post('/payments/create-order')
      .set('Cookie', `token=${token}`)
      .send({ programId: 'prog-1' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ALREADY_PAID');
  });

  it('returns 200 and creates order on success', async () => {
    const token = mockAuthSession(mockPrisma, TEST_LEARNER);

    mockPrisma.enrollment.findUnique.mockResolvedValue({
      id: 'enroll-1',
      userId: TEST_LEARNER.id,
      programId: 'prog-1',
      type: 'FREE',
    });
    mockPrisma.program.findUnique.mockResolvedValue({
      id: 'prog-1',
      price: '999.00',
      currency: 'INR',
    });
    // user lookup for cashfree (after auth middleware already consumed one)
    mockPrisma.user.findUnique.mockResolvedValueOnce({ ...TEST_LEARNER });

    createCashfreeOrder.mockResolvedValue({
      order_id: 'order_enroll-1_123',
      cf_order_id: 'cf-123',
      payment_session_id: 'session-abc',
    });
    mockPrisma.payment.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.payment.create.mockResolvedValue({});

    const res = await request(app)
      .post('/payments/create-order')
      .set('Cookie', `token=${token}`)
      .send({ programId: 'prog-1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sessionId).toBe('session-abc');
    expect(mockPrisma.payment.create).toHaveBeenCalled();
  });
});

// ---------- POST /payments/verify ----------

describe('POST /payments/verify', () => {
  it('returns 400 when orderId missing', async () => {
    const token = mockAuthSession(mockPrisma, TEST_LEARNER);

    const res = await request(app)
      .post('/payments/verify')
      .set('Cookie', `token=${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns early if payment already SUCCESS', async () => {
    const token = mockAuthSession(mockPrisma, TEST_LEARNER);

    mockPrisma.payment.findUnique.mockResolvedValue({
      id: 'pay-1',
      userId: TEST_LEARNER.id,
      status: 'SUCCESS',
      cashfreeOrderId: 'order-1',
    });

    const res = await request(app)
      .post('/payments/verify')
      .set('Cookie', `token=${token}`)
      .send({ orderId: 'order-1' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('SUCCESS');
    expect(res.body.data.message).toMatch(/already/i);
    expect(getPaymentStatus).not.toHaveBeenCalled();
  });

  it('updates payment and enrollment on successful verification', async () => {
    const token = mockAuthSession(mockPrisma, TEST_LEARNER);

    const payment = {
      id: 'pay-1',
      userId: TEST_LEARNER.id,
      enrollmentId: 'enroll-1',
      status: 'PENDING',
      amount: '999.00',
      cashfreeOrderId: 'order-1',
      enrollment: { id: 'enroll-1' },
      program: { name: 'Test Program', currency: 'INR' },
      user: { email: TEST_LEARNER.email, name: TEST_LEARNER.name },
    };
    mockPrisma.payment.findUnique.mockResolvedValue(payment);

    getPaymentStatus.mockResolvedValue([
      { payment_status: 'SUCCESS', cf_payment_id: 456, payment_group: 'upi' },
    ]);

    // Interactive transaction mock
    const txMock = {
      payment: {
        findUnique: jest.fn().mockResolvedValue({ status: 'PENDING' }),
        update: jest.fn().mockResolvedValue({}),
      },
      enrollment: {
        update: jest.fn().mockResolvedValue({}),
      },
    };
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(txMock));

    const res = await request(app)
      .post('/payments/verify')
      .set('Cookie', `token=${token}`)
      .send({ orderId: 'order-1' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('SUCCESS');
    expect(txMock.payment.update).toHaveBeenCalled();
    expect(txMock.enrollment.update).toHaveBeenCalled();
    expect(cacheDel).toHaveBeenCalled();
  });
});

// ---------- POST /payments/webhook ----------

describe('POST /payments/webhook', () => {
  const PAYMENT = {
    id: 'pay-1',
    userId: 'learner-id-1',
    enrollmentId: 'enroll-1',
    amount: '999.00',
    status: 'PENDING',
    user: { email: 'learner@test.com', name: 'Test Learner' },
    program: { name: 'Test Program', currency: 'INR' },
  };

  function webhookPayload(orderId, paymentStatus, amount) {
    return JSON.stringify({
      data: {
        order: { order_id: orderId, order_amount: amount || 999 },
        payment: {
          payment_status: paymentStatus,
          cf_payment_id: 789,
          payment_group: 'upi',
          payment_amount: amount || 999,
        },
      },
    });
  }

  it('returns 400 when signature headers missing', async () => {
    const res = await request(app)
      .post('/payments/webhook')
      .set('Content-Type', 'application/json')
      .send(webhookPayload('order-1', 'SUCCESS'));

    expect(res.status).toBe(400);
  });

  it('returns 401 when signature invalid', async () => {
    verifyWebhookSignature.mockReturnValue(false);

    const res = await request(app)
      .post('/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-webhook-timestamp', '123456')
      .set('x-webhook-signature', 'bad-sig')
      .send(webhookPayload('order-1', 'SUCCESS'));

    expect(res.status).toBe(401);
  });

  it('skips already-SUCCESS payment (idempotent)', async () => {
    verifyWebhookSignature.mockReturnValue(true);
    mockPrisma.payment.findUnique.mockResolvedValue({
      ...PAYMENT,
      status: 'SUCCESS',
    });

    const res = await request(app)
      .post('/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-webhook-timestamp', '123456')
      .set('x-webhook-signature', 'valid-sig')
      .send(webhookPayload('order-1', 'SUCCESS'));

    expect(res.status).toBe(200);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects amount mismatch', async () => {
    verifyWebhookSignature.mockReturnValue(true);
    mockPrisma.payment.findUnique.mockResolvedValue({ ...PAYMENT });
    mockPrisma.payment.update.mockResolvedValue({});

    const res = await request(app)
      .post('/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-webhook-timestamp', '123456')
      .set('x-webhook-signature', 'valid-sig')
      .send(webhookPayload('order-1', 'SUCCESS', 500));

    expect(res.status).toBe(200);
    // Should mark as FAILED, not SUCCESS
    expect(mockPrisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'FAILED', failureReason: 'Amount mismatch' }),
      })
    );
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('processes successful payment via interactive transaction', async () => {
    verifyWebhookSignature.mockReturnValue(true);
    mockPrisma.payment.findUnique.mockResolvedValue({ ...PAYMENT });

    const txMock = {
      payment: {
        findUnique: jest.fn().mockResolvedValue({ status: 'PENDING' }),
        update: jest.fn().mockResolvedValue({}),
      },
      enrollment: {
        update: jest.fn().mockResolvedValue({}),
      },
    };
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(txMock));

    const res = await request(app)
      .post('/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-webhook-timestamp', '123456')
      .set('x-webhook-signature', 'valid-sig')
      .send(webhookPayload('order-1', 'SUCCESS'));

    expect(res.status).toBe(200);
    expect(txMock.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'SUCCESS' }),
      })
    );
    expect(txMock.enrollment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'PAID' }),
      })
    );
    expect(cacheDel).toHaveBeenCalled();
    expect(sendPaymentConfirmationEmail).toHaveBeenCalled();
  });

  it('race condition: second webhook sees SUCCESS inside tx and skips', async () => {
    verifyWebhookSignature.mockReturnValue(true);
    mockPrisma.payment.findUnique.mockResolvedValue({ ...PAYMENT });

    // Inside the interactive transaction, payment is already SUCCESS (raced)
    const txMock = {
      payment: {
        findUnique: jest.fn().mockResolvedValue({ status: 'SUCCESS' }),
        update: jest.fn(),
      },
      enrollment: {
        update: jest.fn(),
      },
    };
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(txMock));

    const res = await request(app)
      .post('/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-webhook-timestamp', '123456')
      .set('x-webhook-signature', 'valid-sig')
      .send(webhookPayload('order-1', 'SUCCESS'));

    expect(res.status).toBe(200);
    // Should NOT have called update — skipped inside tx
    expect(txMock.payment.update).not.toHaveBeenCalled();
    expect(txMock.enrollment.update).not.toHaveBeenCalled();
    // Should NOT send email since updated === false
    expect(sendPaymentConfirmationEmail).not.toHaveBeenCalled();
  });
});
