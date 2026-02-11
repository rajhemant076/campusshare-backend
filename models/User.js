const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
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
});

module.exports = mongoose.model('User', userSchema);