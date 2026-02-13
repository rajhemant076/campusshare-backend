// controllers/resourceController.js

const Resource = require("../models/Resource");
const User = require("../models/User");
const mongoose = require("mongoose");

// @desc    Get all approved resources with pagination and filters
// @route   GET /api/resources
// @access  Public
exports.getResources = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // Build filter query
    const query = { status: "approved" };
    
    // Apply filters if provided
    if (req.query.branch) {
      query.branch = req.query.branch;
    }
    
    if (req.query.semester) {
      query.semester = parseInt(req.query.semester);
    }
    
    if (req.query.subject) {
      query.subject = { $regex: req.query.subject, $options: 'i' };
    }
    
    if (req.query.type) {
      query.type = req.query.type;
    }
    
    // Search functionality
    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { subject: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Get total count for pagination
    const total = await Resource.countDocuments(query);
    
    // Get paginated results
    const resources = await Resource.find(query)
      .populate("uploadedBy", "name branch semester")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // Use lean() for better performance

    res.json({
      success: true,
      count: resources.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      resources,
    });
  } catch (error) {
    console.error("❌ Get resources error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching resources",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};

// @desc    Upload new resource
// @route   POST /api/resources/upload
// @access  Private (Student)
exports.uploadResource = async (req, res) => {
  try {
    const { title, description, branch, semester, subject, type } = req.body;

    // Validate required fields
    if (!title || !description || !branch || !semester || !subject || !type) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a PDF file",
      });
    }

    // ✅ CRITICAL: File ID comes from uploadToGridFS middleware
    const fileId = req.file.id;
    if (!fileId) {
      console.error('❌ No file ID generated. File object:', {
        id: req.file.id,
        filename: req.file.filename,
        originalname: req.file.originalname
      });
      
      return res.status(500).json({
        success: false,
        message: "File upload failed - no file ID generated. Please try again.",
      });
    }

    console.log('✅ File uploaded to GridFS:', {
      fileId: fileId.toString(),
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size
    });

    const fileUrl = `/api/files/${fileId}`;
    const fileName = req.file.originalname;

    // Create resource
    const resource = await Resource.create({
      title,
      description,
      branch,
      semester: Number(semester),
      subject,
      type,
      fileId: fileId.toString(),
      fileUrl: fileUrl,
      fileName: fileName,
      uploadedBy: req.user._id,
      status: "pending",
    });

    console.log(`✅ Resource created: ${resource._id}`);

    res.status(201).json({
      success: true,
      message: "Resource uploaded successfully. Awaiting admin approval.",
      resource,
    });
  } catch (error) {
    console.error("❌ Upload resource error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during upload",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};

// @desc    Get single resource by ID
// @route   GET /api/resources/:id
// @access  Public
exports.getResourceById = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate("uploadedBy", "name branch semester")
      .lean();

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    // Only allow access to approved resources or if user is admin/owner
    if (
      resource.status !== "approved" &&
      (!req.user ||
        (req.user._id.toString() !== resource.uploadedBy._id.toString() &&
          req.user.role !== "admin"))
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Resource is not approved.",
      });
    }

    res.json({
      success: true,
      resource,
    });
  } catch (error) {
    console.error("❌ Get resource error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching resource",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};

// @desc    Like/Unlike resource
// @route   POST /api/resources/:id/like
// @access  Private
exports.toggleLike = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    // Only allow liking approved resources
    if (resource.status !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Cannot like unapproved resources",
      });
    }

    const user = await User.findById(req.user._id);
    const isLiked = user.likedResources.includes(resource._id);

    if (isLiked) {
      // Unlike
      user.likedResources = user.likedResources.filter(
        (id) => id.toString() !== resource._id.toString()
      );
      resource.likesCount = Math.max(0, resource.likesCount - 1);
    } else {
      // Like
      user.likedResources.push(resource._id);
      resource.likesCount += 1;
    }

    await user.save();
    await resource.save();

    res.json({
      success: true,
      message: isLiked ? "Resource unliked" : "Resource liked",
      liked: !isLiked,
      likesCount: resource.likesCount,
    });
  } catch (error) {
    console.error("❌ Toggle like error:", error);
    res.status(500).json({
      success: false,
      message: "Server error toggling like",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};

// @desc    Bookmark/Unbookmark resource
// @route   POST /api/resources/:id/bookmark
// @access  Private
exports.toggleBookmark = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    // Only allow bookmarking approved resources
    if (resource.status !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Cannot bookmark unapproved resources",
      });
    }

    const user = await User.findById(req.user._id);
    const isBookmarked = user.bookmarks.includes(resource._id);

    if (isBookmarked) {
      // Remove bookmark
      user.bookmarks = user.bookmarks.filter(
        (id) => id.toString() !== resource._id.toString()
      );
    } else {
      // Add bookmark
      user.bookmarks.push(resource._id);
    }

    await user.save();

    res.json({
      success: true,
      message: isBookmarked ? "Bookmark removed" : "Resource bookmarked",
      bookmarked: !isBookmarked,
    });
  } catch (error) {
    console.error("❌ Toggle bookmark error:", error);
    res.status(500).json({
      success: false,
      message: "Server error toggling bookmark",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};

// @desc    Get user's bookmarked resources
// @route   GET /api/resources/bookmarks
// @access  Private
exports.getBookmarks = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: "bookmarks",
      populate: {
        path: "uploadedBy",
        select: "name branch semester",
      },
      match: { status: "approved" }, // Only show approved resources
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Filter out any null values (deleted resources)
    const validBookmarks = user.bookmarks.filter(
      (bookmark) => bookmark !== null
    );

    res.json({
      success: true,
      count: validBookmarks.length,
      bookmarks: validBookmarks,
    });
  } catch (error) {
    console.error("❌ Get bookmarks error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching bookmarks",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};

// @desc    Get user's uploaded resources
// @route   GET /api/resources/my-uploads
// @access  Private
exports.getMyUploads = async (req, res) => {
  try {
    const resources = await Resource.find({ uploadedBy: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: resources.length,
      resources,
    });
  } catch (error) {
    console.error("❌ Get my uploads error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching uploads",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};

// @desc    Delete resource by ID (used by admin)
// @access  Internal
exports.deleteResourceById = async (resourceId) => {
  try {
    const resource = await Resource.findById(resourceId);
    if (!resource) return false;

    // Delete from GridFS
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
        console.error("⚠️ Error deleting GridFS file:", fileError.message);
        // Continue even if file delete fails
      }
    }

    await Resource.findByIdAndDelete(resourceId);
    return true;
  } catch (error) {
    console.error('❌ Error deleting resource:', error);
    return false;
  }
};