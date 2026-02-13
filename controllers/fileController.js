// controllers/fileController.js

const mongoose = require("mongoose");

// ✅ Get GridFS bucket with error handling
const getGridFSBucket = () => {
  if (!mongoose.connection.db) {
    throw new Error('MongoDB connection not ready');
  }
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "uploads",
    chunkSizeBytes: 255 * 1024, // 255KB chunks
  });
};

// ✅ VIEW / DOWNLOAD FILE
exports.getFile = async (req, res) => {
  try {
    console.log('\n📥 File request received for ID:', req.params.id);
    
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      console.error('❌ MongoDB not connected');
      return res.status(500).json({ 
        success: false, 
        message: "Database connection not ready" 
      });
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.error('❌ Invalid file ID format:', req.params.id);
      return res.status(400).json({ 
        success: false, 
        message: "Invalid file ID format" 
      });
    }

    const fileId = new mongoose.Types.ObjectId(req.params.id);
    console.log('🔍 Looking for file with ID:', fileId);

    // Get file metadata
    const db = mongoose.connection.db;
    const filesCollection = db.collection('uploads.files');
    
    const file = await filesCollection.findOne({ _id: fileId });

    if (!file) {
      console.error('❌ File not found in database:', fileId);
      return res.status(404).json({ 
        success: false, 
        message: "File not found" 
      });
    }

    // Get filename for display
    const displayFilename = file.metadata?.originalName || file.filename || 'document.pdf';

    console.log('✅ File found:', {
      id: file._id,
      filename: file.filename,
      displayName: displayFilename,
      size: file.length,
      sizeMB: (file.length / (1024 * 1024)).toFixed(2),
      contentType: file.contentType || 'application/pdf',
    });

    // Set proper headers for PDF viewing
    res.setHeader('Content-Type', file.contentType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(displayFilename)}"`);
    res.setHeader('Content-Length', file.length);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Create download stream
    const bucket = getGridFSBucket();
    const downloadStream = bucket.openDownloadStream(fileId);
    
    // Handle stream errors
    downloadStream.on('error', (error) => {
      console.error('❌ Download stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error streaming file',
          error: error.message
        });
      }
    });

    // Handle successful completion
    downloadStream.on('end', () => {
      console.log('✅ File stream completed successfully');
    });

    // Pipe the file to response
    downloadStream.pipe(res);

  } catch (err) {
    console.error('❌ Get file error:', err);
    
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Error fetching file',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
      });
    }
  }
};

// Rest of your fileController.js remains the same...// ✅ DELETE FILE - IMPROVED VERSION
exports.deleteFile = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ 
        success: false, 
        message: "Database connection not ready" 
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid file ID format" 
      });
    }

    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const db = mongoose.connection.db;
    const filesCollection = db.collection('uploads.files');
    
    // Check if file exists
    const file = await filesCollection.findOne({ _id: fileId });

    if (!file) {
      return res.status(404).json({ 
        success: false, 
        message: "File not found" 
      });
    }

    console.log('🗑️ Deleting file:', {
      id: fileId,
      filename: file.filename,
      size: file.length
    });

    const bucket = getGridFSBucket();
    await bucket.delete(fileId);
    
    console.log('✅ File deleted successfully');

    res.status(200).json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (err) {
    console.error("❌ Delete file error:", err);
    res.status(500).json({
      success: false,
      message: "Error deleting file",
      error: process.env.NODE_ENV === "development" ? err.message : "Internal server error"
    });
  }
};

// ✅ GET FILE INFO - NEW HELPER ENDPOINT
exports.getFileInfo = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid file ID format" 
      });
    }

    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const db = mongoose.connection.db;
    const filesCollection = db.collection('uploads.files');
    
    const file = await filesCollection.findOne({ _id: fileId });

    if (!file) {
      return res.status(404).json({ 
        success: false, 
        message: "File not found" 
      });
    }

    res.json({
      success: true,
      file: {
        id: file._id,
        filename: file.filename,
        originalName: file.metadata?.originalName,
        size: file.length,
        sizeMB: (file.length / (1024 * 1024)).toFixed(2),
        contentType: file.contentType,
        uploadDate: file.uploadDate,
        metadata: file.metadata
      }
    });
  } catch (error) {
    console.error('Get file info error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching file info',
      error: error.message
    });
  }
};