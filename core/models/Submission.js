const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    language: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
    },
    output: {
      type: String,
      default: "",
    },
    executionStatus: {
      type: String,
      enum: ["draft", "success", "error"],
      default: "draft",
    },
    adminReviewStatus: {
      type: String,
      enum: ["pending", "reviewed", "needs_changes"],
      default: "pending",
    },
    adminFeedback: {
      type: String,
      default: "",
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.Submission ||
  mongoose.model("Submission", submissionSchema);
