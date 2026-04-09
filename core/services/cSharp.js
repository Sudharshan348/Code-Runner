const fs = require("fs");
const { v1: uuidv1 } = require("uuid");
const config = require("./config");
const {
  pickAvailableCommand,
  missingRuntimeError,
  runShellCommand,
} = require("./utils");
const env = process.env.NODE_ENV;
const configPath = config.codePath;
const timeOut = config.timeOut;

const csharpCompiler = pickAvailableCommand(
  process.platform === "win32"
    ? [{ command: "csc", args: [], checkArgs: ["/help"] }]
    : [{ command: "mcs", args: [], checkArgs: ["--version"] }]
);

// This should never happen
const validate = (str) => {
  words = ["File.", "Directory.", "Environment", "DirectoryInfo", "FileInfo"];
  // prevent imports
  var valid = !words.some((el) => {
    return str.includes(el);
  });

  return valid;
};

const runCode = (code, func) => {
  if (!csharpCompiler) {
    return func(
      missingRuntimeError(
        "C# compiler",
        process.platform === "win32"
          ? "Install the .NET SDK or Visual Studio Build Tools so `csc` is available on PATH."
          : "Install Mono so `mcs` is available on PATH."
      )
    );
  }

  if (validate(code)) {
    if (!code.match(/\bclass\s+Main\b/m) || !code.match(/\bstatic\s+void\s+Main\b/m)) {
      return func({
        ERROR:
          "Please declare a correct class and 'Main' method as the entry point of your application!",
      });
    }

    var fileName = uuidv1();
    var fileNamePath = configPath + fileName;
    var actualFile = fileNamePath + ".cs";

    console.log(fileNamePath);

    fs.writeFile(actualFile, code, function (err) {
      if (err) {
        // handle error
        console.log("Error creating file: " + err);
      } else {
        const executablePath = `${fileNamePath}.exe`;
        var command =
          process.platform === "win32"
            ? `csc /nologo /out:"${executablePath}" "${actualFile}" && "${executablePath}"`
            : `mcs -out:"${executablePath}" "${actualFile}" && mono "${executablePath}"`;
        console.log(fileNamePath);
        runShellCommand({ command, timeout: timeOut }, function (error, stdout, stderr) {
          if (error) {
            if (env != "production") {
              console.log("Error: " + error);
              console.log("Stderr: " + stderr);
            }

            if (
              error.toString().includes("ERR_CHILD_PROCESS_STDIO_MAXBUFFER")
            ) {
              errorMessage =
                "Process terminated. 'maxBuffer' exceeded. This normally happens during an infinite loop.";
            } else if (error.signal === "SIGTERM") {
              errorMessage =
                "Process terminated. Please check your code and try again.";
            } else if (stderr) {
              errorMessage = stderr;
            } else {
              errorMessage = "Something went wrong. Please try again";
            }
            func({ ERROR: errorMessage }, fileNamePath);
          } else {
            if (env != "production") {
              console.log("Successfully executed !");
              console.log("Stdout: " + stdout);
            }
            console.log(stdout);
            func({ stdout: stdout }, fileNamePath);
          }
        });
      }
    });
  } else {
    console.log(code);
    func({ ERROR: "Not allowed!" });
  }
};

const run = (code, func) => {
  runCode(code, function (data, fileName = null) {
    if (fileName) {
      fs.unlink(fileName + ".exe", (err) => {
        if (err) {
          console.error(err);
        }
      });
      fs.unlink(fileName + ".cs", (err) => {
        if (err) {
          console.error(err);
        }
      });
    }
    // add more logic
    func(data);
  });
};

module.exports = { run: run };
