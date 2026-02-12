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
      // allow only pdf
      if (file.mimetype !== "application/pdf") {
        return reject(new Error("Only PDF files are allowed!"));
      }

      crypto.randomBytes(16, (err, buf) => {
        if (err) return reject(err);

        const filename =
          buf.toString("hex") + path.extname(file.originalname);

        resolve({
          filename: filename,
          bucketName: "uploads", // GridFS collection: uploads.files & uploads.chunks
          metadata: {
            originalName: file.originalname,
          },
        });
      });
    });
  },
});

const upload = multer({ storage });

module.exports = upload;
