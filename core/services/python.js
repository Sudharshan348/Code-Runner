const fs = require("fs");
const { v1: uuidv1 } = require("uuid");
const config = require("./config");
const {
  pickAvailableCommand,
  missingRuntimeError,
  runCommand,
} = require("./utils");
const env = process.env.NODE_ENV;
const configPath = config.codePath;
const timeOut = config.timeOut;

const pythonRuntime = pickAvailableCommand(
  process.platform === "win32"
    ? [
        { command: "py", args: ["-3"], checkArgs: ["-3", "--version"] },
        { command: "python", args: [], checkArgs: ["--version"] },
      ]
    : [{ command: "python3", args: [], checkArgs: ["--version"] }]
);

// Hacky validation
const validate = (str) => {
  reg1 = RegExp(/\bimport\W+(?:\w+\W+){0,}(?:os|subprocess|importlib)\b/g);
  words = ["open(","os"];

  if (str.match(reg1)) {
    return false;
  } else if (
    words.every((el) => str.toLowerCase().includes(el.toLowerCase()))
  ) {
    return false;
  }
  return true;
};

const runCode = (code, func) => {
  if (!pythonRuntime) {
    return func(
      missingRuntimeError(
        "Python 3",
        "Install Python and ensure `py` or `python` is available from the terminal."
      )
    );
  }

  if (validate(code)) {
    var fileName = uuidv1();
    var actualFile = configPath + fileName + ".py";
    fs.writeFile(actualFile, code, function (err) {
      if (err) {
        // handle error
        console.log("Error creating file: " + err);
      } else {
        runCommand(
          {
            command: pythonRuntime.command,
            args: pythonRuntime.args.concat(actualFile),
            timeout: timeOut,
          },
          function (error, stdout, stderr) {
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
            func({ ERROR: errorMessage }, actualFile);
          } else {
            if (env != "production") {
              console.log("Successfully executed !");
              console.log("Stdout: " + stdout);
            }
            func({ stdout: stdout }, actualFile);
          }
          }
        );
      }
    });
  } else {
    console.log(code);
    func({ ERROR: "Not allowed!" });
  }
};

const run = (code, func) => {
  runCode(code, function (data, file = null) {
    if (file) {
      fs.unlink(file, (err) => {
        if (err) {
          console.error(err);
        }
        //file removed
      });
    }
    // add more logic
    func(data);
  });
};

module.exports = { run: run };
