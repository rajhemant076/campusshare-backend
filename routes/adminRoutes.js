const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

// All admin routes require authentication and admin role
router.use(authMiddleware, adminMiddleware);

// ============================================
// DASHBOARD STATS
// ============================================
router.get('/stats', adminController.getDashboardStats);

// ============================================
// RESOURCE MANAGEMENT
// ============================================
router.get('/resources/pending', adminController.getPendingResources);
router.get('/resources/approved', adminController.getApprovedResources);
router.get('/resources/rejected', adminController.getRejectedResources);
router.put('/resources/:id/approve', adminController.approveResource);
router.put('/resources/:id/reject', adminController.rejectResource);
router.delete('/resources/:id', adminController.deleteResource);

// ============================================
// USER MANAGEMENT - UPDATED WITH FULL CRUD
// ============================================
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);              // ✅ NEW: Get single user
router.put('/users/:id', adminController.editUser);                 // ✅ NEW: Edit user
router.delete('/users/:id', adminController.deleteUser);            // Existing delete
router.put('/users/:id/reset-password', adminController.resetUserPassword); // ✅ NEW: Reset password
router.put('/users/:id/toggle-status', adminController.toggleUserStatus);   // ✅ NEW: Toggle status

module.exports = router;