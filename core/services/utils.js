const { spawn, spawnSync } = require("child_process");

const isCommandAvailable = (command, args = ["--version"]) => {
  const result = spawnSync(command, args, {
    stdio: "ignore",
    shell: false,
  });

  return !result.error;
};

const pickAvailableCommand = (candidates) =>
  candidates.find((candidate) =>
    isCommandAvailable(candidate.command, candidate.checkArgs)
  );

const missingRuntimeError = (runtime, installHint) => ({
  ERROR: `${runtime} is not installed or not available on PATH. ${installHint}`,
});

const runCommand = ({ command, args = [], cwd, timeout, input = "" }, callback) => {
  const startedAt = Date.now();
  const child = spawn(command, args, {
    cwd,
    shell: false,
    windowsHide: true,
  });

  let stdout = "";
  let stderr = "";
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    child.kill();
  }, timeout);

  if (input) {
    child.stdin.write(input);
  }
  child.stdin.end();

  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });

  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  child.on("error", (error) => {
    clearTimeout(timer);
    error.durationMs = Date.now() - startedAt;
    callback(error, stdout, stderr);
  });

  child.on("close", (code, signal) => {
    clearTimeout(timer);
    const durationMs = Date.now() - startedAt;

    if (code !== 0 || signal) {
      const error = new Error(
        signal
          ? `Process exited with signal ${signal}`
          : `Process exited with code ${code}`
      );

      error.code = code;
      error.signal = timedOut ? "SIGTERM" : signal;
      error.durationMs = durationMs;
      callback(error, stdout, stderr);
      return;
    }

    callback(null, stdout, stderr, durationMs);
  });
};

const runShellCommand = ({ command, cwd, timeout, input = "" }, callback) =>
  runCommand(
    {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", command],
      cwd,
      timeout,
      input,
    },
    callback
  );

module.exports = {
  isCommandAvailable,
  missingRuntimeError,
  pickAvailableCommand,
  runCommand,
  runShellCommand,
};
