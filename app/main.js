const fs = require("fs");
const net = require("net");
const path = require("path");

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

const args = process.argv.slice(2);
let directory = ".";

for (let i = 0; i < args.length; i += 1) {
  if (args[i] === "--directory") {
    directory = args[i + 1] || ".";
  }
}

const rootDirectory = path.resolve(directory);

const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    const requestText = data.toString();
    const [requestLine, ...headerLines] = requestText.split("\r\n");
    const [method, pathName] = requestLine.split(" ");

    const headers = headerLines
      .slice(0, -1)
      .reduce((acc, line) => {
        const separatorIndex = line.indexOf(":");
        if (separatorIndex !== -1) {
          const name = line.slice(0, separatorIndex).trim().toLowerCase();
          const value = line.slice(separatorIndex + 1).trim();
          acc[name] = value;
        }
        return acc;
      }, {});

    const requestBody = requestText.split("\r\n\r\n")[1] || "";
    let response;

    if (pathName === "/user-agent") {
      const body = headers["user-agent"] || "";
      const contentLength = Buffer.byteLength(body, "utf8");

      response = `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${contentLength}\r\n\r\n${body}`;
    } else if (pathName.startsWith("/echo/")) {
      const echoValue = pathName.slice("/echo/".length);
      const body = echoValue;
      const contentLength = Buffer.byteLength(body, "utf8");

      response = `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${contentLength}\r\n\r\n${body}`;
    } else if (pathName.startsWith("/files/")) {
      const fileName = pathName.slice("/files/".length);
      const filePath = path.join(rootDirectory, fileName);

      if (method === "POST") {
        fs.writeFileSync(filePath, requestBody);
        response = "HTTP/1.1 201 Created\r\n\r\n";
      } else if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const fileContents = fs.readFileSync(filePath);
        const responseHeaders = `HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Length: ${fileContents.length}\r\n\r\n`;

        socket.write(responseHeaders);
        socket.write(fileContents);
        socket.end();
        return;
      } else {
        response = "HTTP/1.1 404 Not Found\r\n\r\n";
      }
    } else if (pathName === "/") {
      response = "HTTP/1.1 200 OK\r\n\r\n";
    } else {
      response = "HTTP/1.1 404 Not Found\r\n\r\n";
    }

    socket.write(response);
    socket.end();
  });
});

server.listen(4221, "localhost");
