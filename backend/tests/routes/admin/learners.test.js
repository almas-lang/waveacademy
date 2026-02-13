const request = require('supertest');
const createApp = require('../../../src/app');
const { createMockPrisma } = require('../../helpers/mock-prisma');
const { TEST_ADMIN, TEST_LEARNER, mockAuthSession } = require('../../helpers/auth');
const { LEARNER_WITH_ENROLLMENTS } = require('../../helpers/fixtures');

jest.mock('../../../src/utils/email', () => ({
  sendPasswordSetupEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendSessionReminderEmail: jest.fn(),
}));
jest.mock('../../../src/utils/cache', () => ({
  cacheGet: (_key, fn) => fn(),
  cacheDel: jest.fn(),
}));

let app;
let mockPrisma;

beforeEach(() => {
  mockPrisma = createMockPrisma();
  app = createApp(mockPrisma);
});

// ---------- GET /admin/learners ----------

describe('GET /admin/learners', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/admin/learners');
    expect(res.status).toBe(401);
  });

  it('returns 403 for learner role', async () => {
    const token = mockAuthSession(mockPrisma, TEST_LEARNER);
    const res = await request(app)
      .get('/admin/learners')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(403);
  });

  it('returns 200 with paginated list', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    mockPrisma.user.findMany.mockResolvedValue([LEARNER_WITH_ENROLLMENTS]);
    mockPrisma.user.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/admin/learners')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.learners).toHaveLength(1);
    expect(res.body.data.learners[0].email).toBe('learner@test.com');
    expect(res.body.data.pagination).toBeDefined();
    expect(res.body.data.pagination.total).toBe(1);
  });
});

// ---------- POST /admin/learners ----------

describe('POST /admin/learners', () => {
  it('returns 400 when name or email missing', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    const res = await request(app)
      .post('/admin/learners')
      .set('Cookie', `token=${token}`)
      .send({ email: 'new@test.com' }); // name missing

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 409 when email already exists', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    // First findUnique call is from auth, second from the handler
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({ ...TEST_ADMIN }) // auth
      .mockResolvedValueOnce({ id: 'existing' }); // email check

    const res = await request(app)
      .post('/admin/learners')
      .set('Cookie', `token=${token}`)
      .send({ email: 'existing@test.com', name: 'Existing User' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_EXISTS');
  });

  it('returns 201 and creates learner successfully', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({ ...TEST_ADMIN }) // auth
      .mockResolvedValueOnce(null); // email not taken

    mockPrisma.user.create.mockResolvedValue({
      id: 'new-learner-id',
      email: 'new@test.com',
      name: 'New Learner',
      status: 'PENDING_SETUP',
      role: 'LEARNER',
      enrollments: [],
    });

    const res = await request(app)
      .post('/admin/learners')
      .set('Cookie', `token=${token}`)
      .send({ email: 'new@test.com', name: 'New Learner' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.learner.email).toBe('new@test.com');
    expect(res.body.data.setupLink).toBeDefined();
  });
});

// ---------- POST /admin/learners/:id/enroll ----------

describe('POST /admin/learners/:id/enroll', () => {
  it('returns 200 and enrolls learner', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    mockPrisma.enrollment.create.mockResolvedValue({
      id: 'enrollment-new',
      userId: 'learner-id-1',
      programId: 'program-id-1',
    });

    const res = await request(app)
      .post('/admin/learners/learner-id-1/enroll')
      .set('Cookie', `token=${token}`)
      .send({ programId: 'program-id-1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 409 when already enrolled', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    // Prisma unique constraint error
    const error = new Error('Unique constraint failed');
    error.code = 'P2002';
    mockPrisma.enrollment.create.mockRejectedValue(error);

    const res = await request(app)
      .post('/admin/learners/learner-id-1/enroll')
      .set('Cookie', `token=${token}`)
      .send({ programId: 'program-id-1' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_ENROLLED');
  });
});

// ---------- PUT /admin/learners/:id/status ----------

describe('PUT /admin/learners/:id/status', () => {
  it('returns 200 and changes status', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    mockPrisma.user.update.mockResolvedValue({
      ...TEST_LEARNER,
      status: 'INACTIVE',
    });

    const res = await request(app)
      .put('/admin/learners/learner-id-1/status')
      .set('Cookie', `token=${token}`)
      .send({ status: 'INACTIVE' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'learner-id-1' },
        data: { status: 'INACTIVE' },
      })
    );
  });

  it('returns 400 for invalid status', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);

    const res = await request(app)
      .put('/admin/learners/learner-id-1/status')
      .set('Cookie', `token=${token}`)
      .send({ status: 'INVALID' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
