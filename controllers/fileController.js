const mongoose = require("mongoose");

let gfsBucket;

mongoose.connection.once("open", () => {
  gfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "uploads",
  });
  console.log("✅ GridFS Bucket Initialized");
});

// VIEW / DOWNLOAD FILE
exports.getFile = async (req, res) => {
  try {
    if (!gfsBucket) {
      return res.status(500).json({ 
        success: false, 
        message: "GridFS not ready. Please try again in a moment." 
      });
    }

    // ✅ FIXED: Better ObjectId validation
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid file ID format" 
      });
    }

    const fileId = new mongoose.Types.ObjectId(req.params.id);

    const files = await mongoose.connection.db
      .collection("uploads.files")
      .find({ _id: fileId })
      .toArray();

    if (!files || files.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "File not found" 
      });
    }

    const file = files[0];

    // Set headers
    res.set("Content-Type", file.contentType || "application/pdf");
    res.set("Content-Disposition", `inline; filename="${encodeURIComponent(file.filename)}"`);
    res.set("Cache-Control", "public, max-age=3600");

    const downloadStream = gfsBucket.openDownloadStream(fileId);
    
    downloadStream.on("error", (error) => {
      console.error("Download stream error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: "Error streaming file",
          error: error.message
        });
      }
    });

    downloadStream.pipe(res);

  } catch (err) {
    console.error("Get file error:", err);
    return res.status(500).json({
      success: false,
      message: "Error fetching file",
      error: process.env.NODE_ENV === "development" ? err.message : "Internal server error"
    });
  }
};

// DELETE FILE
exports.deleteFile = async (req, res) => {
  try {
    if (!gfsBucket) {
      return res.status(500).json({ 
        success: false, 
        message: "GridFS not ready" 
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid file ID format" 
      });
    }

    const fileId = new mongoose.Types.ObjectId(req.params.id);

    // Check if file exists before deleting
    const files = await mongoose.connection.db
      .collection("uploads.files")
      .find({ _id: fileId })
      .toArray();

    if (!files || files.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "File not found" 
      });
    }

    await gfsBucket.delete(fileId);

    res.status(200).json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (err) {
    console.error("Delete file error:", err);
    res.status(500).json({
      success: false,
      message: "Error deleting file",
      error: process.env.NODE_ENV === "development" ? err.message : "Internal server error"
    });
  }
};