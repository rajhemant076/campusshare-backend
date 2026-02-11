const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

// All admin routes require authentication and admin role
router.use(authMiddleware, adminMiddleware);

// Dashboard stats
router.get('/stats', adminController.getDashboardStats);

// Resource management
router.get('/resources/pending', adminController.getPendingResources);
router.get('/resources/approved', adminController.getApprovedResources);
router.get('/resources/rejected', adminController.getRejectedResources);
router.put('/resources/:id/approve', adminController.approveResource);
router.put('/resources/:id/reject', adminController.rejectResource);
router.delete('/resources/:id', adminController.deleteResource);

// User management
router.get('/users', adminController.getAllUsers);
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;