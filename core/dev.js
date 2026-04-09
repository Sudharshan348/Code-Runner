const { spawn } = require("child_process");
const path = require("path");

const rootDir = __dirname;
const frontendDir = path.resolve(rootDir, "..", "frontend");

const children = [];

const startProcess = (command, args, options = {}) => {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: false,
    ...options,
  });

  children.push(child);
  return child;
};

const shutdown = (exitCode = 0) => {
  children.forEach((child) => {
    if (!child.killed) {
      child.kill();
    }
  });
  process.exit(exitCode);
};

const backend = startProcess("node", ["Server.js"], { cwd: rootDir });
const frontend = startProcess(
  "cmd.exe",
  ["/c", "set NODE_OPTIONS=--openssl-legacy-provider && yarn start"],
  {
    cwd: frontendDir,
    env: { ...process.env, NODE_OPTIONS: "--openssl-legacy-provider" },
  }
);

backend.on("exit", (code) => shutdown(code ?? 0));
frontend.on("exit", (code) => shutdown(code ?? 0));

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
