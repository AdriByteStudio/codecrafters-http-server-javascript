const net = require("net");

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    const requestLine = data.toString().split("\r\n")[0];
    const [, path] = requestLine.split(" ");

    let response;

    if (path.startsWith("/echo/")) {
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
