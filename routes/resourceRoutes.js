const express = require("express");
const router = express.Router();
const resourceController = require("../controllers/resourceController");
const authMiddleware = require("../middleware/auth");

// ✅ FIXED: Import the direct GridFS upload middleware
const { upload, uploadToGridFS } = require("../middleware/gridfsUploadDirect");

// Public routes
router.get("/", resourceController.getResources);
router.get("/:id", resourceController.getResourceById);

// Protected routes (require authentication)
router.get("/user/bookmarks", authMiddleware, resourceController.getBookmarks);
router.get("/user/my-uploads", authMiddleware, resourceController.getMyUploads);

// ✅ FIXED: Upload route with proper GridFS handling
router.post(
  "/upload",
  authMiddleware,
  upload.single("file"),        // First, receive file in memory
  uploadToGridFS,              // Second, upload to GridFS
  resourceController.uploadResource  // Third, create resource record
);

router.post("/:id/like", authMiddleware, resourceController.toggleLike);
router.post("/:id/bookmark", authMiddleware, resourceController.toggleBookmark);

module.exports = router;