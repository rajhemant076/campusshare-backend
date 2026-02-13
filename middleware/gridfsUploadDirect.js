// middleware/gridfsUploadDirect.js
const multer = require("multer");
const { GridFSBucket } = require("mongodb");
const mongoose = require("mongoose");
const crypto = require("crypto");
const path = require("path");
const { Readable } = require("stream");

if (!process.env.MONGO_URI) {
  throw new Error("❌ MONGO_URI is missing in environment variables");
}

// Memory storage (we'll upload to GridFS manually)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".pdf") {
      return cb(new Error("Only PDF files are allowed!"), false);
    }
    cb(null, true);
  }
});

// Middleware to upload from memory to GridFS
const uploadToGridFS = async (req, res, next) => {
  try {
    if (!req.file) {
      return next();
    }

    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB not connected');
    }

    // Get GridFS bucket
    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, {
      bucketName: "uploads",
      chunkSizeBytes: 255 * 1024, // 255KB chunks
    });

    // Generate unique filename
    const ext = path.extname(req.file.originalname).toLowerCase();
    const filename = crypto.randomBytes(16).toString("hex") + ext;

    console.log('📤 Uploading to GridFS:', {
      originalName: req.file.originalname,
      filename: filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // Create readable stream from buffer
    const readableStream = new Readable();
    readableStream.push(req.file.buffer);
    readableStream.push(null);

    // Upload to GridFS
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        originalName: req.file.originalname,
        uploadedAt: new Date(),
        mimetype: req.file.mimetype,
        size: req.file.size
      }
    });

    // Pipe the file to GridFS
    readableStream.pipe(uploadStream);

    // Wait for upload to complete
    await new Promise((resolve, reject) => {
      uploadStream.on("finish", () => {
        // Add GridFS file info to request
        req.file.id = uploadStream.id;
        req.file.filename = filename;
        req.file.gfsId = uploadStream.id;
        
        console.log('✅ GridFS upload complete:', {
          fileId: uploadStream.id,
          filename: filename
        });
        
        resolve();
      });
      
      uploadStream.on("error", (error) => {
        console.error('❌ GridFS upload error:', error);
        reject(error);
      });
    });

    next();
  } catch (error) {
    console.error('❌ uploadToGridFS error:', error);
    next(error);
  }
};

// Helper function to verify GridFS setup
const verifyGridFS = async (db) => {
  try {
    const collections = await db.listCollections().toArray();
    const filesExist = collections.some(c => c.name === 'uploads.files');
    const chunksExist = collections.some(c => c.name === 'uploads.chunks');
    
    console.log('\n📊 GridFS Status:');
    console.log(`   - uploads.files: ${filesExist ? '✅' : '❌'}`);
    console.log(`   - uploads.chunks: ${filesExist ? '✅' : '❌'}`);
    
    if (filesExist) {
      const filesCount = await db.collection('uploads.files').countDocuments();
      const chunksCount = await db.collection('uploads.chunks').countDocuments();
      console.log(`   - Total files: ${filesCount}`);
      console.log(`   - Total chunks: ${chunksCount}`);
    }
    
    return { filesExist, chunksExist };
  } catch (error) {
    console.error('❌ Error verifying GridFS:', error);
    return { filesExist: false, chunksExist: false };
  }
};

module.exports = { upload, uploadToGridFS, verifyGridFS };