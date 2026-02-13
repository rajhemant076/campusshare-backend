const Resource = require("../models/Resource");
const User = require("../models/User");
const mongoose = require("mongoose");

// ============================================
// DASHBOARD STATS
// ============================================
// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: "student" });
    const totalUploads = await Resource.countDocuments();
    const pendingApprovals = await Resource.countDocuments({ status: "pending" });
    const approvedResources = await Resource.countDocuments({ status: "approved" });
    const rejectedResources = await Resource.countDocuments({ status: "rejected" });

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalUploads,
        pendingApprovals,
        approvedResources,
        rejectedResources,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: "Server error fetching stats",
      error: error.message,
    });
  }
};

// ============================================
// RESOURCE MANAGEMENT
// ============================================
// @desc    Get pending resources
// @route   GET /api/admin/resources/pending
// @access  Private/Admin
exports.getPendingResources = async (req, res) => {
  try {
    const resources = await Resource.find({ status: "pending" })
      .populate("uploadedBy", "name email branch semester")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: resources.length,
      resources,
    });
  } catch (error) {
    console.error('Get pending resources error:', error);
    res.status(500).json({
      success: false,
      message: "Server error fetching pending resources",
      error: error.message,
    });
  }
};

// @desc    Get approved resources
// @route   GET /api/admin/resources/approved
// @access  Private/Admin
exports.getApprovedResources = async (req, res) => {
  try {
    const resources = await Resource.find({ status: "approved" })
      .populate("uploadedBy", "name email branch semester")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: resources.length,
      resources,
    });
  } catch (error) {
    console.error('Get approved resources error:', error);
    res.status(500).json({
      success: false,
      message: "Server error fetching approved resources",
      error: error.message,
    });
  }
};

// @desc    Get rejected resources
// @route   GET /api/admin/resources/rejected
// @access  Private/Admin
exports.getRejectedResources = async (req, res) => {
  try {
    const resources = await Resource.find({ status: "rejected" })
      .populate("uploadedBy", "name email branch semester")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: resources.length,
      resources,
    });
  } catch (error) {
    console.error('Get rejected resources error:', error);
    res.status(500).json({
      success: false,
      message: "Server error fetching rejected resources",
      error: error.message,
    });
  }
};

// @desc    Approve resource
// @route   PUT /api/admin/resources/:id/approve
// @access  Private/Admin
exports.approveResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    resource.status = "approved";
    resource.rejectionReason = "";
    await resource.save();

    res.json({
      success: true,
      message: "Resource approved successfully",
      resource,
    });
  } catch (error) {
    console.error('Approve resource error:', error);
    res.status(500).json({
      success: false,
      message: "Server error approving resource",
      error: error.message,
    });
  }
};

// @desc    Reject resource
// @route   PUT /api/admin/resources/:id/reject
// @access  Private/Admin
exports.rejectResource = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Please provide a rejection reason",
      });
    }

    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    resource.status = "rejected";
    resource.rejectionReason = reason;
    await resource.save();

    res.json({
      success: true,
      message: "Resource rejected",
      resource,
    });
  } catch (error) {
    console.error('Reject resource error:', error);
    res.status(500).json({
      success: false,
      message: "Server error rejecting resource",
      error: error.message,
    });
  }
};

// @desc    Delete resource (and file from GridFS)
// @route   DELETE /api/admin/resources/:id
// @access  Private/Admin
// @desc    Delete resource (and file from GridFS) - FIXED VERSION
// @route   DELETE /api/admin/resources/:id
// @access  Private/Admin
exports.deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    // ✅ FIXED: Delete file from GridFS with proper error handling
    if (resource.fileId) {
      try {
        const db = mongoose.connection.db;
        const bucket = new mongoose.mongo.GridFSBucket(db, {
          bucketName: "uploads"
        });
        
        const fileId = new mongoose.Types.ObjectId(resource.fileId);
        await bucket.delete(fileId);
        console.log(`✅ GridFS file deleted: ${resource.fileId}`);
      } catch (fileError) {
        console.error("⚠️ Error deleting GridFS file (continuing with resource deletion):", fileError.message);
        // Continue with resource deletion even if file delete fails
      }
    }

    await Resource.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Resource deleted successfully",
    });
  } catch (error) {
    console.error('Delete resource error:', error);
    res.status(500).json({
      success: false,
      message: "Server error deleting resource",
      error: error.message,
    });
  }
};

// ============================================
// USER MANAGEMENT - UPDATED WITH EDIT FUNCTIONALITY
// ============================================

// @desc    Get all users (students only)
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "student" })
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: "Server error fetching users",
      error: error.message,
    });
  }
};

// ✅ NEW: Get single user by ID (for editing)
// @route   GET /api/admin/users/:id
// @access  Private/Admin
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent accessing admin users
    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Cannot access admin users",
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: "Server error fetching user",
      error: error.message,
    });
  }
};

// ✅ NEW: Edit user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
exports.editUser = async (req, res) => {
  try {
    const {
      name,
      email,
      branch,
      semester,
      phone,
      enrollmentId,
      graduationYear,
      college,
      bio,
      accountStatus,
      role
    } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent editing admin users
    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Cannot edit admin users",
      });
    }

    // Build update object
    const updateData = {};

    // Basic info
    if (name) updateData.name = name.trim();
    if (email) {
      // Check if email is already taken by another user
      const existingEmail = await User.findOne({ 
        email, 
        _id: { $ne: user._id } 
      });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "Email already in use by another user",
        });
      }
      updateData.email = email;
    }
    
    if (branch) {
      const validBranches = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'OTHER'];
      if (!validBranches.includes(branch)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid branch selection',
        });
      }
      updateData.branch = branch;
    }

    if (semester) {
      const semNum = Number(semester);
      if (isNaN(semNum) || semNum < 1 || semNum > 8) {
        return res.status(400).json({
          success: false,
          message: 'Semester must be between 1 and 8',
        });
      }
      updateData.semester = semNum;
    }

    // Contact & Academic
    if (phone !== undefined) updateData.phone = phone || '';
    
    if (enrollmentId !== undefined) {
      if (enrollmentId) {
        const existingEnrollment = await User.findOne({ 
          enrollmentId, 
          _id: { $ne: user._id } 
        });
        if (existingEnrollment) {
          return res.status(400).json({
            success: false,
            message: 'Enrollment ID already exists',
          });
        }
      }
      updateData.enrollmentId = enrollmentId || undefined;
    }

    if (graduationYear !== undefined) {
      const year = graduationYear ? Number(graduationYear) : null;
      if (year && (year < 2000 || year > 2030)) {
        return res.status(400).json({
          success: false,
          message: 'Graduation year must be between 2000 and 2030',
        });
      }
      updateData.graduationYear = year;
    }

    if (college !== undefined) updateData.college = college || '';
    if (bio !== undefined) updateData.bio = bio || '';

    // Account management
    if (accountStatus) {
      const validStatus = ['active', 'suspended', 'deactivated'];
      if (!validStatus.includes(accountStatus)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid account status',
        });
      }
      updateData.accountStatus = accountStatus;
    }

    // ⚠️ Role change - only if explicitly provided and not admin
    if (role && role !== user.role) {
      if (role === 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Cannot promote users to admin',
        });
      }
      updateData.role = role; // Only allow 'student' role
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: "User updated successfully",
      user: updatedUser,
    });

  } catch (error) {
    console.error('Edit user error:', error);

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`,
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages,
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error updating user",
      error: error.message,
    });
  }
};

// @desc    Delete user and all their resources (with GridFS cleanup)
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent admin deletion
    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Cannot delete admin users",
      });
    }

    // ✅ FIXED: Delete all resources and their GridFS files
    const userResources = await Resource.find({ uploadedBy: user._id });

    for (let resource of userResources) {
      if (resource.fileId) {
        try {
          const db = mongoose.connection.db;
          const bucket = new mongoose.mongo.GridFSBucket(db, {
            bucketName: "uploads"
          });
          
          const fileId = new mongoose.Types.ObjectId(resource.fileId);
          await bucket.delete(fileId);
          console.log(`✅ GridFS file deleted: ${resource.fileId}`);
        } catch (fileError) {
          console.error("Error deleting GridFS file:", fileError);
        }
      }
    }

    await Resource.deleteMany({ uploadedBy: user._id });
    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "User and all associated resources deleted successfully",
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: "Server error deleting user",
      error: error.message,
    });
  }
};
// ============================================
// CONTACT MESSAGES MANAGEMENT
// ============================================

// @desc    Get all contact messages
// @route   GET /api/admin/contact-messages
// @access  Private/Admin
exports.getContactMessages = async (req, res) => {
  try {
    // You'll need to create a Contact model first
    // For now, we'll read from a simple in-memory store or return empty array
    // This assumes you have a Contact model
    
    const Contact = require("../models/Contact");
    const messages = await Contact.find().sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: messages.length,
      messages
    });
  } catch (error) {
    console.error('Get contact messages error:', error);
    res.status(500).json({
      success: false,
      message: "Server error fetching contact messages",
      error: error.message
    });
  }
};

// @desc    Get single contact message
// @route   GET /api/admin/contact-messages/:id
// @access  Private/Admin
exports.getContactMessageById = async (req, res) => {
  try {
    const Contact = require("../models/Contact");
    const message = await Contact.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found"
      });
    }
    
    res.json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Get contact message error:', error);
    res.status(500).json({
      success: false,
      message: "Server error fetching message",
      error: error.message
    });
  }
};

// @desc    Update contact message status
// @route   PUT /api/admin/contact-messages/:id/status
// @access  Private/Admin
exports.updateContactMessageStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const Contact = require("../models/Contact");
    
    const message = await Contact.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found"
      });
    }
    
    message.status = status || message.status;
    if (notes !== undefined) message.adminNotes = notes;
    message.updatedAt = Date.now();
    
    await message.save();
    
    res.json({
      success: true,
      message: "Message status updated",
      data: message
    });
  } catch (error) {
    console.error('Update message status error:', error);
    res.status(500).json({
      success: false,
      message: "Server error updating message",
      error: error.message
    });
  }
};

// @desc    Delete contact message
// @route   DELETE /api/admin/contact-messages/:id
// @access  Private/Admin
exports.deleteContactMessage = async (req, res) => {
  try {
    const Contact = require("../models/Contact");
    const message = await Contact.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found"
      });
    }
    
    await Contact.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: "Message deleted successfully"
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: "Server error deleting message",
      error: error.message
    });
  }
};

// ✅ NEW: Reset user password (admin)
// @route   PUT /api/admin/users/:id/reset-password
// @access  Private/Admin
exports.resetUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent resetting admin passwords
    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Cannot reset admin user password",
      });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Hash new password
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    res.json({
      success: true,
      message: "Password reset successfully",
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: "Server error resetting password",
      error: error.message,
    });
  }
};

// ✅ NEW: Toggle user account status (suspend/activate)
// @route   PUT /api/admin/users/:id/toggle-status
// @access  Private/Admin
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent toggling admin status
    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Cannot modify admin user status",
      });
    }

    const newStatus = user.accountStatus === 'active' ? 'suspended' : 'active';
    user.accountStatus = newStatus;
    await user.save();

    res.json({
      success: true,
      message: `User ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`,
      accountStatus: newStatus,
    });

  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      message: "Server error toggling user status",
      error: error.message,
    });
  }
};