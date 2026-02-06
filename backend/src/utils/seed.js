// Database Seed Script
// Creates initial admin user
// Run: npm run seed

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error('❌ ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required');
    process.exit(1);
  }

  if (adminPassword.length < 8) {
    console.error('❌ ADMIN_PASSWORD must be at least 8 characters');
    process.exit(1);
  }

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (existingAdmin) {
    console.log(`✓ Admin user already exists: ${adminEmail}`);
  } else {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: 'Admin',
        role: 'ADMIN',
        status: 'ACTIVE'
      }
    });

    console.log(`✓ Admin user created: ${adminEmail}`);
  }

  // Create sample programs (optional)
  const createSampleData = process.env.SEED_SAMPLE_DATA === 'true';

  if (createSampleData) {
    console.log('Creating sample programs...');

    const programs = [
      { name: 'Ripple', description: 'Beginner mindfulness program' },
      { name: 'Current', description: 'Intermediate practices' },
      { name: 'Tide', description: 'Advanced transformation' }
    ];

    for (const program of programs) {
      const existing = await prisma.program.findFirst({
        where: { name: program.name }
      });

      if (!existing) {
        await prisma.program.create({
          data: program
        });
        console.log(`✓ Created program: ${program.name}`);
      }
    }
  }

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
