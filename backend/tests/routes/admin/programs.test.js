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

// ---------- GET /admin/programs ----------

describe('GET /admin/programs', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/admin/programs');
    expect(res.status).toBe(401);
  });

  it('returns 403 for learner role', async () => {
    const token = mockAuthSession(mockPrisma, TEST_LEARNER);
    const res = await request(app)
      .get('/admin/programs')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(403);
  });

  it('returns 200 with paginated program list', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    mockPrisma.program.findMany.mockResolvedValue([
      {
        id: 'prog-1',
        name: 'Web Development',
        description: 'Learn web dev',
        thumbnailUrl: null,
        isPublished: true,
        isPublic: false,
        slug: 'web-development',
        price: 999,
        currency: 'INR',
        createdAt: new Date('2024-01-01'),
        _count: { enrollments: 5, lessons: 10 },
      },
    ]);
    mockPrisma.program.count.mockResolvedValue(1);
    mockPrisma.lesson.groupBy.mockResolvedValue([
      { programId: 'prog-1', _sum: { durationSeconds: 7200 } },
    ]);

    const res = await request(app)
      .get('/admin/programs')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.programs).toHaveLength(1);
    expect(res.body.data.programs[0].name).toBe('Web Development');
    expect(res.body.data.programs[0].learnerCount).toBe(5);
    expect(res.body.data.programs[0].lessonCount).toBe(10);
    expect(res.body.data.programs[0].totalDurationHours).toBe(2);
    expect(res.body.data.pagination).toBeDefined();
    expect(res.body.data.pagination.total).toBe(1);
  });

  it('returns all programs when all=true (no pagination)', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    mockPrisma.program.findMany.mockResolvedValue([]);
    mockPrisma.program.count.mockResolvedValue(0);
    mockPrisma.lesson.groupBy.mockResolvedValue([]);

    const res = await request(app)
      .get('/admin/programs?all=true')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.pagination).toBeNull();
  });
});

// ---------- POST /admin/programs ----------

describe('POST /admin/programs', () => {
  it('returns 400 when name is missing', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    const res = await request(app)
      .post('/admin/programs')
      .set('Cookie', `token=${token}`)
      .send({ description: 'No name provided' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toBe('Program name required');
  });

  it('returns 400 when name exceeds 200 characters', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    const res = await request(app)
      .post('/admin/programs')
      .set('Cookie', `token=${token}`)
      .send({ name: 'x'.repeat(201) });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when slug is already taken', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    // The route calls program.findUnique to check slug uniqueness
    mockPrisma.program.findUnique.mockResolvedValue({ id: 'existing-prog', slug: 'web-dev' });

    const res = await request(app)
      .post('/admin/programs')
      .set('Cookie', `token=${token}`)
      .send({ name: 'Web Dev', slug: 'web-dev' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('SLUG_TAKEN');
  });

  it('returns 201 and creates program successfully', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    // Slug check returns null (not taken)
    mockPrisma.program.findUnique.mockResolvedValue(null);

    const createdProgram = {
      id: 'new-prog-id',
      name: 'React Bootcamp',
      description: 'Learn React',
      slug: 'react-bootcamp',
      isPublished: false,
      isPublic: false,
      price: null,
      currency: 'INR',
    };
    mockPrisma.program.create.mockResolvedValue(createdProgram);

    const res = await request(app)
      .post('/admin/programs')
      .set('Cookie', `token=${token}`)
      .send({ name: 'React Bootcamp', description: 'Learn React' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.program.name).toBe('React Bootcamp');
    expect(mockPrisma.program.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'React Bootcamp',
          description: 'Learn React',
          slug: 'react-bootcamp',
        }),
      })
    );
  });

  it('auto-generates slug from name when slug not provided', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    mockPrisma.program.findUnique.mockResolvedValue(null);
    mockPrisma.program.create.mockResolvedValue({
      id: 'new-id',
      name: 'My Cool Program!',
      slug: 'my-cool-program',
    });

    const res = await request(app)
      .post('/admin/programs')
      .set('Cookie', `token=${token}`)
      .send({ name: 'My Cool Program!' });

    expect(res.status).toBe(201);
    expect(mockPrisma.program.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: 'my-cool-program',
        }),
      })
    );
  });
});

// ---------- GET /admin/programs/:id ----------

describe('GET /admin/programs/:id', () => {
  it('returns 404 when program not found', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    mockPrisma.program.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/admin/programs/nonexistent-id')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 200 with program and content tree', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    const now = new Date();
    mockPrisma.program.findUnique.mockResolvedValue({
      id: 'prog-1',
      name: 'Web Development',
      description: 'Full stack course',
      thumbnailUrl: null,
      isPublished: true,
      isPublic: false,
      slug: 'web-development',
      price: 999,
      currency: 'INR',
      publishedAt: now,
      updatedAt: now,
      topics: [
        {
          id: 'topic-1',
          name: 'HTML Basics',
          orderIndex: 0,
          subtopics: [],
          lessons: [
            {
              id: 'lesson-1',
              title: 'Intro to HTML',
              type: 'VIDEO',
              contentUrl: 'https://example.com/video',
              contentText: null,
              instructorNotes: null,
              thumbnailUrl: null,
              durationSeconds: 600,
              orderIndex: 0,
              isFree: false,
              attachments: [],
            },
          ],
        },
      ],
      lessons: [],
    });

    const res = await request(app)
      .get('/admin/programs/prog-1')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.program.name).toBe('Web Development');
    expect(res.body.data.content).toHaveLength(1);
    expect(res.body.data.content[0].type).toBe('topic');
    expect(res.body.data.content[0].children).toHaveLength(1);
    expect(res.body.data.content[0].children[0].type).toBe('lesson');
  });

  it('includes hasUnpublishedChanges when updatedAt > publishedAt', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    const publishedAt = new Date('2024-01-01');
    const updatedAt = new Date('2024-01-15');
    mockPrisma.program.findUnique.mockResolvedValue({
      id: 'prog-1',
      name: 'Test',
      description: null,
      thumbnailUrl: null,
      isPublished: true,
      isPublic: false,
      slug: 'test',
      price: null,
      currency: 'INR',
      publishedAt,
      updatedAt,
      topics: [],
      lessons: [],
    });

    const res = await request(app)
      .get('/admin/programs/prog-1')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.program.hasUnpublishedChanges).toBe(true);
  });
});

// ---------- PUT /admin/programs/:id ----------

describe('PUT /admin/programs/:id', () => {
  it('returns 200 and updates program fields', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    // Slug uniqueness check — no conflict
    mockPrisma.program.findUnique.mockResolvedValue(null);

    const updatedProgram = {
      id: 'prog-1',
      name: 'Updated Name',
      description: 'Updated description',
      slug: 'updated-name',
    };
    mockPrisma.program.update.mockResolvedValue(updatedProgram);

    const res = await request(app)
      .put('/admin/programs/prog-1')
      .set('Cookie', `token=${token}`)
      .send({ name: 'Updated Name', description: 'Updated description', slug: 'updated-name' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.program.name).toBe('Updated Name');
    expect(mockPrisma.program.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'prog-1' },
      })
    );
  });

  it('returns 400 when slug is taken by another program', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    // Slug exists but belongs to a different program
    mockPrisma.program.findUnique.mockResolvedValue({ id: 'other-prog', slug: 'taken-slug' });

    const res = await request(app)
      .put('/admin/programs/prog-1')
      .set('Cookie', `token=${token}`)
      .send({ slug: 'taken-slug' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('SLUG_TAKEN');
  });

  it('allows same slug if it belongs to the same program', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    // Slug exists and belongs to the same program being updated
    mockPrisma.program.findUnique.mockResolvedValue({ id: 'prog-1', slug: 'my-slug' });
    mockPrisma.program.update.mockResolvedValue({ id: 'prog-1', name: 'Same', slug: 'my-slug' });

    const res = await request(app)
      .put('/admin/programs/prog-1')
      .set('Cookie', `token=${token}`)
      .send({ slug: 'my-slug' });

    expect(res.status).toBe(200);
    expect(mockPrisma.program.update).toHaveBeenCalled();
  });
});

// ---------- POST /admin/programs/:id/publish ----------

describe('POST /admin/programs/:id/publish', () => {
  it('publishes a program (sets isPublished=true)', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    mockPrisma.program.update.mockResolvedValue({
      id: 'prog-1',
      isPublished: true,
      publishedAt: new Date(),
    });

    const res = await request(app)
      .post('/admin/programs/prog-1/publish')
      .set('Cookie', `token=${token}`)
      .send({ isPublished: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Program published');
    expect(mockPrisma.program.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'prog-1' },
        data: expect.objectContaining({
          isPublished: true,
          publishedAt: expect.any(Date),
        }),
      })
    );
  });

  it('unpublishes a program (sets isPublished=false)', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    mockPrisma.program.update.mockResolvedValue({
      id: 'prog-1',
      isPublished: false,
      publishedAt: null,
    });

    const res = await request(app)
      .post('/admin/programs/prog-1/publish')
      .set('Cookie', `token=${token}`)
      .send({ isPublished: false });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Program unpublished');
    // When unpublishing, publishedAt should NOT be set
    expect(mockPrisma.program.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { isPublished: false },
      })
    );
  });
});

// ---------- DELETE /admin/programs/:id ----------

describe('DELETE /admin/programs/:id', () => {
  it('deletes program and returns success', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    mockPrisma.program.findUnique.mockResolvedValue({
      name: 'Test Program',
      thumbnailUrl: null,
      lessons: [],
    });
    mockPrisma.program.delete.mockResolvedValue({ id: 'prog-1' });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const res = await request(app)
      .delete('/admin/programs/prog-1')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Program and all content deleted');
    expect(mockPrisma.program.delete).toHaveBeenCalledWith({ where: { id: 'prog-1' } });
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'DELETE_PROGRAM',
          targetType: 'Program',
          targetId: 'prog-1',
        }),
      })
    );
  });

  it('still succeeds when program.findUnique returns null (cascade delete)', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    mockPrisma.program.findUnique.mockResolvedValue(null);
    mockPrisma.program.delete.mockResolvedValue({ id: 'prog-1' });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const res = await request(app)
      .delete('/admin/programs/prog-1')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('creates audit log entry on delete', async () => {
    const token = mockAuthSession(mockPrisma, TEST_ADMIN);
    mockPrisma.program.findUnique.mockResolvedValue({
      name: 'Deleted Program',
      thumbnailUrl: null,
      lessons: [],
    });
    mockPrisma.program.delete.mockResolvedValue({});
    mockPrisma.auditLog.create.mockResolvedValue({});

    await request(app)
      .delete('/admin/programs/prog-1')
      .set('Cookie', `token=${token}`);

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          adminId: TEST_ADMIN.id,
          adminEmail: TEST_ADMIN.email,
          action: 'DELETE_PROGRAM',
          details: { name: 'Deleted Program' },
        }),
      })
    );
  });
});
