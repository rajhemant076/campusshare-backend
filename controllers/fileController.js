const mongoose = require("mongoose");

// ✅ FIXED: Get GridFS bucket on each request instead of relying on connection event
const getGridFSBucket = () => {
  if (!mongoose.connection.db) {
    throw new Error('MongoDB connection not ready');
  }
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "uploads",
  });
};

// VIEW / DOWNLOAD FILE - COMPLETELY REWRITTEN
exports.getFile = async (req, res) => {
  try {
    console.log('📥 File request received for ID:', req.params.id);
    console.log('🔌 MongoDB connection state:', mongoose.connection.readyState);
    
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

    // Get file metadata directly from the collection
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

    console.log('✅ File found:', {
      filename: file.filename,
      size: file.length,
      contentType: file.contentType || 'application/pdf',
      uploadDate: file.uploadDate
    });

    // Create GridFS bucket
    const bucket = new mongoose.mongo.GridFSBucket(db, {
      bucketName: "uploads"
    });

    // Set proper headers for PDF viewing
    res.setHeader('Content-Type', file.contentType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.filename)}"`);
    res.setHeader('Content-Length', file.length);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    // Create download stream
    const downloadStream = bucket.openDownloadStream(fileId);
    
    // Handle errors
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

// DELETE FILE
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
    const bucket = new mongoose.mongo.GridFSBucket(db, {
      bucketName: "uploads"
    });

    // Check if file exists
    const filesCollection = db.collection('uploads.files');
    const file = await filesCollection.findOne({ _id: fileId });

    if (!file) {
      return res.status(404).json({ 
        success: false, 
        message: "File not found" 
      });
    }

    await bucket.delete(fileId);
    console.log('✅ File deleted:', fileId);

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