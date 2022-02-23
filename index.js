const express = require("express");
const app = express();
app.use(express.static("publik"));
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/socket.html");
});
const http = require("http");
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`listening on ${PORT}`));

// importera socket.io
const { Server } = require("socket.io");
const io = new Server(server);