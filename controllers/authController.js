const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );
};

// @desc    Register new user (UPDATED with new fields)
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res) => {
  try {
    const { 
      name, email, password, branch, semester,
      phone, enrollmentId, graduationYear, college, bio 
    } = req.body;

    // Validate required fields
    if (!name || !email || !password || !branch || !semester) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Check if enrollment ID is already taken (if provided)
    if (enrollmentId) {
      const existingEnrollment = await User.findOne({ enrollmentId });
      if (existingEnrollment) {
        return res.status(400).json({
          success: false,
          message: 'Enrollment ID already exists'
        });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user with all fields
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      branch,
      semester: Number(semester),
      role: 'student',
      // Optional fields
      phone: phone || '',
      enrollmentId: enrollmentId || undefined,
      graduationYear: graduationYear ? Number(graduationYear) : null,
      college: college || '',
      bio: bio || '',
      socialLinks: {
        linkedin: '',
        github: '',
        twitter: ''
      },
      profileVisibility: 'public',
      lastActive: Date.now(),
      accountStatus: 'active'
    });

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        enrollmentId: user.enrollmentId,
        graduationYear: user.graduationYear,
        college: user.college,
        bio: user.bio,
        socialLinks: user.socialLinks,
        profileVisibility: user.profileVisibility,
        branch: user.branch,
        semester: user.semester,
        role: user.role,
        bookmarks: user.bookmarks,
        likedResources: user.likedResources,
        lastActive: user.lastActive,
        accountStatus: user.accountStatus,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    
    // Handle duplicate key error for enrollment ID
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Enrollment ID already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (user.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact admin.'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last active
    user.lastActive = Date.now();
    await user.save();

    // Generate token
    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        enrollmentId: user.enrollmentId,
        graduationYear: user.graduationYear,
        college: user.college,
        bio: user.bio,
        socialLinks: user.socialLinks,
        profileVisibility: user.profileVisibility,
        branch: user.branch,
        semester: user.semester,
        role: user.role,
        bookmarks: user.bookmarks,
        likedResources: user.likedResources,
        lastActive: user.lastActive,
        accountStatus: user.accountStatus,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('bookmarks')
      .populate('likedResources');

    // Update last active
    user.lastActive = Date.now();
    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        enrollmentId: user.enrollmentId,
        graduationYear: user.graduationYear,
        college: user.college,
        bio: user.bio,
        socialLinks: user.socialLinks,
        profileVisibility: user.profileVisibility,
        branch: user.branch,
        semester: user.semester,
        role: user.role,
        bookmarks: user.bookmarks,
        likedResources: user.likedResources,
        lastActive: user.lastActive,
        accountStatus: user.accountStatus,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// ============================================
// ✅ UPDATED: UPDATE USER PROFILE - ALL FIELDS
// ============================================
// @desc    Update user profile (complete)
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { 
      name, branch, semester, phone, enrollmentId, 
      graduationYear, college, bio, socialLinks, profileVisibility 
    } = req.body;
    
    const userId = req.user._id;

    // Validate at least one field is provided
    if (!name && !branch && !semester && !phone && !enrollmentId && 
        !graduationYear && !college && !bio && !socialLinks && !profileVisibility) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one field to update'
      });
    }

    // Build update object (only include fields that are provided)
    const updateData = {};

    // Basic info
    if (name) {
      if (name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Name must be at least 2 characters long'
        });
      }
      updateData.name = name.trim();
    }
    
    if (branch) {
      const validBranches = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'OTHER'];
      if (!validBranches.includes(branch)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid branch selection'
        });
      }
      updateData.branch = branch;
    }
    
    if (semester) {
      const semNum = Number(semester);
      if (isNaN(semNum) || semNum < 1 || semNum > 8) {
        return res.status(400).json({
          success: false,
          message: 'Semester must be between 1 and 8'
        });
      }
      updateData.semester = semNum;
    }

    // 📱 Phone number
    if (phone !== undefined) {
      // Basic phone validation (can be enhanced)
      const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
      if (phone && !phoneRegex.test(phone)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid phone number'
        });
      }
      updateData.phone = phone.trim();
    }

    // 🆔 Enrollment ID
    if (enrollmentId !== undefined) {
      // Check if enrollment ID is already taken by another user
      if (enrollmentId) {
        const existingEnrollment = await User.findOne({ 
          enrollmentId, 
          _id: { $ne: userId } 
        });
        if (existingEnrollment) {
          return res.status(400).json({
            success: false,
            message: 'Enrollment ID already exists'
          });
        }
      }
      updateData.enrollmentId = enrollmentId || undefined;
    }

    // 🎓 Graduation Year
    if (graduationYear !== undefined) {
      const year = graduationYear ? Number(graduationYear) : null;
      if (year && (year < 2000 || year > 2030)) {
        return res.status(400).json({
          success: false,
          message: 'Graduation year must be between 2000 and 2030'
        });
      }
      updateData.graduationYear = year;
    }

    // 🏫 College
    if (college !== undefined) {
      updateData.college = college.trim();
    }

    // 📝 Bio
    if (bio !== undefined) {
      if (bio.length > 500) {
        return res.status(400).json({
          success: false,
          message: 'Bio cannot exceed 500 characters'
        });
      }
      updateData.bio = bio.trim();
    }

    // 🌐 Social Links
    if (socialLinks) {
      updateData.socialLinks = {
        linkedin: socialLinks.linkedin?.trim() || '',
        github: socialLinks.github?.trim() || '',
        twitter: socialLinks.twitter?.trim() || ''
      };
    }

    // 👥 Profile Visibility
    if (profileVisibility) {
      const validVisibility = ['public', 'private', 'contacts'];
      if (!validVisibility.includes(profileVisibility)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid profile visibility setting'
        });
      }
      updateData.profileVisibility = profileVisibility;
    }

    // Update last active timestamp
    updateData.lastActive = Date.now();

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { 
        new: true,
        runValidators: true
      }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        enrollmentId: updatedUser.enrollmentId,
        graduationYear: updatedUser.graduationYear,
        college: updatedUser.college,
        bio: updatedUser.bio,
        socialLinks: updatedUser.socialLinks,
        profileVisibility: updatedUser.profileVisibility,
        branch: updatedUser.branch,
        semester: updatedUser.semester,
        role: updatedUser.role,
        bookmarks: updatedUser.bookmarks,
        likedResources: updatedUser.likedResources,
        lastActive: updatedUser.lastActive,
        accountStatus: updatedUser.accountStatus,
        createdAt: updatedUser.createdAt
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    
    // Handle duplicate key error for enrollment ID
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Enrollment ID already exists'
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// ============================================
// ✅ CHANGE PASSWORD
// ============================================
// @desc    Change user password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current password and new password'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Find user with password
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    user.lastActive = Date.now();
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error changing password',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// ============================================
// ✅ GET USER BY ID (Public Profile)
// ============================================
// @desc    Get public user profile by ID
// @route   GET /api/auth/user/:id
// @access  Public (with privacy restrictions)
exports.getPublicProfile = async (req, res) => {
  try {
    const userId = req.params.id;
    
    const user = await User.findById(userId)
      .select('-password -bookmarks -likedResources -email -phone -enrollmentId');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check privacy settings
    if (user.profileVisibility === 'private') {
      // If requesting user is not the owner and not admin
      if (!req.user || (req.user._id.toString() !== userId && req.user.role !== 'admin')) {
        return res.status(403).json({
          success: false,
          message: 'This profile is private'
        });
      }
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        branch: user.branch,
        semester: user.semester,
        college: user.college,
        bio: user.bio,
        graduationYear: user.graduationYear,
        socialLinks: user.profileVisibility === 'public' ? user.socialLinks : undefined,
        role: user.role,
        lastActive: user.lastActive,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Logout user (client-side token removal)
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};