const express = require("express");
const router = express.Router();
const { getFile, deleteFile, getFileInfo } = require("../controllers/fileController");
const authMiddleware = require("../middleware/auth");
const adminMiddleware = require("../middleware/admin");

// ✅ Public route - anyone can view/download files
router.get("/:id", getFile);

// ✅ Optional: Get file info (useful for debugging)
router.get("/:id/info", getFileInfo);

// ✅ Protected route - only admin can delete files
router.delete("/:id", authMiddleware, adminMiddleware, deleteFile);

module.exports = router;