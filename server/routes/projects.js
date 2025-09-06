
const router = require('express').Router();

// GET /api/projects
router.get('/', (req, res) => {
  res.json([{ id: 1, name: 'Project Alpha' }, { id: 2, name: 'Project Beta' }]);
});

module.exports = router;
