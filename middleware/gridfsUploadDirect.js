const multer = require("multer");
const { GridFSBucket } = require("mongodb");
const mongoose = require("mongoose");
const crypto = require("crypto");
const path = require("path");
const { Readable } = require("stream");

if (!process.env.MONGO_URI) {
  throw new Error("❌ MONGO_URI is missing in environment variables");
}

// Custom storage engine for GridFS
const gridFsStorage = (req, file, cb) => {
  crypto.randomBytes(16, (err, buf) => {
    if (err) return cb(err);

    const ext = path.extname(file.originalname).toLowerCase();
    const filename = buf.toString("hex") + ext;
    
    // Store file info in request for later use
    file.generatedFilename = filename;
    file.bucketName = "uploads";
    file.metadata = {
      originalName: file.originalname,
      uploadedAt: new Date(),
      mimetype: file.mimetype
    };
    
    cb(null, {
      destination: null,
      filename: filename
    });
  });
};

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

    // Get GridFS bucket
    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, {
      bucketName: "uploads"
    });

    // Generate unique filename
    const ext = path.extname(req.file.originalname).toLowerCase();
    const filename = crypto.randomBytes(16).toString("hex") + ext;

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
        resolve();
      });
      
      uploadStream.on("error", (error) => {
        reject(error);
      });
    });

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { upload, uploadToGridFS };