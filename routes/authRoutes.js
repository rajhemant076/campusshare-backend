const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Public routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);

// Protected routes
router.get('/me', authMiddleware, authController.getProfile);
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;