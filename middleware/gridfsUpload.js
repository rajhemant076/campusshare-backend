const multer = require("multer");
const { GridFsStorage } = require("multer-gridfs-storage");
const crypto = require("crypto");
const path = require("path");

if (!process.env.MONGO_URI) {
  throw new Error("❌ MONGO_URI is missing in environment variables");
}

const storage = new GridFsStorage({
  url: process.env.MONGO_URI,
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

        resolve({
          filename,
          bucketName: "uploads",
          metadata: {
            originalName: file.originalname,
          },
        });
      });
    });
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

module.exports = upload;
