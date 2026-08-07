const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validateRegister, validateLogin } = require('../middlewares/validateAuth');
const authenticate = require('../middlewares/authenticate');

router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);
router.put('/profile', authenticate, authController.updateProfile);
router.get('/me', authenticate, authController.getMe);

module.exports = router;
