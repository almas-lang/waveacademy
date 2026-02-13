const request = require('supertest');
const bcrypt = require('bcryptjs');
const createApp = require('../../src/app');
const { createMockPrisma } = require('../helpers/mock-prisma');
const { TEST_ADMIN, TEST_LEARNER, mockAuthSession } = require('../helpers/auth');

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

// ---------- POST /auth/login ----------

describe('POST /auth/login', () => {
  const validPassword = 'Test1234!';
  let passwordHash;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(validPassword, 4);
  });

  it('returns 400 when email or password missing', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'a@b.com' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 when user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'no@one.com', password: validPassword });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when password not set', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      ...TEST_LEARNER,
      passwordHash: null,
    });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: TEST_LEARNER.email, password: validPassword });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('PASSWORD_NOT_SET');
  });

  it('returns 403 when account inactive', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      ...TEST_LEARNER,
      passwordHash,
      status: 'INACTIVE',
    });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: TEST_LEARNER.email, password: validPassword });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 401 when password wrong', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      ...TEST_LEARNER,
      passwordHash,
    });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: TEST_LEARNER.email, password: 'WrongPass1!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 200 and sets cookie on successful login', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      ...TEST_LEARNER,
      passwordHash,
    });

    // $transaction mock — need a tx object with its own methods
    const txMock = {
      userSession: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(txMock));

    const res = await request(app)
      .post('/auth/login')
      .send({ email: TEST_LEARNER.email, password: validPassword });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(TEST_LEARNER.email);
    // Cookie should be set
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toMatch(/token=/);
  });

  it('returns 403 when max sessions reached', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      ...TEST_LEARNER,
      passwordHash,
    });

    const txMock = {
      userSession: {
        count: jest.fn().mockResolvedValue(2),
        create: jest.fn(),
      },
    };
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(txMock));

    const res = await request(app)
      .post('/auth/login')
      .send({ email: TEST_LEARNER.email, password: validPassword });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('MAX_SESSIONS_REACHED');
  });
});

// ---------- POST /auth/logout ----------

describe('POST /auth/logout', () => {
  it('returns 200 and clears cookie when logged in', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    mockPrisma.userSession.delete.mockResolvedValue({});

    const res = await request(app)
      .post('/auth/logout')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockPrisma.userSession.delete).toHaveBeenCalled();
  });

  it('returns 200 even without a token', async () => {
    const res = await request(app)
      .post('/auth/logout');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ---------- POST /auth/change-password ----------

describe('POST /auth/change-password', () => {
  const currentPassword = 'OldPass1!';
  const newPassword = 'NewPass1!';
  let currentHash;

  beforeAll(async () => {
    currentHash = await bcrypt.hash(currentPassword, 4);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/auth/change-password')
      .send({ currentPassword, newPassword, confirmPassword: newPassword });

    expect(res.status).toBe(401);
  });

  it('returns 400 when fields missing', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);

    const res = await request(app)
      .post('/auth/change-password')
      .set('Cookie', `token=${token}`)
      .send({ currentPassword });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when new password too weak', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);

    const res = await request(app)
      .post('/auth/change-password')
      .set('Cookie', `token=${token}`)
      .send({ currentPassword, newPassword: 'weak', confirmPassword: 'weak' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 when current password wrong', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);

    // After auth middleware resolves, change-password does its own findUnique for the full user
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({ ...TEST_ADMIN }) // authenticate middleware
      .mockResolvedValueOnce({ ...TEST_ADMIN, passwordHash: currentHash }); // change-password handler

    const res = await request(app)
      .post('/auth/change-password')
      .set('Cookie', `token=${token}`)
      .send({
        currentPassword: 'WrongPass1!',
        newPassword,
        confirmPassword: newPassword,
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_PASSWORD');
  });

  it('returns 200 on success', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);

    mockPrisma.user.findUnique
      .mockResolvedValueOnce({ ...TEST_ADMIN }) // authenticate middleware
      .mockResolvedValueOnce({ ...TEST_ADMIN, passwordHash: currentHash }); // change-password handler

    mockPrisma.user.update.mockResolvedValue({});

    const res = await request(app)
      .post('/auth/change-password')
      .set('Cookie', `token=${token}`)
      .send({
        currentPassword,
        newPassword,
        confirmPassword: newPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockPrisma.user.update).toHaveBeenCalled();
  });
});
