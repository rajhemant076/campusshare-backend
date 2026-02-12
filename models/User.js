const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // ============================================
  // REQUIRED FIELDS (Existing)
  // ============================================
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6
  },
  branch: {
    type: String,
    required: [true, 'Branch is required'],
    enum: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'OTHER']
  },
  semester: {
    type: Number,
    required: [true, 'Semester is required'],
    min: 1,
    max: 8
  },
  
  // ============================================
  // 📱 NEW: CONTACT INFORMATION
  // ============================================
  phone: {
    type: String,
    trim: true,
    default: '',
    match: [
      /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
      'Please provide a valid phone number'
    ]
  },
  
  // ============================================
  // 🆔 NEW: ACADEMIC IDENTIFIERS
  // ============================================
  enrollmentId: {
    type: String,
    trim: true,
    unique: true,
    sparse: true, // Allows multiple null/empty values, but unique when provided
    default: undefined
  },
  
  // ============================================
  // 🎓 NEW: ACADEMIC INFORMATION
  // ============================================
  graduationYear: {
    type: Number,
    min: 2000,
    max: 2030,
    default: null
  },
  college: {
    type: String,
    trim: true,
    default: ''
  },
  
  // ============================================
  // 📝 NEW: PERSONAL INFORMATION
  // ============================================
  bio: {
    type: String,
    trim: true,
    maxlength: [500, 'Bio cannot exceed 500 characters'],
    default: ''
  },
  
  // ============================================
  // 🌐 NEW: SOCIAL LINKS
  // ============================================
  socialLinks: {
    linkedin: {
      type: String,
      trim: true,
      default: '',
      match: [
        /^(https?:\/\/)?(www\.)?linkedin\.com\/.*$/i,
        'Please provide a valid LinkedIn URL'
      ]
    },
    github: {
      type: String,
      trim: true,
      default: '',
      match: [
        /^(https?:\/\/)?(www\.)?github\.com\/.*$/i,
        'Please provide a valid GitHub URL'
      ]
    },
    twitter: {
      type: String,
      trim: true,
      default: '',
      match: [
        /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/.*$/i,
        'Please provide a valid Twitter URL'
      ]
    }
  },
  
  // ============================================
  // 👁️ NEW: PRIVACY SETTINGS
  // ============================================
  profileVisibility: {
    type: String,
    enum: ['public', 'private', 'contacts'],
    default: 'public'
  },
  
  // ============================================
  // 📊 NEW: ACCOUNT MANAGEMENT
  // ============================================
  lastActive: {
    type: Date,
    default: Date.now
  },
  accountStatus: {
    type: String,
    enum: ['active', 'suspended', 'deactivated'],
    default: 'active'
  },
  
  // ============================================
  // EXISTING FIELDS
  // ============================================
  role: {
    type: String,
    enum: ['student', 'admin'],
    default: 'student'
  },
  bookmarks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource'
  }],
  likedResources: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// ============================================
// ✅ INDEXES for better query performance
// ============================================
userSchema.index({ email: 1 });
userSchema.index({ enrollmentId: 1 });
userSchema.index({ branch: 1, semester: 1 });
userSchema.index({ role: 1 });
userSchema.index({ accountStatus: 1 });

// ============================================
// ✅ VIRTUAL FIELDS (Computed properties)
// ============================================
userSchema.virtual('isActive').get(function() {
  return this.accountStatus === 'active';
});

userSchema.virtual('profileCompletion').get(function() {
  let completed = 0;
  const total = 8; // Total optional fields to check
  
  if (this.phone) completed++;
  if (this.enrollmentId) completed++;
  if (this.graduationYear) completed++;
  if (this.college) completed++;
  if (this.bio) completed++;
  if (this.socialLinks.linkedin) completed++;
  if (this.socialLinks.github) completed++;
  if (this.socialLinks.twitter) completed++;
  
  return Math.round((completed / total) * 100);
});

// ============================================
// ✅ INSTANCE METHODS
// ============================================
// Update last active timestamp
userSchema.methods.updateLastActive = function() {
  this.lastActive = Date.now();
  return this.save();
};

// Get public profile (filter sensitive data)
userSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    name: this.name,
    branch: this.branch,
    semester: this.semester,
    college: this.college,
    bio: this.bio,
    graduationYear: this.graduationYear,
    socialLinks: this.profileVisibility === 'public' ? this.socialLinks : undefined,
    role: this.role,
    lastActive: this.lastActive,
    createdAt: this.createdAt
  };
};

// ============================================
// ✅ STATIC METHODS
// ============================================
// Find active users
userSchema.statics.findActive = function() {
  return this.find({ accountStatus: 'active' });
};

// Find users by branch
userSchema.statics.findByBranch = function(branch) {
  return this.find({ branch, accountStatus: 'active' });
};

// ============================================
// ✅ PRE-SAVE MIDDLEWARE
// ============================================
userSchema.pre('save', function(next) {
  // Trim string fields
  if (this.phone) this.phone = this.phone.trim();
  if (this.enrollmentId) this.enrollmentId = this.enrollmentId.trim();
  if (this.college) this.college = this.college.trim();
  if (this.bio) this.bio = this.bio.trim();
  
  // Update lastActive on save
  this.lastActive = Date.now();
  
  next();
});

module.exports = mongoose.model('User', userSchema);