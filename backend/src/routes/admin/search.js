const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../../middleware/auth');

// Apply auth to all routes
router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /admin/search
 * Search across programs, learners, and lessons
 */
router.get('/', async (req, res, next) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({ results: [] });
    }

    const searchTerm = q.trim().toLowerCase();
    const resultLimit = Math.min(parseInt(limit), 20);

    // Search programs
    const programs = await req.prisma.program.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        description: true,
        _count: { select: { lessons: true, enrollments: true } }
      },
      take: resultLimit
    });

    // Search learners
    const learners = await req.prisma.user.findMany({
      where: {
        role: 'LEARNER',
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true
      },
      take: resultLimit
    });

    // Search lessons
    const lessons = await req.prisma.lesson.findMany({
      where: {
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { contentText: { contains: searchTerm, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        title: true,
        type: true,
        programId: true,
        program: {
          select: { name: true }
        }
      },
      take: resultLimit
    });

    // Format results
    const results = [
      ...programs.map(p => ({
        id: p.id,
        type: 'program',
        title: p.name,
        subtitle: `${p._count.lessons} lessons • ${p._count.enrollments} learners`,
        href: `/admin/programs/${p.id}`
      })),
      ...learners.map(l => ({
        id: l.id,
        type: 'learner',
        title: l.name,
        subtitle: l.email,
        href: `/admin/learners/${l.id}`
      })),
      ...lessons.map(l => ({
        id: l.id,
        type: 'lesson',
        title: l.title,
        subtitle: `${l.type} in ${l.program.name}`,
        href: `/admin/programs/${l.programId}`,
        programId: l.programId
      }))
    ];

    res.json({ results: results.slice(0, resultLimit * 2) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
