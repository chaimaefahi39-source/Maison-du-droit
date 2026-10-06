const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const authenticate = require('../middlewares/authenticate');

router.use(authenticate);

router.post('/', chatController.chat);
router.post('/chat', chatController.chat);
router.get('/history', chatController.getHistory);
router.delete('/history', chatController.clearHistory);
router.delete('/messages/:id', chatController.deleteMessage);

module.exports = router;
