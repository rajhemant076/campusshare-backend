const mongoose = require('mongoose');
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const compression = require("compression"); // Add this for response compression
const helmet = require("helmet"); // Add this for security headers
const connectDB = require("./config/db");
const { verifyGridFS } = require("./middleware/gridfsUploadDirect"); // ✅ FIXED: Use direct version

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
const featuresRoutes = require("./routes/featuresRoutes");
const contactRoutes = require("./routes/contactRoutes");
const aboutRoutes = require("./routes/aboutRoutes");

const app = express();

// ============================================
// SECURITY & PERFORMANCE MIDDLEWARE
// ============================================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Allow PDF viewing
}));

// Enable compression for all responses
app.use(compression({
  level: 6, // Compression level (1-9)
  threshold: 1024, // Only compress responses > 1kb
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// ============================================
// CORS CONFIGURATION - OPTIMIZED
// ============================================
const allowedOrigins = [
  // Development origins
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:3000',

  // Production origins
  'https://campusshare-frontend.vercel.app',
  'https://campusshare-frontend.netlify.app',
  'https://campusshare-frontend.onrender.com',
  
  // Allow ALL Vercel preview deployments
  /\.vercel\.app$/,
  
  process.env.CLIENT_URL,
].filter(Boolean);

// Cache CORS check results for performance
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    // Check if the origin is allowed (supports both string and regex patterns)
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });

    if (isAllowed || process.env.NODE_ENV !== 'production') {
      // Cache the result for this origin (browsers cache preflight)
      callback(null, true);
    } else {
      console.warn(`🚫 Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Disposition'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // Cache preflight results for 24 hours
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// ============================================
// BODY PARSER MIDDLEWARE - OPTIMIZED
// ============================================
app.use(express.json({ 
  limit: '50mb',
  // Parse only when needed
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '50mb',
  parameterLimit: 10000 // Limit number of params
}));

// ============================================
// REQUEST LOGGING MIDDLEWARE (Development only)
// ============================================
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.url}`);
    next();
  });
}

// ============================================
// API ROUTES
// ============================================
app.use("/api/auth", authRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/features", featuresRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/about", aboutRoutes);

// ============================================
// OPTIMIZED DEBUG ENDPOINT - WITH CACHING
// ============================================
app.get('/api/debug/gridfs', async (req, res) => {
  // Cache debug info for 30 seconds
  res.set('Cache-Control', 'public, max-age=30');
  
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({
        success: false,
        message: 'MongoDB not connected',
        readyState: mongoose.connection.readyState
      });
    }

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    // Check GridFS collections
    const filesCollection = collections.find(c => c.name === 'uploads.files');
    const chunksCollection = collections.find(c => c.name === 'uploads.chunks');
    
    let files = [];
    let chunksCount = 0;
    
    if (filesCollection) {
      // Limit to 20 files for performance
      files = await db.collection('uploads.files')
        .find()
        .sort({ uploadDate: -1 })
        .limit(20)
        .toArray();
    }
    
    if (chunksCollection) {
      chunksCount = await db.collection('uploads.chunks').countDocuments();
    }

    // Get resources that reference files (limit to 50)
    const Resource = require('./models/Resource');
    const resources = await Resource.find({ fileId: { $exists: true } })
      .select('title fileId fileName status')
      .limit(50)
      .lean();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      database: {
        name: db.databaseName,
        connectionState: mongoose.connection.readyState,
        collections: collections.map(c => c.name)
      },
      gridfs: {
        filesExists: !!filesCollection,
        chunksExists: !!chunksCollection,
        filesCount: files.length,
        chunksCount: chunksCount,
        files: files.map(f => ({
          id: f._id,
          filename: f.filename,
          originalName: f.metadata?.originalName,
          size: f.length,
          sizeMB: (f.length / (1024 * 1024)).toFixed(2),
          uploadDate: f.uploadDate
        }))
      },
      resources: resources.map(r => ({
        id: r._id,
        title: r.title,
        status: r.status,
        fileId: r.fileId,
        fileName: r.fileName,
        fileExists: files.some(f => f._id.toString() === r.fileId)
      }))
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// HEALTH CHECK ENDPOINT - WITH CACHING
// ============================================
app.get("/api/health", (req, res) => {
  // Cache health check for 60 seconds
  res.set('Cache-Control', 'public, max-age=60');
  
  res.status(200).json({
    success: true,
    message: "CampusShare API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime()
  });
});

// ============================================
// ROOT ENDPOINT - WITH CACHING
// ============================================
app.get("/", (req, res) => {
  // Cache root endpoint for 1 hour
  res.set('Cache-Control', 'public, max-age=3600');
  
  res.status(200).json({
    success: true,
    message: "Welcome to CampusShare API",
    documentation: {
      health: "/api/health",
      auth: "/api/auth",
      resources: "/api/resources",
      admin: "/api/admin",
      files: "/api/files/:id",
      features: "/api/features",
      contact: "/api/contact",
      about: "/api/about",
      debug: "/api/debug/gridfs"
    },
    version: "1.0.0"
  });
});

// ============================================
// ERROR HANDLING MIDDLEWARE - OPTIMIZED
// ============================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  
  // Don't send stack traces in production
  const isDev = process.env.NODE_ENV === 'development';
  
  if (err.name === 'MulterError') {
    const messages = {
      'LIMIT_FILE_SIZE': 'File size too large. Maximum size is 10MB.',
      'LIMIT_UNEXPECTED_FILE': 'Unexpected field. Please upload a single PDF file.'
    };
    
    return res.status(400).json({
      success: false,
      message: messages[err.code] || 'File upload error',
      error: isDev ? err.message : undefined
    });
  }

  if (err.message === 'Only PDF files are allowed!') {
    return res.status(400).json({
      success: false,
      message: err.message,
      error: isDev ? 'Invalid file type' : undefined
    });
  }

  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(isDev && { error: err.stack }),
    timestamp: new Date().toISOString()
  });
});

// ============================================
// 404 HANDLER
// ============================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 10000;

const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log('\n=================================');
  console.log('🚀 CampusShare API Server');
  console.log('=================================');
  console.log(`📍 URL: http://0.0.0.0:${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📦 Compression: Enabled`);
  console.log(`🛡️  Helmet: Enabled`);

  // Verify GridFS after server starts
  if (mongoose.connection.db) {
    await verifyGridFS(mongoose.connection.db);
  }

  console.log('\n✅ Server ready!');
  console.log('=================================\n');
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
const gracefulShutdown = async (signal) => {
  console.log(`\n👋 ${signal} received. Closing server...`);
  
  server.close(async () => {
    console.log('✅ HTTP server closed');
    
    try {
      await mongoose.connection.close();
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error during shutdown:', err);
      process.exit(1);
    }
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('❌ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  gracefulShutdown('UNHANDLED_REJECTION');
});

module.exports = app;