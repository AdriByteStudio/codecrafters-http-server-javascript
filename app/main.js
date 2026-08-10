const net = require("net");

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    const requestText = data.toString();
    const [requestLine, ...headerLines] = requestText.split("\r\n");
    const [, path] = requestLine.split(" ");

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

    let response;

    if (path === "/user-agent") {
      const body = headers["user-agent"] || "";
      const contentLength = Buffer.byteLength(body, "utf8");

      response = `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${contentLength}\r\n\r\n${body}`;
    } else if (path.startsWith("/echo/")) {
      const echoValue = path.slice("/echo/".length);
      const body = echoValue;
      const contentLength = Buffer.byteLength(body, "utf8");

      response = `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${contentLength}\r\n\r\n${body}`;
    } else if (path === "/") {
      response = "HTTP/1.1 200 OK\r\n\r\n";
    } else {
      response = "HTTP/1.1 404 Not Found\r\n\r\n";
    }

    socket.write(response);
    socket.end();
  });
});

server.listen(4221, "localhost");
