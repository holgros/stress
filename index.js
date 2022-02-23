const express = require("express");
const app = express();
app.use(express.static("publik"));
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/socket.html");
});
const http = require("http");
const server = http.createServer(app);
server.listen(3000);
console.log("Kör servern på localhost:3000");

// importera socket.io
const { Server } = require("socket.io");
const io = new Server(server);