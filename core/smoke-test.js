require("./Server");

const http = require("http");

const send = (body) =>
  new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: 6500,
        path: "/code",
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve({ status: res.statusCode, data });
        });
      }
    );

    req.on("error", reject);
    req.write(body);
    req.end();
  });

setTimeout(async () => {
  try {
    const js = await send("text=console.log(123)&language=javascript");
    const py = await send("text=print(123)&language=python");
    const go = await send(
      "text=package%20main%0Afunc%20main()%20%7B%7D&language=golang"
    );

    console.log(JSON.stringify({ js, py, go }, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}, 1000);
