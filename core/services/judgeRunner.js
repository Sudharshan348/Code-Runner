const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { codePath } = require("./config");
const {
  pickAvailableCommand,
  isCommandAvailable,
  runCommand,
} = require("./utils");

const pythonRuntime = pickAvailableCommand(
  process.platform === "win32"
    ? [
        { command: "py", args: ["-3"], checkArgs: ["-3", "--version"] },
        { command: "python", args: [], checkArgs: ["--version"] },
      ]
    : [{ command: "python3", args: [], checkArgs: ["--version"] }]
);

const csharpCompiler = pickAvailableCommand(
  process.platform === "win32"
    ? [{ command: "csc", args: [], checkArgs: ["/help"] }]
    : [{ command: "mcs", args: [], checkArgs: ["--version"] }]
);

const sanitizeOutput = (value) =>
  (value || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n+$/g, "");

const looksLikeMemoryError = (stderr = "") =>
  /(out\s+of\s+memory|heap\s+out\s+of\s+memory|memoryerror|std::bad_alloc)/i.test(
    stderr
  );

const looksLikeCompilationError = (language, stderr = "") => {
  if (!stderr) {
    return false;
  }

  if (["java", "csharp", "golang", "rust"].includes(language)) {
    return true;
  }

  return /(syntaxerror|compile|compilation)/i.test(stderr);
};

const toPromise = (params) =>
  new Promise((resolve) => {
    runCommand(params, (error, stdout, stderr, durationMs) => {
      resolve({
        error,
        stdout,
        stderr,
        durationMs: durationMs ?? error?.durationMs ?? null,
      });
    });
  });

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const safeRm = (target) => {
  if (!target || !fs.existsSync(target)) {
    return;
  }

  fs.rmSync(target, { recursive: true, force: true });
};

const serializeTestCase = (testCase) =>
  typeof testCase?.toObject === "function" ? testCase.toObject() : testCase;

const buildContext = (language, code) => {
  const id = uuidv4();
  const dir = path.join(codePath, id);
  ensureDir(dir);

  switch (language) {
    case "python": {
      const filePath = path.join(dir, "main.py");
      fs.writeFileSync(filePath, code);
      return {
        dir,
        async compile() {
          if (!pythonRuntime) {
            return {
              ok: false,
              verdict: "CE",
              stderr:
                "Python 3 is not installed or not available on PATH. Install Python and ensure `py` or `python` is available.",
            };
          }
          return { ok: true };
        },
        async run(stdin, timeLimitMs) {
          return toPromise({
            command: pythonRuntime.command,
            args: pythonRuntime.args.concat(filePath),
            cwd: dir,
            timeout: timeLimitMs,
            input: stdin,
          });
        },
      };
    }
    case "javascript": {
      const filePath = path.join(dir, "main.js");
      fs.writeFileSync(filePath, code);
      return {
        dir,
        async compile() {
          return { ok: true };
        },
        async run(stdin, timeLimitMs) {
          return toPromise({
            command: "node",
            args: [filePath],
            cwd: dir,
            timeout: timeLimitMs,
            input: stdin,
          });
        },
      };
    }
    case "java": {
      const filePath = path.join(dir, "Main.java");
      fs.writeFileSync(filePath, code);
      return {
        dir,
        async compile() {
          if (!isCommandAvailable("javac") || !isCommandAvailable("java")) {
            return {
              ok: false,
              verdict: "CE",
              stderr:
                "Java JDK is not installed or not available on PATH. Install a JDK and ensure both `javac` and `java` are available.",
            };
          }

          const result = await toPromise({
            command: "javac",
            args: ["Main.java"],
            cwd: dir,
            timeout: 10000,
          });

          if (result.error) {
            return {
              ok: false,
              verdict: "CE",
              stderr: result.stderr || result.error.message,
            };
          }

          return { ok: true };
        },
        async run(stdin, timeLimitMs) {
          return toPromise({
            command: "java",
            args: ["Main"],
            cwd: dir,
            timeout: timeLimitMs,
            input: stdin,
          });
        },
      };
    }
    case "csharp": {
      const filePath = path.join(dir, "Main.cs");
      const executablePath = path.join(
        dir,
        process.platform === "win32" ? "Main.exe" : "Main"
      );
      fs.writeFileSync(filePath, code);
      return {
        dir,
        async compile() {
          if (!csharpCompiler) {
            return {
              ok: false,
              verdict: "CE",
              stderr:
                "C# compiler is not installed or not available on PATH. Install the .NET SDK or Mono tooling.",
            };
          }

          const args =
            process.platform === "win32"
              ? ["/nologo", `/out:${executablePath}`, filePath]
              : [`-out:${executablePath}`, filePath];
          const compileCommand =
            process.platform === "win32" ? "csc" : csharpCompiler.command;

          const result = await toPromise({
            command: compileCommand,
            args,
            cwd: dir,
            timeout: 10000,
          });

          if (result.error) {
            return {
              ok: false,
              verdict: "CE",
              stderr: result.stderr || result.error.message,
            };
          }

          return { ok: true };
        },
        async run(stdin, timeLimitMs) {
          if (process.platform === "win32") {
            return toPromise({
              command: executablePath,
              args: [],
              cwd: dir,
              timeout: timeLimitMs,
              input: stdin,
            });
          }

          return toPromise({
            command: "mono",
            args: [executablePath],
            cwd: dir,
            timeout: timeLimitMs,
            input: stdin,
          });
        },
      };
    }
    case "golang": {
      const filePath = path.join(dir, "main.go");
      const executablePath = path.join(
        dir,
        process.platform === "win32" ? "main.exe" : "main"
      );
      fs.writeFileSync(filePath, code);
      return {
        dir,
        async compile() {
          if (!isCommandAvailable("go")) {
            return {
              ok: false,
              verdict: "CE",
              stderr:
                "Go is not installed or not available on PATH. Install Go and ensure the `go` command is available.",
            };
          }

          const result = await toPromise({
            command: "go",
            args: ["build", "-o", executablePath, "main.go"],
            cwd: dir,
            timeout: 15000,
          });

          if (result.error) {
            return {
              ok: false,
              verdict: "CE",
              stderr: result.stderr || result.error.message,
            };
          }

          return { ok: true };
        },
        async run(stdin, timeLimitMs) {
          return toPromise({
            command: executablePath,
            args: [],
            cwd: dir,
            timeout: timeLimitMs,
            input: stdin,
          });
        },
      };
    }
    case "rust": {
      const filePath = path.join(dir, "main.rs");
      const executablePath = path.join(
        dir,
        process.platform === "win32" ? "main.exe" : "main"
      );
      fs.writeFileSync(filePath, code);
      return {
        dir,
        async compile() {
          if (!isCommandAvailable("rustc")) {
            return {
              ok: false,
              verdict: "CE",
              stderr:
                "Rust is not installed or not available on PATH. Install Rust and ensure the `rustc` command is available.",
            };
          }

          const result = await toPromise({
            command: "rustc",
            args: ["main.rs", "-o", executablePath],
            cwd: dir,
            timeout: 15000,
          });

          if (result.error) {
            return {
              ok: false,
              verdict: "CE",
              stderr: result.stderr || result.error.message,
            };
          }

          return { ok: true };
        },
        async run(stdin, timeLimitMs) {
          return toPromise({
            command: executablePath,
            args: [],
            cwd: dir,
            timeout: timeLimitMs,
            input: stdin,
          });
        },
      };
    }
    default:
      throw new Error(`Unsupported language: ${language}`);
  }
};

const judgeSubmission = async ({ language, code, challenge, visibility = "all" }) => {
  const publicCases = (challenge.publicTestCases || []).map((testCase, index) => ({
    ...serializeTestCase(testCase),
    visibility: "public",
    index: index + 1,
  }));
  const hiddenCases = (challenge.hiddenTestCases || []).map((testCase, index) => ({
    ...serializeTestCase(testCase),
    visibility: "hidden",
    index: publicCases.length + index + 1,
  }));

  const selectedCases =
    visibility === "public" ? publicCases : publicCases.concat(hiddenCases);

  const context = buildContext(language, code);

  try {
    const compileResult = await context.compile();
    if (!compileResult.ok) {
      return {
        verdict: compileResult.verdict || "CE",
        summary: compileResult.stderr,
        totalTestCases: selectedCases.length,
        passedTestCases: 0,
        timeLimitMs: challenge.timeLimitMs,
        memoryLimitMb: challenge.memoryLimitMb,
        testResults: [],
      };
    }

    const testResults = [];

    for (const testCase of selectedCases) {
      const execution = await context.run(testCase.input || "", challenge.timeLimitMs);
      const actualOutput = sanitizeOutput(execution.stdout);
      const expectedOutput = sanitizeOutput(testCase.expectedOutput);

      if (execution.error) {
        const stderr = execution.stderr || execution.error.message || "";
        let verdict = "RE";

        if (execution.error.signal === "SIGTERM") {
          verdict = "TLE";
        } else if (looksLikeMemoryError(stderr)) {
          verdict = "MLE";
        } else if (looksLikeCompilationError(language, stderr)) {
          verdict = "CE";
        }

        testResults.push({
          index: testCase.index,
          visibility: testCase.visibility,
          verdict,
          input: testCase.input,
          expectedOutput: testCase.visibility === "public" ? testCase.expectedOutput : "",
          actualOutput: stderr || actualOutput,
          runtimeMs: execution.durationMs,
        });

        return {
          verdict,
          summary: stderr || execution.error.message,
          totalTestCases: selectedCases.length,
          passedTestCases: testResults.filter((item) => item.verdict === "AC").length,
          timeLimitMs: challenge.timeLimitMs,
          memoryLimitMb: challenge.memoryLimitMb,
          testResults,
        };
      }

      if (actualOutput !== expectedOutput) {
        testResults.push({
          index: testCase.index,
          visibility: testCase.visibility,
          verdict: "WA",
          input: testCase.input,
          expectedOutput: testCase.visibility === "public" ? testCase.expectedOutput : "",
          actualOutput,
          runtimeMs: execution.durationMs,
        });

        return {
          verdict: "WA",
          summary: "Output did not match the expected result.",
          totalTestCases: selectedCases.length,
          passedTestCases: testResults.filter((item) => item.verdict === "AC").length,
          timeLimitMs: challenge.timeLimitMs,
          memoryLimitMb: challenge.memoryLimitMb,
          testResults,
        };
      }

      testResults.push({
        index: testCase.index,
        visibility: testCase.visibility,
        verdict: "AC",
        input: testCase.input,
        expectedOutput: testCase.visibility === "public" ? testCase.expectedOutput : "",
        actualOutput,
        runtimeMs: execution.durationMs,
      });
    }

    return {
      verdict: "AC",
      summary: "Accepted across all evaluated test cases.",
      totalTestCases: selectedCases.length,
      passedTestCases: selectedCases.length,
      timeLimitMs: challenge.timeLimitMs,
      memoryLimitMb: challenge.memoryLimitMb,
      testResults,
    };
  } finally {
    safeRm(context.dir);
  }
};

module.exports = {
  judgeSubmission,
  sanitizeOutput,
};
