const express = require("express");
const router = express.Router();
const resourceController = require("../controllers/resourceController");
const authMiddleware = require("../middleware/auth");

// ✅ GridFS Upload Middleware
const upload = require("../middleware/gridfsUpload");

// Public routes
router.get("/", resourceController.getResources);
router.get("/:id", resourceController.getResourceById);

// Protected routes (require authentication)
router.get("/user/bookmarks", authMiddleware, resourceController.getBookmarks);
router.get("/user/my-uploads", authMiddleware, resourceController.getMyUploads);

router.post(
  "/upload",
  authMiddleware,
  upload.single("file"),
  resourceController.uploadResource
);

router.post("/:id/like", authMiddleware, resourceController.toggleLike);
router.post("/:id/bookmark", authMiddleware, resourceController.toggleBookmark);

module.exports = router;
