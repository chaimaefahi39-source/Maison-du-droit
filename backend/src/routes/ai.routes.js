const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const authenticate = require('../middlewares/authenticate');

router.use(authenticate);

router.post('/chat', aiController.chat);
router.get('/history', aiController.getHistory);
router.delete('/history', aiController.clearHistory);
router.delete('/messages/:id', aiController.deleteMessage);

module.exports = router;
