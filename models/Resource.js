const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    branch: {
      type: String,
      required: true,
      enum: ["CSE", "ECE", "EEE", "MECH", "CIVIL", "IT", "OTHER"],
    },
    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["Notes", "Assignment", "PYQ", "Lab"],
    },

    // ✅ GridFS File ID (important)
    fileId: {
      type: String,
      required: true,
    },

    fileUrl: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    likesCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
resourceSchema.index({ branch: 1, semester: 1, subject: 1, type: 1 });
resourceSchema.index({ status: 1 });
resourceSchema.index({ title: "text", description: "text" });

module.exports = mongoose.model("Resource", resourceSchema);
