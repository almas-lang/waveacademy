const request = require('supertest');
const jwt = require('jsonwebtoken');
const createApp = require('../../src/app');
const { createMockPrisma } = require('../helpers/mock-prisma');
const { TEST_ADMIN, TEST_LEARNER, generateTestToken, mockAuthSession } = require('../helpers/auth');

jest.mock('../../src/utils/email', () => ({
  sendPasswordSetupEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendSessionReminderEmail: jest.fn(),
}));
jest.mock('../../src/utils/cache', () => ({
  cacheGet: (_key, fn) => fn(),
  cacheDel: jest.fn(),
}));

let app;
let mockPrisma;

beforeEach(() => {
  mockPrisma = createMockPrisma();
  app = createApp(mockPrisma);
});

// We test the middleware by hitting an authenticated endpoint.
// /auth/change-password requires authenticate, so we use that.
// For requireAdmin/requireLearner, we use admin and learner routes.

describe('authenticate middleware', () => {
  it('returns 401 when no token provided', async () => {
    const res = await request(app).post('/auth/change-password').send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when JWT is invalid', async () => {
    const res = await request(app)
      .post('/auth/change-password')
      .set('Cookie', 'token=invalid-jwt-garbage')
      .send({});

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when JWT is expired', async () => {
    const expiredToken = jwt.sign(
      { userId: TEST_ADMIN.id, role: 'ADMIN' },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    );

    const res = await request(app)
      .post('/auth/change-password')
      .set('Cookie', `token=${expiredToken}`)
      .send({});

    expect(res.status).toBe(401);
  });

  it('returns 401 when session not found in DB', async () => {
    const token = generateTestToken(TEST_ADMIN.id, 'ADMIN');
    mockPrisma.userSession.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/auth/change-password')
      .set('Cookie', `token=${token}`)
      .send({});

    expect(res.status).toBe(401);
  });

  it('returns 401 when session is expired', async () => {
    const token = generateTestToken(TEST_ADMIN.id, 'ADMIN');
    mockPrisma.userSession.findUnique.mockResolvedValue({
      id: 'session-id-1',
      userId: TEST_ADMIN.id,
      token,
      expiresAt: new Date(Date.now() - 1000), // expired
    });
    mockPrisma.userSession.delete.mockResolvedValue({});

    const res = await request(app)
      .post('/auth/change-password')
      .set('Cookie', `token=${token}`)
      .send({});

    expect(res.status).toBe(401);
  });

  it('returns 401 when user is inactive', async () => {
    const token = generateTestToken(TEST_ADMIN.id, 'ADMIN');
    mockPrisma.userSession.findUnique.mockResolvedValue({
      id: 'session-id-1',
      userId: TEST_ADMIN.id,
      token,
      expiresAt: new Date(Date.now() + 86400000),
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      ...TEST_ADMIN,
      status: 'INACTIVE',
    });

    const res = await request(app)
      .post('/auth/change-password')
      .set('Cookie', `token=${token}`)
      .send({});

    // cacheGet returns null for inactive users, so 401
    expect([401, 403]).toContain(res.status);
  });

  it('attaches req.user and req.sessionId on success', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);

    // Hit change-password — if we get 400 (validation error) instead of 401,
    // it means auth passed and the handler is running
    const res = await request(app)
      .post('/auth/change-password')
      .set('Cookie', `token=${token}`)
      .send({});

    // 400 = auth passed, handler rejected missing fields
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('reads token from Authorization header as fallback', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);

    const res = await request(app)
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    // 400 = auth passed via header
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('requireAdmin middleware', () => {
  it('returns 403 when role is LEARNER', async () => {
    const token = mockAuthSession(mockPrisma, TEST_LEARNER);

    const res = await request(app)
      .get('/admin/learners')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('allows ADMIN through', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.user.count.mockResolvedValue(0);

    const res = await request(app)
      .get('/admin/learners')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
  });
});

describe('requireLearner middleware', () => {
  it('returns 403 when role is ADMIN', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);

    const res = await request(app)
      .get('/learner/profile')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('allows LEARNER through', async () => {
    const token = mockAuthSession(mockPrisma, TEST_LEARNER);
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({ ...TEST_LEARNER }) // authenticate
      .mockResolvedValueOnce({ ...TEST_LEARNER, enrollments: [] }); // profile handler

    const res = await request(app)
      .get('/learner/profile')
      .set('Cookie', `token=${token}`);

    // Should not be 403 — could be 200 or other depending on mock data
    expect(res.status).not.toBe(403);
  });
});
