const router = require('express').Router();
const prisma = require('../db');
const auth = require('../middleware/auth');

// GET /api/projects
router.get('/', auth, async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { ownerId: req.user.id },
    });
    res.json(projects);
  } catch (error) {
    res.status(500).send('Server error');
  }
});

module.exports = router;