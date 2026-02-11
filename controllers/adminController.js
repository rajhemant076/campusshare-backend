const Resource = require("../models/Resource");
const User = require("../models/User");
const fs = require("fs");
const path = require("path");

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

// @desc    Delete resource (and file)
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

    // Delete file from server
    if (resource.fileUrl) {
      const relativePath = resource.fileUrl.replace(/^\//, '');
      const filePath = path.join(__dirname, "..", relativePath);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`✅ File deleted: ${filePath}`);
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

// @desc    Delete user and all their resources
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

    // Delete all resources uploaded by this user
    const userResources = await Resource.find({ uploadedBy: user._id });

    for (let resource of userResources) {
      if (resource.fileUrl) {
        const relativePath = resource.fileUrl.replace(/^\//, '');
        const filePath = path.join(__dirname, "..", relativePath);
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    await Resource.deleteMany({ uploadedBy: user._id });
    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "User deleted successfully",
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