const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  listMenuItems,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} = require('../controllers/menuController');

router.get('/', listMenuItems);
router.get('/:id', getMenuItem);
router.post('/', requireAuth, createMenuItem);
router.put('/:id', requireAuth, updateMenuItem);
router.delete('/:id', requireAuth, deleteMenuItem);

module.exports = router;
