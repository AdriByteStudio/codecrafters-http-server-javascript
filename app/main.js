const fs = require("fs");
const net = require("net");
const path = require("path");
const zlib = require("zlib");

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

function parseHttpRequest(buffer) {
  const headerDelimiter = buffer.indexOf("\r\n\r\n");

  if (headerDelimiter === -1) {
    return null;
  }

  const headerSection = buffer.subarray(0, headerDelimiter).toString("utf8");
  const lines = headerSection.split("\r\n");
  const [requestLine, ...headerLines] = lines;
  const [method, pathName] = requestLine.split(" ");

  const headers = headerLines.reduce((acc, line) => {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex !== -1) {
      const name = line.slice(0, separatorIndex).trim().toLowerCase();
      const value = line.slice(separatorIndex + 1).trim();
      acc[name] = value;
    }
    return acc;
  }, {});

  const contentLength = Number.parseInt(headers["content-length"] || "0", 10);
  const headerLength = headerDelimiter + 4;

  if (buffer.length < headerLength + contentLength) {
    return { incomplete: true };
  }

  const body = buffer.subarray(headerLength, headerLength + contentLength).toString("utf8");

  return {
    method,
    pathName,
    headers,
    body,
    bytesConsumed: headerLength + contentLength,
  };
}

const server = net.createServer((socket) => {
  let buffer = Buffer.alloc(0);

  socket.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (true) {
      const parsed = parseHttpRequest(buffer);

      if (!parsed) {
        break;
      }

      if (parsed.incomplete) {
        break;
      }

      buffer = buffer.subarray(parsed.bytesConsumed);

      const { method, pathName, headers, body } = parsed;
      let response;

      if (pathName === "/user-agent") {
        const userAgentBody = headers["user-agent"] || "";
        const contentLength = Buffer.byteLength(userAgentBody, "utf8");

        response = `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${contentLength}\r\n\r\n${userAgentBody}`;
      } else if (pathName.startsWith("/echo/")) {
        const echoValue = pathName.slice("/echo/".length);
        const bodyText = echoValue;
        const acceptEncoding = headers["accept-encoding"] || "";
        const isGzipAccepted = acceptEncoding.split(",").map((value) => value.trim().toLowerCase()).includes("gzip");

        let headersResponse = "HTTP/1.1 200 OK\r\nContent-Type: text/plain";
        let responseBody = bodyText;
        let contentLength;

        if (isGzipAccepted) {
          const compressedBody = zlib.gzipSync(bodyText);
          responseBody = compressedBody;
          contentLength = compressedBody.length;
          headersResponse += "\r\nContent-Encoding: gzip";
        } else {
          contentLength = Buffer.byteLength(bodyText, "utf8");
        }

        headersResponse += `\r\nContent-Length: ${contentLength}\r\n\r\n`;

        socket.write(headersResponse);
        socket.write(responseBody);
        continue;
      } else if (pathName.startsWith("/files/")) {
        const fileName = pathName.slice("/files/".length);
        const filePath = path.join(rootDirectory, fileName);

        if (method === "POST") {
          fs.writeFileSync(filePath, body);
          response = "HTTP/1.1 201 Created\r\n\r\n";
        } else if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const fileContents = fs.readFileSync(filePath);
          const responseHeaders = `HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Length: ${fileContents.length}\r\n\r\n`;

          socket.write(responseHeaders);
          socket.write(fileContents);
          continue;
        } else {
          response = "HTTP/1.1 404 Not Found\r\n\r\n";
        }
      } else if (pathName === "/") {
        response = "HTTP/1.1 200 OK\r\n\r\n";
      } else {
        response = "HTTP/1.1 404 Not Found\r\n\r\n";
      }

      socket.write(response);
    }
  });
});

server.listen(4221, "localhost");
