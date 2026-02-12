const express = require("express");
const router = express.Router();
const fileController = require("../controllers/fileController");

// view/download file
router.get("/:id", fileController.getFile);

// delete file
router.delete("/:id", fileController.deleteFile);

module.exports = router;
