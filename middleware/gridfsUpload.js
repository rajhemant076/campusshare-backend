const multer = require("multer");
const { GridFsStorage } = require("multer-gridfs-storage");
const crypto = require("crypto");
const path = require("path");

if (!process.env.MONGO_URI) {
  throw new Error("❌ MONGO_URI is missing in environment variables");
}

console.log('🔧 Initializing GridFS Storage...');

// ✅ FIXED: Proper configuration for multer-gridfs-storage
const storage = new GridFsStorage({
  url: process.env.MONGO_URI,
  options: { 
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: "campusshare"
  },
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      // Validate PDF
      const ext = path.extname(file.originalname).toLowerCase();
      if (ext !== ".pdf") {
        return reject(new Error("Only PDF files are allowed!"));
      }

      // Create unique filename
      crypto.randomBytes(16, (err, buf) => {
        if (err) return reject(err);

        const filename = buf.toString("hex") + ext;

        // ✅ CRITICAL FIX: Return the correct file info structure
        const fileInfo = {
          filename: filename,
          bucketName: "uploads",
          metadata: {
            originalName: file.originalname,
            uploadedAt: new Date(),
            contentType: file.mimetype,
            size: file.size
          }
        };
        
        console.log('📁 GridFS file info:', {
          filename: fileInfo.filename,
          originalName: file.originalname,
          bucket: fileInfo.bucketName
        });
        
        resolve(fileInfo);
      });
    });
  }
});

// Create multer upload middleware
const upload = multer({
  storage,
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

// ✅ Helper function to verify GridFS setup
const verifyGridFS = async (db) => {
  try {
    const collections = await db.listCollections().toArray();
    const filesExist = collections.some(c => c.name === 'uploads.files');
    const chunksExist = collections.some(c => c.name === 'uploads.chunks');
    
    console.log('\n📊 GridFS Status:');
    console.log(`   - uploads.files: ${filesExist ? '✅' : '❌'}`);
    console.log(`   - uploads.chunks: ${chunksExist ? '✅' : '❌'}`);
    
    if (filesExist) {
      const filesCount = await db.collection('uploads.files').countDocuments();
      const chunksCount = await db.collection('uploads.chunks').countDocuments();
      console.log(`   - Total files: ${filesCount}`);
      console.log(`   - Total chunks: ${chunksCount}`);
    }
    
    if (!filesExist || !chunksExist) {
      console.log('⚠️  GridFS collections will be created automatically on first upload');
    }
    
    return { filesExist, chunksExist };
  } catch (error) {
    console.error('❌ Error verifying GridFS:', error);
    return { filesExist: false, chunksExist: false };
  }
};

module.exports = { upload, verifyGridFS };