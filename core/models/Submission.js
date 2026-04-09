const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    challenge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Challenge",
      default: null,
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
      enum: ["draft", "success", "error", "judged"],
      default: "draft",
    },
    verdict: {
      type: String,
      enum: ["", "AC", "WA", "TLE", "MLE", "CE", "RE"],
      default: "",
    },
    timeLimitMs: {
      type: Number,
      default: null,
    },
    memoryLimitMb: {
      type: Number,
      default: null,
    },
    totalTestCases: {
      type: Number,
      default: 0,
    },
    passedTestCases: {
      type: Number,
      default: 0,
    },
    lastRuntimeMs: {
      type: Number,
      default: null,
    },
    testResults: {
      type: [
        {
          _id: false,
          index: Number,
          visibility: {
            type: String,
            enum: ["public", "hidden"],
            default: "hidden",
          },
          verdict: String,
          input: String,
          expectedOutput: String,
          actualOutput: String,
          runtimeMs: Number,
        },
      ],
      default: [],
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
