
const router = require('express').Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  res.json({ message: 'Register route' });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  res.json({ message: 'Login route' });
});

module.exports = router;
