const fs = require("fs");
const path = require("path");

const runtimeDir =
  process.env.CODE_PATH || path.resolve(__dirname, "..", "runtime");

if (!fs.existsSync(runtimeDir)) {
  fs.mkdirSync(runtimeDir, { recursive: true });
}

exports.codePath = `${runtimeDir}${path.sep}`;
exports.timeOut = Number(process.env.TIME_OUT) || 5000;
