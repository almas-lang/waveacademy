// Factory that creates a mock Prisma client with jest.fn() for every method

const methods = [
  'findUnique',
  'findFirst',
  'findMany',
  'create',
  'createMany',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'count',
  'groupBy',
  'upsert',
];

const models = [
  'user',
  'userSession',
  'program',
  'topic',
  'subtopic',
  'lesson',
  'lessonAttachment',
  'enrollment',
  'progress',
  'session',
  'sessionProgram',
  'notification',
  'payment',
  'emailLog',
  'auditLog',
];

function createMockPrisma() {
  const mock = {};

  for (const model of models) {
    mock[model] = {};
    for (const method of methods) {
      mock[model][method] = jest.fn();
    }
  }

  mock.$transaction = jest.fn(async (fnOrArray) => {
    if (typeof fnOrArray === 'function') {
      return fnOrArray(mock);
    }
    return Promise.all(fnOrArray);
  });
  mock.$queryRaw = jest.fn();
  mock.$disconnect = jest.fn();

  return mock;
}

module.exports = { createMockPrisma };
