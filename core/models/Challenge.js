const mongoose = require("mongoose");

const testCaseSchema = new mongoose.Schema(
  {
    input: {
      type: String,
      required: true,
      default: "",
    },
    expectedOutput: {
      type: String,
      required: true,
      default: "",
    },
    explanation: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const challengeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "easy",
    },
    problemStatement: {
      type: String,
      required: true,
    },
    inputSpecification: {
      type: String,
      required: true,
    },
    outputSpecification: {
      type: String,
      required: true,
    },
    constraintsText: {
      type: String,
      default: "",
    },
    timeLimitMs: {
      type: Number,
      default: 2000,
      min: 250,
    },
    memoryLimitMb: {
      type: Number,
      default: 256,
      min: 16,
    },
    publicTestCases: {
      type: [testCaseSchema],
      default: [],
    },
    hiddenTestCases: {
      type: [testCaseSchema],
      default: [],
    },
    starterCode: {
      type: Map,
      of: String,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.Challenge || mongoose.model("Challenge", challengeSchema);
