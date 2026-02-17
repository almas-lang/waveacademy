const request = require('supertest');
const createApp = require('../../src/app');
const { createMockPrisma } = require('../helpers/mock-prisma');
const { TEST_LEARNER, mockAuthSession } = require('../helpers/auth');

jest.mock('../../src/utils/email', () => ({
  sendPaymentConfirmationEmail: jest.fn(),
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

const { cacheDel } = require('../../src/utils/cache');

let app;
let mockPrisma;

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma = createMockPrisma();
  app = createApp(mockPrisma);
});

// ---------- POST /learner/lessons/:id/progress ----------

describe('POST /learner/lessons/:id/progress', () => {
  const LESSON_ID = 'lesson-1';

  it('returns 400 for invalid watch position', async () => {
    const token = mockAuthSession(mockPrisma, TEST_LEARNER);

    const res = await request(app)
      .post(`/learner/lessons/${LESSON_ID}/progress`)
      .set('Cookie', `token=${token}`)
      .send({ watchPositionSeconds: 'abc' });

    expect(res.status).toBe(400);
  });

  it('returns 404 when lesson not found', async () => {
    const token = mockAuthSession(mockPrisma, TEST_LEARNER);

    mockPrisma.lesson.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post(`/learner/lessons/${LESSON_ID}/progress`)
      .set('Cookie', `token=${token}`)
      .send({ watchPositionSeconds: 120 });

    expect(res.status).toBe(404);
  });

  it('returns 403 when not enrolled', async () => {
    const token = mockAuthSession(mockPrisma, TEST_LEARNER);

    mockPrisma.lesson.findUnique.mockResolvedValue({
      id: LESSON_ID,
      programId: 'prog-1',
      isFree: false,
    });
    mockPrisma.enrollment.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post(`/learner/lessons/${LESSON_ID}/progress`)
      .set('Cookie', `token=${token}`)
      .send({ watchPositionSeconds: 120 });

    expect(res.status).toBe(403);
  });

  it('returns 403 when FREE user tries to access paid lesson', async () => {
    const token = mockAuthSession(mockPrisma, TEST_LEARNER);

    mockPrisma.lesson.findUnique.mockResolvedValue({
      id: LESSON_ID,
      programId: 'prog-1',
      isFree: false,
    });
    mockPrisma.enrollment.findUnique.mockResolvedValue({
      id: 'enroll-1',
      userId: TEST_LEARNER.id,
      programId: 'prog-1',
      type: 'FREE',
    });

    const res = await request(app)
      .post(`/learner/lessons/${LESSON_ID}/progress`)
      .set('Cookie', `token=${token}`)
      .send({ watchPositionSeconds: 120 });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('LESSON_LOCKED');
  });

  it('upserts progress for FREE lesson accessed by FREE user', async () => {
    const token = mockAuthSession(mockPrisma, TEST_LEARNER);

    mockPrisma.lesson.findUnique.mockResolvedValue({
      id: LESSON_ID,
      programId: 'prog-1',
      isFree: true,
    });
    mockPrisma.enrollment.findUnique.mockResolvedValue({
      id: 'enroll-1',
      userId: TEST_LEARNER.id,
      programId: 'prog-1',
      type: 'FREE',
    });
    mockPrisma.progress.upsert.mockResolvedValue({
      status: 'IN_PROGRESS',
      watchPositionSeconds: 120,
    });

    const res = await request(app)
      .post(`/learner/lessons/${LESSON_ID}/progress`)
      .set('Cookie', `token=${token}`)
      .send({ watchPositionSeconds: 120 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.watchPosition).toBe(120);
    expect(mockPrisma.progress.upsert).toHaveBeenCalled();
    expect(cacheDel).toHaveBeenCalled();
  });

  it('upserts progress for PAID user accessing paid lesson', async () => {
    const token = mockAuthSession(mockPrisma, TEST_LEARNER);

    mockPrisma.lesson.findUnique.mockResolvedValue({
      id: LESSON_ID,
      programId: 'prog-1',
      isFree: false,
    });
    mockPrisma.enrollment.findUnique.mockResolvedValue({
      id: 'enroll-1',
      userId: TEST_LEARNER.id,
      programId: 'prog-1',
      type: 'PAID',
    });
    mockPrisma.progress.upsert.mockResolvedValue({
      status: 'IN_PROGRESS',
      watchPositionSeconds: 300,
    });

    const res = await request(app)
      .post(`/learner/lessons/${LESSON_ID}/progress`)
      .set('Cookie', `token=${token}`)
      .send({ watchPositionSeconds: 300 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.watchPosition).toBe(300);
  });
});

// ---------- GET /learner/discover ----------

describe('GET /learner/discover', () => {
  it('returns paginated programs the user is not enrolled in', async () => {
    const token = mockAuthSession(mockPrisma, TEST_LEARNER);

    mockPrisma.enrollment.findMany.mockResolvedValue([
      { programId: 'prog-1' },
    ]);
    mockPrisma.program.findMany.mockResolvedValue([
      {
        id: 'prog-2',
        name: 'Other Program',
        description: 'desc',
        thumbnailUrl: null,
        slug: 'other',
        price: '500',
        currency: 'INR',
        _count: { lessons: 5 },
      },
    ]);
    mockPrisma.program.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/learner/discover')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.programs).toHaveLength(1);
    expect(res.body.data.programs[0].id).toBe('prog-2');
  });

  it('caps limit to 100 even if client requests more', async () => {
    const token = mockAuthSession(mockPrisma, TEST_LEARNER);

    mockPrisma.enrollment.findMany.mockResolvedValue([]);
    mockPrisma.program.findMany.mockResolvedValue([]);
    mockPrisma.program.count.mockResolvedValue(0);

    const res = await request(app)
      .get('/learner/discover?limit=999999')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.pagination.limit).toBeLessThanOrEqual(100);
  });
});
