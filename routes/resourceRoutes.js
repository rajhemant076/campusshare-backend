// routes/resourceRoutes.js

const express = require("express");
const router = express.Router();
const { upload, uploadToGridFS } = require("../middleware/gridfsUploadDirect");
const authMiddleware = require("../middleware/auth");
const {
  getResources,           // ✅ Make sure this is included
  uploadResource,
  getResourceById,
  toggleLike,
  toggleBookmark,
  getBookmarks,
  getMyUploads,
} = require("../controllers/resourceController");

// Public routes
router.get("/", getResources);           // This was line 16 causing the error
router.get("/:id", getResourceById);

// Protected routes
router.get("/user/bookmarks", authMiddleware, getBookmarks);
router.get("/user/my-uploads", authMiddleware, getMyUploads);

// Upload route with direct GridFS approach
router.post(
  "/upload",
  authMiddleware,
  upload.single("file"),
  uploadToGridFS,
  uploadResource
);

// Like/Bookmark routes
router.post("/:id/like", authMiddleware, toggleLike);
router.post("/:id/bookmark", authMiddleware, toggleBookmark);

module.exports = router;