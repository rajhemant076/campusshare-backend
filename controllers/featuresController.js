const Resource = require("../models/Resource");
const User = require("../models/User");

// @desc    Get features page statistics and data
// @route   GET /api/features/stats
// @access  Public
exports.getFeaturesStats = async (req, res) => {
  try {
    // Get real-time statistics
    const totalResources = await Resource.countDocuments({ status: "approved" });
    const totalUsers = await User.countDocuments({ role: "student", accountStatus: "active" });
    const totalDownloads = await Resource.aggregate([
      { $match: { status: "approved" } },
      { $group: { _id: null, total: { $sum: "$downloadCount" } } }
    ]);
    
    // Get branch-wise distribution
    const branchStats = await Resource.aggregate([
      { $match: { status: "approved" } },
      { $group: { 
          _id: "$branch", 
          count: { $sum: 1 },
          downloads: { $sum: "$downloadCount" }
        } 
      },
      { $sort: { count: -1 } }
    ]);

    // Get resource type distribution
    const typeStats = await Resource.aggregate([
      { $match: { status: "approved" } },
      { $group: { 
          _id: "$type", 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { count: -1 } }
    ]);

    // Get semester-wise distribution
    const semesterStats = await Resource.aggregate([
      { $match: { status: "approved" } },
      { $group: { 
          _id: "$semester", 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { _id: 1 } }
    ]);

    // Get recent uploads
    const recentResources = await Resource.find({ status: "approved" })
      .populate("uploadedBy", "name branch semester")
      .sort({ createdAt: -1 })
      .limit(6);

    // Get most liked resources
    const popularResources = await Resource.find({ status: "approved" })
      .populate("uploadedBy", "name branch semester")
      .sort({ likesCount: -1, createdAt: -1 })
      .limit(6);

    res.json({
      success: true,
      data: {
        stats: {
          totalResources: totalResources || 0,
          totalUsers: totalUsers || 0,
          totalDownloads: totalDownloads[0]?.total || Math.floor(totalResources * 3.5),
          totalBranches: 7,
          totalSemesters: 8
        },
        branchStats: branchStats.map(b => ({ branch: b._id, count: b.count, downloads: b.downloads || 0 })),
        typeStats: typeStats.map(t => ({ type: t._id, count: t.count })),
        semesterStats: semesterStats.map(s => ({ semester: s._id, count: s.count })),
        recentResources,
        popularResources
      }
    });

  } catch (error) {
    console.error("Get features stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching features data",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error"
    });
  }
};

// @desc    Get all features and pricing info
// @route   GET /api/features
// @access  Public
exports.getFeatures = async (req, res) => {
  try {
    const features = [
      {
        id: 1,
        icon: "CloudArrowUpIcon",
        title: "Easy File Upload",
        description: "Upload notes, assignments, PYQs, and lab manuals with just a few clicks. Support for PDF format up to 10MB.",
        color: "from-blue-500 to-cyan-500",
        forRole: "both"
      },
      {
        id: 2,
        icon: "MagnifyingGlassIcon",
        title: "Smart Search",
        description: "Find resources by branch, semester, subject, or type. Advanced filters help you get exactly what you need.",
        color: "from-purple-500 to-pink-500",
        forRole: "both"
      },
      {
        id: 3,
        icon: "DocumentCheckIcon",
        title: "Admin Approval",
        description: "Quality control through admin review system. Only approved resources are visible to the community.",
        color: "from-green-500 to-emerald-500",
        forRole: "both"
      },
      {
        id: 4,
        icon: "BookmarkIcon",
        title: "Bookmark Resources",
        description: "Save important resources for quick access later. Build your personal library of study materials.",
        color: "from-yellow-500 to-orange-500",
        forRole: "student"
      },
      {
        id: 5,
        icon: "HeartIcon",
        title: "Like & Engage",
        description: "Show appreciation for helpful resources. Popular resources rise to the top.",
        color: "from-red-500 to-rose-500",
        forRole: "student"
      },
      {
        id: 6,
        icon: "UserGroupIcon",
        title: "Student Community",
        description: "Connect with fellow students from different branches and semesters.",
        color: "from-indigo-500 to-blue-500",
        forRole: "student"
      },
      {
        id: 7,
        icon: "AcademicCapIcon",
        title: "Branch Specific",
        description: "Resources organized by CSE, ECE, EEE, MECH, CIVIL, IT, and other branches.",
        color: "from-teal-500 to-cyan-500",
        forRole: "both"
      },
      {
        id: 8,
        icon: "ClockIcon",
        title: "Semester Wise",
        description: "Content categorized from semester 1 to 8, making it easy to find relevant material.",
        color: "from-amber-500 to-yellow-500",
        forRole: "both"
      },
      {
        id: 9,
        icon: "ShieldCheckIcon",
        title: "Secure Authentication",
        description: "JWT-based authentication with encrypted passwords. Your data stays safe.",
        color: "from-violet-500 to-purple-500",
        forRole: "both"
      },
      {
        id: 10,
        icon: "ChartBarIcon",
        title: "Admin Dashboard",
        description: "Comprehensive analytics and management tools for administrators.",
        color: "from-slate-500 to-gray-500",
        forRole: "admin"
      },
      {
        id: 11,
        icon: "BuildingLibraryIcon",
        title: "Digital Library",
        description: "Create your own digital collection of academic resources.",
        color: "from-cyan-500 to-blue-500",
        forRole: "student"
      },
      {
        id: 12,
        icon: "CpuChipIcon",
        title: "Modern Tech Stack",
        description: "Built with MERN stack, GridFS for file storage, and responsive design.",
        color: "from-fuchsia-500 to-pink-500",
        forRole: "both"
      }
    ];

    const plans = [
      {
        name: "Student",
        price: 0,
        period: "forever",
        description: "Perfect for individual students",
        features: [
          "Browse all resources",
          "Download PDFs",
          "Upload resources",
          "Bookmark resources",
          "Like & engage",
          "Create profile"
        ],
        limitations: [
          "10MB file size limit",
          "Resources need approval"
        ],
        buttonText: "Get Started",
        buttonVariant: "primary",
        popular: true
      },
      {
        name: "Institution",
        price: "Custom",
        period: "year",
        description: "For colleges and universities",
        features: [
          "Everything in Student",
          "Unlimited storage",
          "Bulk upload",
          "Analytics dashboard",
          "Dedicated support",
          "Custom branding"
        ],
        limitations: [],
        buttonText: "Contact Sales",
        buttonVariant: "outline",
        popular: false
      }
    ];

    res.json({
      success: true,
      data: {
        features,
        plans
      }
    });

  } catch (error) {
    console.error("Get features error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching features",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error"
    });
  }
};