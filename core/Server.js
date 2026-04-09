const path = require("path");
const express = require("express");
const formidable = require("express-formidable");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const { connectDatabase } = require("./db");
const { seedAdmin } = require("./seedAdmin");
const { requireAuth, requireRole } = require("./middleware/auth");
const User = require("./models/User");
const Submission = require("./models/Submission");
const python = require("./services/python");
const java = require("./services/java");
const javascript = require("./services/javascript");
const cSharp = require("./services/cSharp");
const golang = require("./services/golang");
const rust = require("./services/rust");

const app = express();
const port = process.env.PORT || 6500;
const frontend = process.env.FRONTEND || "http://localhost:3000";
const codeFormParser = formidable({
  multiples: false,
});

app.use(express.json());

const corsOptions = () => {
  if (process.env.NODE_ENV === "production") {
    return {
      origin: frontend,
      optionsSuccessStatus: 200,
      methods: "GET,POST,PATCH",
    };
  }

  return {
    origin: true,
    credentials: true,
    optionsSuccessStatus: 200,
  };
};

app.use(cors(corsOptions()));

const issueToken = (user) =>
  jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

const getPayload = (req) =>
  req.body && Object.keys(req.body).length > 0 ? req.body : req.fields || {};

const normalizeExecutionResult = (payload) => {
  if (!payload) {
    return { output: "", executionStatus: "draft" };
  }

  if (payload.ERROR) {
    return { output: payload.ERROR, executionStatus: "error" };
  }

  return {
    output: payload.stdout || "",
    executionStatus: "success",
  };
};

const runLanguage = (language, text, res) => {
  const handlers = {
    python,
    javascript,
    csharp: cSharp,
    java,
    golang,
    rust,
  };

  const runtime = handlers[language];
  if (!runtime) {
    return res.status(422).send("Invalid programming language!");
  }

  runtime.run(text, function (data) {
    res.status(200).json(data);
  });
};

app.get("/", (req, res) => {
  res.send("Code Runner backend is live.");
});

app.post("/auth/register", async (req, res) => {
  try {
    const payload = getPayload(req);
    const name = (payload.name || "").trim();
    const email = (payload.email || "").trim().toLowerCase();
    const password = (payload.password || "").trim();
    const role = payload.role === "admin" ? "admin" : "student";

    if (!name || !email || !password) {
      return res
        .status(422)
        .json({ message: "Name, email, and password are required." });
    }

    if (password.length < 6) {
      return res
        .status(422)
        .json({ message: "Password must be at least 6 characters long." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email is already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
    });

    const token = issueToken(user);
    return res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to register user." });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const payload = getPayload(req);
    const email = (payload.email || "").trim().toLowerCase();
    const password = (payload.password || "").trim();
    const role = payload.role === "admin" ? "admin" : "student";

    if (!email || !password) {
      return res
        .status(422)
        .json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid login credentials." });
    }

    if (user.role !== role) {
      return res
        .status(403)
        .json({ message: `This account does not have ${role} access.` });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid login credentials." });
    }

    const token = issueToken(user);
    return res.json({ token, user: sanitizeUser(user) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to log in." });
  }
});

app.get("/auth/me", requireAuth, (req, res) => {
  return res.json({ user: sanitizeUser(req.user) });
});

app.post("/code", codeFormParser, (req, res) => {
  const payload = getPayload(req);
  const text = payload.text;
  const language = payload.language;

  if (!text || !(text.length > 1)) {
    return res.status(422).send("Write some code!");
  }

  if (!language) {
    return res.status(422).send("Select a programming language!");
  }

  console.log(language, text);
  return runLanguage(language, text, res);
});

app.post("/submissions", requireAuth, async (req, res) => {
  try {
    const payload = getPayload(req);
    const title = (payload.title || "").trim();
    const language = (payload.language || "").trim();
    const code = payload.code || "";
    const output = payload.output || "";
    const executionStatus =
      payload.executionStatus === "error"
        ? "error"
        : payload.executionStatus === "success"
        ? "success"
        : "draft";

    if (!title || !language || !code) {
      return res
        .status(422)
        .json({ message: "Title, language, and code are required." });
    }

    const submission = await Submission.create({
      user: req.user._id,
      title,
      language,
      code,
      output,
      executionStatus,
    });

    return res.status(201).json({ submission });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to save submission." });
  }
});

app.get("/submissions/mine", requireAuth, async (req, res) => {
  try {
    const submissions = await Submission.find({ user: req.user._id }).sort({
      updatedAt: -1,
    });

    return res.json({ submissions });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to load submissions." });
  }
});

app.get(
  "/admin/submissions",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const submissions = await Submission.find({})
        .populate("user", "name email role")
        .sort({ updatedAt: -1 });

      return res.json({ submissions });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ message: "Failed to load student submissions." });
    }
  }
);

app.patch(
  "/admin/submissions/:id/review",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const payload = getPayload(req);
      const adminReviewStatus =
        payload.adminReviewStatus === "needs_changes"
          ? "needs_changes"
          : "reviewed";
      const adminFeedback = (payload.adminFeedback || "").trim();

      const submission = await Submission.findByIdAndUpdate(
        req.params.id,
        {
          adminReviewStatus,
          adminFeedback,
          reviewedAt: new Date(),
        },
        { new: true }
      ).populate("user", "name email role");

      if (!submission) {
        return res.status(404).json({ message: "Submission not found." });
      }

      return res.json({ submission });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Failed to save review." });
    }
  }
);

app.post("/submissions/run-and-save", requireAuth, async (req, res) => {
  try {
    const payload = getPayload(req);
    const title = (payload.title || "").trim();
    const language = (payload.language || "").trim();
    const code = payload.code || "";

    if (!title || !language || !code) {
      return res
        .status(422)
        .json({ message: "Title, language, and code are required." });
    }

    const runtimeMap = {
      python,
      javascript,
      csharp: cSharp,
      java,
      golang,
      rust,
    };

    const runtime = runtimeMap[language];
    if (!runtime) {
      return res.status(422).json({ message: "Invalid programming language." });
    }

    runtime.run(code, async (result) => {
      try {
        const normalized = normalizeExecutionResult(result);
        const submission = await Submission.create({
          user: req.user._id,
          title,
          language,
          code,
          output: normalized.output,
          executionStatus: normalized.executionStatus,
        });

        return res.json({ result, submission });
      } catch (error) {
        console.error(error);
        return res
          .status(500)
          .json({ message: "Code ran, but saving failed unexpectedly." });
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to execute submission." });
  }
});

const startServer = async () => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing. Add it to the root .env file.");
    }

    await connectDatabase();
    await seedAdmin();

    app.listen(port, () => {
      console.log(`Backend listening at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start backend:", error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
