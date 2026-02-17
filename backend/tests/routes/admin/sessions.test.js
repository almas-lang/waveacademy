const request = require('supertest');
const createApp = require('../../../src/app');
const { createMockPrisma } = require('../../helpers/mock-prisma');
const { TEST_ADMIN, TEST_LEARNER, mockAuthSession } = require('../../helpers/auth');

jest.mock('../../../src/utils/email', () => ({
  sendPasswordSetupEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendSessionReminderEmail: jest.fn(),
}));
jest.mock('../../../src/utils/cache', () => ({
  cacheGet: (_key, fn) => fn(),
  cacheDel: jest.fn(),
}));
jest.mock('../../../src/utils/r2', () => ({
  deleteR2File: jest.fn().mockResolvedValue(undefined),
  deleteR2Files: jest.fn().mockResolvedValue(undefined),
}));

let app;
let mockPrisma;

beforeEach(() => {
  mockPrisma = createMockPrisma();
  app = createApp(mockPrisma);
});

const MOCK_SESSION = {
  id: 'session-1',
  name: 'Live Q&A',
  description: 'Weekly Q&A session',
  startTime: new Date('2026-03-01T10:00:00Z'),
  endTime: new Date('2026-03-01T11:00:00Z'),
  meetLink: 'https://meet.google.com/abc-defg-hij',
  isRecurring: false,
  recurrenceRule: null,
  sessionPrograms: [
    {
      id: 'sp-1',
      programId: 'prog-1',
      program: { id: 'prog-1', name: 'Web Development' },
    },
  ],
};

// ---------- GET /admin/sessions ----------

describe('GET /admin/sessions', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/admin/sessions');
    expect(res.status).toBe(401);
  });

  it('returns 403 for learner role', async () => {
    const token = mockAuthSession(mockPrisma, TEST_LEARNER);
    const res = await request(app)
      .get('/admin/sessions')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(403);
  });

  it('returns 200 with sessions list', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    mockPrisma.session.findMany.mockResolvedValue([MOCK_SESSION]);

    const res = await request(app)
      .get('/admin/sessions')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sessions).toHaveLength(1);
    expect(res.body.data.sessions[0].name).toBe('Live Q&A');
    expect(res.body.data.sessions[0].programs).toEqual(['Web Development']);
    expect(res.body.data.pagination).toBeDefined();
  });

  it('returns sessions filtered by date range', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    mockPrisma.session.findMany.mockResolvedValue([MOCK_SESSION]);

    const res = await request(app)
      .get('/admin/sessions?from=2026-03-01&to=2026-03-31')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.sessions).toHaveLength(1);
    // Verify findMany was called with date range filters
    expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.any(Array),
        }),
      })
    );
  });

  it('shows "All Programs" for sessions with no program associations', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    mockPrisma.session.findMany.mockResolvedValue([
      {
        ...MOCK_SESSION,
        sessionPrograms: [],
      },
    ]);

    const res = await request(app)
      .get('/admin/sessions')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.sessions[0].programs).toEqual(['All Programs']);
  });
});

// ---------- POST /admin/sessions ----------

describe('POST /admin/sessions', () => {
  it('returns 400 when name is missing', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    const res = await request(app)
      .post('/admin/sessions')
      .set('Cookie', `token=${token}`)
      .send({ startTime: '2026-03-01T10:00:00Z' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toBe('Name and start time required');
  });

  it('returns 400 when startTime is missing', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    const res = await request(app)
      .post('/admin/sessions')
      .set('Cookie', `token=${token}`)
      .send({ name: 'Test Session' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 201 and creates session with program links', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    mockPrisma.session.create.mockResolvedValue({
      ...MOCK_SESSION,
      id: 'new-session-id',
    });
    // Mock the fire-and-forget notification lookups
    mockPrisma.enrollment.findMany.mockResolvedValue([]);

    const res = await request(app)
      .post('/admin/sessions')
      .set('Cookie', `token=${token}`)
      .send({
        name: 'Live Q&A',
        description: 'Weekly Q&A session',
        startTime: '2026-03-01T10:00:00Z',
        endTime: '2026-03-01T11:00:00Z',
        meetLink: 'https://meet.google.com/abc-defg-hij',
        programIds: ['prog-1'],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.session.name).toBe('Live Q&A');
    expect(mockPrisma.session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Live Q&A',
          startTime: expect.any(Date),
          sessionPrograms: {
            create: [{ programId: 'prog-1' }],
          },
        }),
      })
    );
  });

  it('creates session for all programs when programIds is empty', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    mockPrisma.session.create.mockResolvedValue({
      ...MOCK_SESSION,
      sessionPrograms: [{ programId: null, program: null }],
    });
    mockPrisma.enrollment.findMany.mockResolvedValue([]);

    const res = await request(app)
      .post('/admin/sessions')
      .set('Cookie', `token=${token}`)
      .send({
        name: 'General Session',
        startTime: '2026-03-01T10:00:00Z',
        programIds: [],
      });

    expect(res.status).toBe(201);
    expect(mockPrisma.session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sessionPrograms: {
            create: [{ programId: null }],
          },
        }),
      })
    );
  });

  it('creates session with recurring configuration', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    mockPrisma.session.create.mockResolvedValue({
      ...MOCK_SESSION,
      isRecurring: true,
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
    });
    mockPrisma.enrollment.findMany.mockResolvedValue([]);

    const res = await request(app)
      .post('/admin/sessions')
      .set('Cookie', `token=${token}`)
      .send({
        name: 'Recurring Session',
        startTime: '2026-03-01T10:00:00Z',
        isRecurring: true,
        recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
      });

    expect(res.status).toBe(201);
    expect(mockPrisma.session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isRecurring: true,
          recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
        }),
      })
    );
  });
});

// ---------- GET /admin/sessions/:id ----------

describe('GET /admin/sessions/:id', () => {
  it('returns 404 when session not found', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    mockPrisma.session.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/admin/sessions/nonexistent-id')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toBe('Session not found');
  });

  it('returns 200 with session details and program associations', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    mockPrisma.session.findUnique.mockResolvedValue(MOCK_SESSION);

    const res = await request(app)
      .get('/admin/sessions/session-1')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.session.name).toBe('Live Q&A');
    expect(res.body.data.session.sessionPrograms).toHaveLength(1);
    expect(res.body.data.session.sessionPrograms[0].program.name).toBe('Web Development');
  });
});

// ---------- PUT /admin/sessions/:id ----------

describe('PUT /admin/sessions/:id', () => {
  it('returns 200 and updates session fields', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    // findUnique for getting old session (to compare changes)
    mockPrisma.session.findUnique.mockResolvedValue({
      ...MOCK_SESSION,
      sessionPrograms: [{ programId: 'prog-1' }],
    });
    mockPrisma.session.update.mockResolvedValue({
      ...MOCK_SESSION,
      name: 'Updated Session Name',
    });

    const res = await request(app)
      .put('/admin/sessions/session-1')
      .set('Cookie', `token=${token}`)
      .send({ name: 'Updated Session Name' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.session.name).toBe('Updated Session Name');
    expect(mockPrisma.session.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'session-1' },
        data: expect.objectContaining({ name: 'Updated Session Name' }),
      })
    );
  });

  it('updates program associations when programIds provided', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    mockPrisma.session.findUnique.mockResolvedValue({
      ...MOCK_SESSION,
      sessionPrograms: [{ programId: 'prog-1' }],
    });
    mockPrisma.session.update.mockResolvedValue(MOCK_SESSION);
    mockPrisma.sessionProgram.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.sessionProgram.createMany.mockResolvedValue({ count: 2 });

    const res = await request(app)
      .put('/admin/sessions/session-1')
      .set('Cookie', `token=${token}`)
      .send({ programIds: ['prog-1', 'prog-2'] });

    expect(res.status).toBe(200);
    expect(mockPrisma.sessionProgram.deleteMany).toHaveBeenCalledWith({
      where: { sessionId: 'session-1' },
    });
    expect(mockPrisma.sessionProgram.createMany).toHaveBeenCalledWith({
      data: [
        { sessionId: 'session-1', programId: 'prog-1' },
        { sessionId: 'session-1', programId: 'prog-2' },
      ],
    });
  });

  it('sets programId null when programIds is empty array (all programs)', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    mockPrisma.session.findUnique.mockResolvedValue({
      ...MOCK_SESSION,
      sessionPrograms: [{ programId: 'prog-1' }],
    });
    mockPrisma.session.update.mockResolvedValue(MOCK_SESSION);
    mockPrisma.sessionProgram.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.sessionProgram.createMany.mockResolvedValue({ count: 1 });

    const res = await request(app)
      .put('/admin/sessions/session-1')
      .set('Cookie', `token=${token}`)
      .send({ programIds: [] });

    expect(res.status).toBe(200);
    expect(mockPrisma.sessionProgram.createMany).toHaveBeenCalledWith({
      data: [{ sessionId: 'session-1', programId: null }],
    });
  });
});

// ---------- DELETE /admin/sessions/:id ----------

describe('DELETE /admin/sessions/:id', () => {
  it('returns 404 when session not found', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    mockPrisma.session.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete('/admin/sessions/nonexistent-id')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('deletes session and returns success', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    mockPrisma.session.findUnique.mockResolvedValue({
      ...MOCK_SESSION,
      sessionPrograms: [{ programId: 'prog-1' }],
    });
    mockPrisma.session.delete.mockResolvedValue({ id: 'session-1' });
    mockPrisma.enrollment.findMany.mockResolvedValue([]);

    const res = await request(app)
      .delete('/admin/sessions/session-1')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Session deleted');
    expect(mockPrisma.session.delete).toHaveBeenCalledWith({ where: { id: 'session-1' } });
  });

  it('excludes date instead of deleting for recurring session with single mode', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    mockPrisma.session.findUnique.mockResolvedValue({
      ...MOCK_SESSION,
      isRecurring: true,
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO',
      excludedDates: [],
      sessionPrograms: [{ programId: 'prog-1' }],
    });
    mockPrisma.session.update.mockResolvedValue({});

    const res = await request(app)
      .delete('/admin/sessions/session-1?deleteMode=single&occurrenceDate=2026-03-01T10:00:00Z')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Session occurrence removed');
    expect(mockPrisma.session.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'session-1' },
        data: { excludedDates: ['2026-03-01'] },
      })
    );
    // Should NOT call session.delete for single occurrence removal
    expect(mockPrisma.session.delete).not.toHaveBeenCalled();
  });

  it('fully deletes recurring session with deleteMode=all (or no deleteMode)', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    mockPrisma.session.findUnique.mockResolvedValue({
      ...MOCK_SESSION,
      isRecurring: true,
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO',
      sessionPrograms: [{ programId: 'prog-1' }],
    });
    mockPrisma.session.delete.mockResolvedValue({ id: 'session-1' });
    mockPrisma.enrollment.findMany.mockResolvedValue([]);

    const res = await request(app)
      .delete('/admin/sessions/session-1')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Session deleted');
    expect(mockPrisma.session.delete).toHaveBeenCalled();
  });
});

// ---------- GET /admin/sessions/dashboard/today ----------

describe('GET /admin/sessions/dashboard/today', () => {
  it('returns 200 with today\'s sessions', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    mockPrisma.session.findMany.mockResolvedValue([MOCK_SESSION]);

    const res = await request(app)
      .get('/admin/sessions/dashboard/today')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sessions).toHaveLength(1);
  });

  it('returns empty array when no sessions today', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    mockPrisma.session.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/admin/sessions/dashboard/today')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.sessions).toHaveLength(0);
  });
});
