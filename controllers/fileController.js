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
      return res.status(500).json({ success: false, message: "GridFS not ready" });
    }

    const fileId = new mongoose.Types.ObjectId(req.params.id);

    const files = await mongoose.connection.db
      .collection("uploads.files")
      .find({ _id: fileId })
      .toArray();

    if (!files || files.length === 0) {
      return res.status(404).json({ success: false, message: "File not found" });
    }

    const file = files[0];

    // Set headers
    res.set("Content-Type", file.contentType || "application/pdf");
    res.set("Content-Disposition", `inline; filename="${file.filename}"`);

    const downloadStream = gfsBucket.openDownloadStream(fileId);
    downloadStream.pipe(res);

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Error fetching file",
      error: err.message,
    });
  }
};

// DELETE FILE
exports.deleteFile = async (req, res) => {
  try {
    if (!gfsBucket) {
      return res.status(500).json({ success: false, message: "GridFS not ready" });
    }

    const fileId = new mongoose.Types.ObjectId(req.params.id);

    await gfsBucket.delete(fileId);

    res.status(200).json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error deleting file",
      error: err.message,
    });
  }
};
