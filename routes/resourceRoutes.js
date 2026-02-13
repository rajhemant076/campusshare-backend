const express = require("express");
const router = express.Router();
const { upload, uploadToGridFS } = require("../middleware/gridfsUploadDirect"); // ✅ Use direct version
const authMiddleware = require("../middleware/auth");
const {
  uploadResource,
  getResources,
  getResourceById,
  toggleLike,
  toggleBookmark,
  getBookmarks,
  getMyUploads,
} = require("../controllers/resourceController");

// Public routes
router.get("/", getResources);
router.get("/:id", getResourceById);

// Protected routes
router.get("/user/bookmarks", authMiddleware, getBookmarks);
router.get("/user/my-uploads", authMiddleware, getMyUploads);

// ✅ FIXED: Upload with direct GridFS approach
router.post(
  "/upload",
  authMiddleware,
  upload.single("file"),
  uploadToGridFS,  // This middleware uploads buffer to GridFS
  uploadResource
);

// Like/Bookmark routes
router.post("/:id/like", authMiddleware, toggleLike);
router.post("/:id/bookmark", authMiddleware, toggleBookmark);

module.exports = router;