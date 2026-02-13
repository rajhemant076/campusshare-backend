const mongoose = require('mongoose');
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { verifyGridFS } = require("./middleware/gridfsUpload");

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
// CORS CONFIGURATION - FIXED FOR VERCEL PREVIEW URLS
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
  
  // 🔥 IMPORTANT: Allow ALL Vercel preview deployments
  /\.vercel\.app$/,
  
  process.env.CLIENT_URL,
].filter(Boolean);

// CORS middleware configuration with regex support
app.use(cors({
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
app.use("/api/features", featuresRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/about", aboutRoutes);

// ============================================
// ENHANCED DEBUG ENDPOINT - CHECK GRIDFS FILES
// ============================================
app.get('/api/debug/gridfs', async (req, res) => {
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
    let testResults = [];
    
    if (filesCollection) {
      files = await db.collection('uploads.files').find().toArray();
      
      // Test first 5 files
      for (const file of files.slice(0, 5)) {
        try {
          const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: "uploads" });
          const stream = bucket.openDownloadStream(file._id);
          
          // Test if file is readable
          const testResult = await new Promise((resolve) => {
            let hasData = false;
            stream.on('data', () => { hasData = true; });
            stream.on('end', () => resolve({ success: true, hasData }));
            stream.on('error', (err) => resolve({ success: false, error: err.message }));
            
            // Timeout after 2 seconds
            setTimeout(() => resolve({ success: false, error: 'Timeout' }), 2000);
          });
          
          testResults.push({
            fileId: file._id,
            filename: file.filename,
            originalName: file.metadata?.originalName,
            size: file.length,
            sizeMB: (file.length / (1024 * 1024)).toFixed(2),
            readable: testResult.success,
            error: testResult.error
          });
        } catch (err) {
          testResults.push({
            fileId: file._id,
            filename: file.filename,
            error: err.message
          });
        }
      }
    }
    
    if (chunksCollection) {
      chunksCount = await db.collection('uploads.chunks').countDocuments();
    }

    // Get resources that reference files
    const Resource = require('./models/Resource');
    const resources = await Resource.find({ fileId: { $exists: true } })
      .select('title fileId fileName status')
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
          uploadDate: f.uploadDate,
          metadata: f.metadata
        }))
      },
      resources: resources.map(r => ({
        id: r._id,
        title: r.title,
        status: r.status,
        fileId: r.fileId,
        fileName: r.fileName,
        fileExists: files.some(f => f._id.toString() === r.fileId)
      })),
      fileTests: testResults
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// ============================================
// TEST ENDPOINT - DIRECT FILE ACCESS WITHOUT GRIDFS
// ============================================
app.get('/api/test/file/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const db = mongoose.connection.db;
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    
    const file = await db.collection('uploads.files').findOne({ _id: fileId });
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({
      success: true,
      message: 'File exists in GridFS',
      file: {
        id: file._id,
        filename: file.filename,
        originalName: file.metadata?.originalName,
        size: file.length,
        contentType: file.contentType,
        uploadDate: file.uploadDate
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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
// ROOT ENDPOINT
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
      features: "/api/features",
      contact: "/api/contact",
      about: "/api/about",
      debug: "/api/debug/gridfs",
      test: "/api/test/file/:id"
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

  if (err.message === 'Only PDF files are allowed!') {
    return res.status(400).json({
      success: false,
      message: err.message,
      error: 'Invalid file type'
    });
  }

  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.stack,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// 404 HANDLER
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
      features: 'GET /api/features, GET /api/features/stats',
      contact: 'POST /api/contact, GET /api/contact/info',
      about: 'GET /api/about, GET /api/about/team',
      debug: 'GET /api/debug/gridfs',
      test: 'GET /api/test/file/:id'
    }
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

  // Verify GridFS after server starts
  if (mongoose.connection.db) {
    await verifyGridFS(mongoose.connection.db);
  }

  console.log('\n🔒 CORS Allowed Origins:');
  allowedOrigins.forEach(origin => {
    if (origin instanceof RegExp) {
      console.log(`   - ${origin} (regex pattern)`);
    } else {
      console.log(`   - ${origin}`);
    }
  });

  console.log('\n📋 Available Endpoints:');
  console.log('   GET  /              - API info');
  console.log('   GET  /api/health    - Health check');
  console.log('   POST /api/auth/*    - Authentication');
  console.log('   GET  /api/resources - Get resources');
  console.log('   POST /api/resources/upload - Upload file');
  console.log('   GET  /api/files/:id - View/Download PDF');
  console.log('   GET  /api/admin/*   - Admin routes');
  console.log('   GET  /api/features  - Features & stats');
  console.log('   POST /api/contact   - Contact form');
  console.log('   GET  /api/about     - About information');
  console.log('   GET  /api/debug/gridfs - Debug GridFS');
  console.log('   GET  /api/test/file/:id - Test file endpoint');
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