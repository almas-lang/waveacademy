// Reusable test data fixtures

const PROGRAM_1 = {
  id: 'program-id-1',
  name: 'Web Development',
  description: 'Learn web development',
  status: 'PUBLISHED',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const PROGRAM_2 = {
  id: 'program-id-2',
  name: 'Data Science',
  description: 'Learn data science',
  status: 'PUBLISHED',
  createdAt: new Date('2024-02-01'),
  updatedAt: new Date('2024-02-01'),
};

const ENROLLMENT_1 = {
  id: 'enrollment-id-1',
  userId: 'learner-id-1',
  programId: 'program-id-1',
  program: { name: 'Web Development' },
};

const LEARNER_WITH_ENROLLMENTS = {
  id: 'learner-id-1',
  email: 'learner@test.com',
  name: 'Test Learner',
  mobile: '+1234567890',
  status: 'ACTIVE',
  role: 'LEARNER',
  registrationNumber: 'REG001',
  createdAt: new Date('2024-01-15'),
  enrollments: [ENROLLMENT_1],
};

module.exports = {
  PROGRAM_1,
  PROGRAM_2,
  ENROLLMENT_1,
  LEARNER_WITH_ENROLLMENTS,
};
