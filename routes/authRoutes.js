const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// ============================================
// PUBLIC ROUTES - No authentication required
// ============================================

// Register new user
router.post('/signup', authController.signup);

// Login user
router.post('/login', authController.login);

// ✅ NEW: Get public user profile by ID (with privacy restrictions)
router.get('/user/:id', authController.getPublicProfile);

// ============================================
// PROTECTED ROUTES - Require valid JWT token
// All routes below use authMiddleware
// ============================================

// ✅ Get current user profile (full details)
router.get('/me', authMiddleware, authController.getProfile);

// ✅ UPDATE: Update user profile (ALL fields: name, branch, semester, phone, 
//   enrollmentId, graduationYear, college, bio, socialLinks, profileVisibility)
router.put('/profile', authMiddleware, authController.updateProfile);

// ✅ Change password (requires current password)
router.put('/change-password', authMiddleware, authController.changePassword);

// Logout (client-side token removal)
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;