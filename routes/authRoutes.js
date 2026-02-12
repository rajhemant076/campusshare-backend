const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// ============================================
// PUBLIC ROUTES - No authentication required
// ============================================
router.post('/signup', authController.signup);
router.post('/login', authController.login);

// ============================================
// PROTECTED ROUTES - Require valid JWT token
// All routes below use authMiddleware
// ============================================

// Get current user profile
router.get('/me', authMiddleware, authController.getProfile);

// ✅ UPDATE: Update user profile (name, branch, semester)
router.put('/profile', authMiddleware, authController.updateProfile);

// ✅ OPTIONAL: Change password (requires current password)
router.put('/change-password', authMiddleware, authController.changePassword);

// Logout (client-side token removal)
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;