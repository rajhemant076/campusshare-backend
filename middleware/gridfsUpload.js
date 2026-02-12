const multer = require("multer");
const { GridFsStorage } = require("multer-gridfs-storage");
const crypto = require("crypto");
const path = require("path");

if (!process.env.MONGO_URI) {
  throw new Error("❌ MONGO_URI is missing in environment variables");
}

// ✅ FIXED: Correct configuration for multer-gridfs-storage v5+
const storage = new GridFsStorage({
  url: process.env.MONGO_URI,
  options: { 
    dbName: "campusshare" // 👈 Add your database name here
  },
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      // ✅ Better PDF validation
      const ext = path.extname(file.originalname).toLowerCase();
      if (ext !== ".pdf") {
        return reject(new Error("Only PDF files are allowed!"));
      }

      crypto.randomBytes(16, (err, buf) => {
        if (err) return reject(err);

        const filename = buf.toString("hex") + ext;

        // ✅ FIXED: Proper file metadata structure for v5+
        resolve({
          filename: filename,
          bucketName: "uploads",
          metadata: {
            originalName: file.originalname,
            uploadedAt: new Date(),
            contentType: file.mimetype
          }
        });
      });
    });
  }
});

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

module.exports = upload;