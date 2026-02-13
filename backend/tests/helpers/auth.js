// Auth test helpers — generate tokens and set up mock auth middleware responses
const jwt = require('jsonwebtoken');

const TEST_ADMIN = {
  id: 'admin-id-1',
  email: 'admin@test.com',
  name: 'Test Admin',
  role: 'ADMIN',
  status: 'ACTIVE',
};

const TEST_LEARNER = {
  id: 'learner-id-1',
  email: 'learner@test.com',
  name: 'Test Learner',
  role: 'LEARNER',
  status: 'ACTIVE',
};

/**
 * Generate a valid JWT for testing
 */
function generateTestToken(userId, role) {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

/**
 * Set up the Prisma mocks needed for the authenticate middleware to pass.
 * Call this before each request that hits an authenticated endpoint.
 */
function mockAuthSession(mockPrisma, user) {
  const token = generateTestToken(user.id, user.role);

  // authenticate middleware looks up the session by token
  mockPrisma.userSession.findUnique.mockResolvedValue({
    id: 'session-id-1',
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  // then looks up the user
  mockPrisma.user.findUnique.mockResolvedValue({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
  });

  // fire-and-forget lastActive update
  mockPrisma.userSession.update.mockResolvedValue({});

  return token;
}

module.exports = {
  TEST_ADMIN,
  TEST_LEARNER,
  generateTestToken,
  mockAuthSession,
};
