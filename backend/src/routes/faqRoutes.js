const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { listFaqs, createFaq, updateFaq, deleteFaq } = require('../controllers/faqController');

router.get('/', listFaqs);
router.post('/', requireAuth, createFaq);
router.put('/:id', requireAuth, updateFaq);
router.delete('/:id', requireAuth, deleteFaq);

module.exports = router;
