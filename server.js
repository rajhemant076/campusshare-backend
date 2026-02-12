const mongoose = require('mongoose');
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

// ============================================
// VALIDATE ENVIRONMENT VARIABLES
// ============================================
const requiredEnvVars = [
  { name: 'MONGO_URI', message: '❌ MONGO_URI is not defined in .env file' },
  { name: 'JWT_SECRET', message: '❌ JWT_SECRET is not defined in .env file' }
];

requiredEnvVars.forEach(({ name, message }) => {
  if (!process.env[name]) {
    console.error(message);
    console.error(`   Please add ${name} to your .env file`);
    process.exit(1);
  }
});

// ============================================
// CONNECT TO DATABASE
// ============================================
connectDB();

// ============================================
// IMPORT ROUTES
// ============================================
const authRoutes = require("./routes/authRoutes");
const resourceRoutes = require("./routes/resourceRoutes");
const adminRoutes = require("./routes/adminRoutes");
const fileRoutes = require("./routes/fileRoutes");
const featuresRoutes = require("./routes/featuresRoutes"); // ✅ NEW: Features routes
const contactRoutes = require("./routes/contactRoutes");   // ✅ NEW: Contact routes
const aboutRoutes = require("./routes/aboutRoutes");       // ✅ NEW: About routes

const app = express();

// ============================================
// CORS CONFIGURATION - CRITICAL FOR DEPLOYMENT
// ============================================
const allowedOrigins = [
  // Development origins
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:3000',

  // Production origins - ADD YOUR DEPLOYED FRONTEND URLS HERE
  'https://campusshare-frontend.vercel.app',
  'https://campusshare-frontend.netlify.app',
  'https://campusshare-frontend.onrender.com',
  process.env.CLIENT_URL, // Your custom domain or specific frontend URL
].filter(Boolean); // Remove any undefined values

// CORS middleware configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    // Check if the origin is allowed
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      console.warn(`🚫 Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Disposition'], // For file downloads
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Handle preflight requests explicitly
app.options('*', cors());

// ============================================
// BODY PARSER MIDDLEWARE
// ============================================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============================================
// API ROUTES
// ============================================
app.use("/api/auth", authRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/features", featuresRoutes); // ✅ NEW: Features routes
app.use("/api/contact", contactRoutes);   // ✅ NEW: Contact routes
app.use("/api/about", aboutRoutes);       // ✅ NEW: About routes

// ============================================
// HEALTH CHECK ENDPOINT
// ============================================
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "CampusShare API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// ============================================
// ROOT ENDPOINT - UPDATED WITH NEW ROUTES
// ============================================
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to CampusShare API",
    documentation: {
      health: "/api/health",
      auth: "/api/auth",
      resources: "/api/resources",
      admin: "/api/admin",
      files: "/api/files/:id",
      features: "/api/features", // ✅ NEW
      contact: "/api/contact",   // ✅ NEW
      about: "/api/about"        // ✅ NEW
    },
    version: "1.0.0"
  });
});

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  console.error('📝 Stack:', err.stack);

  // Handle Multer errors (file upload)
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 10MB.',
        error: err.message
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field. Please upload a single PDF file.',
        error: err.message
      });
    }
    return res.status(400).json({
      success: false,
      message: 'File upload error',
      error: err.message
    });
  }

  // Handle file filter errors
  if (err.message === 'Only PDF files are allowed!') {
    return res.status(400).json({
      success: false,
      message: err.message,
      error: 'Invalid file type'
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token. Please login again.',
      error: err.message
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired. Please login again.',
      error: err.message
    });
  }

  // Handle MongoDB errors
  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate entry. This record already exists.',
        error: err.message
      });
    }
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors
    });
  }

  // Handle CastError (invalid ID)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
      error: err.message
    });
  }

  // Default error response
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.stack,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// 404 HANDLER - MUST BE LAST - UPDATED WITH NEW ROUTES
// ============================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    availableEndpoints: {
      health: 'GET /api/health',
      auth: 'POST /api/auth/signup, POST /api/auth/login, GET /api/auth/me',
      resources: 'GET /api/resources, POST /api/resources/upload',
      files: 'GET /api/files/:id',
      admin: 'GET /api/admin/stats, GET /api/admin/resources/pending',
      features: 'GET /api/features, GET /api/features/stats',     // ✅ NEW
      contact: 'POST /api/contact, GET /api/contact/info',        // ✅ NEW
      about: 'GET /api/about, GET /api/about/team'                // ✅ NEW
    }
  });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log('\n=================================');
  console.log('🚀 CampusShare API Server');
  console.log('=================================');
  console.log(`📍 Local URL: http://localhost:${PORT}`);
  console.log(`📍 API URL: http://localhost:${PORT}/api`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);

  // Show allowed CORS origins
  console.log('\n🔒 CORS Allowed Origins:');
  allowedOrigins.forEach(origin => console.log(`   - ${origin}`));

  console.log('\n📋 Available Endpoints:');
  console.log('   GET  /              - API info');
  console.log('   GET  /api/health    - Health check');
  console.log('   POST /api/auth/*    - Authentication');
  console.log('   GET  /api/resources - Get resources');
  console.log('   POST /api/resources/upload - Upload file');
  console.log('   GET  /api/files/:id - View/Download PDF (GridFS)');
  console.log('   GET  /api/admin/*   - Admin routes');
  console.log('   GET  /api/features  - Features & stats');      // ✅ NEW
  console.log('   POST /api/contact   - Contact form');          // ✅ NEW
  console.log('   GET  /api/about     - About information');     // ✅ NEW
  console.log('\n✅ Server ready!');
  console.log('=================================\n');
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Closing server...');
  server.close(() => {
    console.log('✅ Server closed');
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received. Closing server...');
  server.close(() => {
    console.log('✅ Server closed');
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  });
});

module.exports = app;