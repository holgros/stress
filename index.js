const express = require("express");
const fs = require("fs");
const app = express();
const http = require("http");
const cookieParser = require("cookie-parser");
const sessions = require('express-session');
app.use(express.static("publik"));
app.use(express.urlencoded({extended: true}));
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`listening on ${PORT}`));

// importera socket.io
const { Server } = require("socket.io");
const io = new Server(server);

// sessionshantering
const oneHour = 1000 * 60 * 60;
app.use(sessions({
    secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
    saveUninitialized:true,
    cookie: { maxAge: oneHour },
    resave: false
}));
let session;
let connections = []

// default-språk är svenska
app.get("/", (req, res) => {
    res.redirect("start/sv");
});
app.get("/start/:lang", (req, res) => {
    if (req.params.lang == "undefined") {
        res.redirect("/");
        return;
    }
    if (req.session.lang) {
        res.redirect(`../welcome/${req.session.lang}`);
        return;
    }
    fs.readFile("language.json", "utf-8", (err, data) => {
        fs.readFile("index.html", "utf-8", (err, html) => {
            let output = getHtml(req.params.lang, data, html);
            res.send(output);
        });
    });
});

// starta session
app.post("/start/:lang", (req, res) => {
    if (!req.body.inputName.includes("*-*")) {
        session=req.session;
        session.lang = req.params.lang;
        session.name = req.body.inputName;
        session.time = Date.now();
    }
    res.redirect(`/welcome/${session.lang}`);
});

// logga ut
app.get("/logout", (req, res) => {
    let language = req.session.lang;
    req.session.destroy();
    res.redirect("/");
});

// inloggad
app.get("/welcome/:lang", (req, res) => {
    if (!req.session.name) {
        res.redirect("/");
        return;
    }
    fs.readFile("language.json", "utf-8", (err, data) => {
        fs.readFile("welcome.html", "utf-8", (err, html) => {
            let output = getHtml(req.params.lang, data, html);
            output = output.replace("---NAME---", req.session.name);
            res.send(output);
            io.on("connect", (socket) => {
                socket.myId = req.session.name + "*-*" + req.session.time;  // unikt id
                let push = true;
                for (let i = 0; i < connections.length; i++) {
                    if (connections[i].myId == socket.myId) {
                        push = false;
                    }
                }
                if (push) {
                    connections.push(socket);
                }
                socket.on("disconnect", () => {
                    connections = connections.filter((value, index, arr) => { 
                        return value != socket; // ta bort från connections
                    });
                });
                if (connections.length > 1) {
                    let opponent0 = connections[0].myId;
                    let opponent1 = connections[1].myId;
                    connections[1].emit("startGame", opponent0);
                    connections[1].disconnect();
                    connections[0].emit("startGame", opponent1);
                    connections[0].disconnect();
                }
                console.log("Antal uppkopplade: " + connections.length);
            });
        });
    });
});

// starta spelet
app.get("/game", (req, res) => {
    if (req.query.opponent) {
        req.session.opponent = req.query.opponent;
        console.log(req.session);
        res.redirect("/game");
        return;
    }
    if (!req.session.opponent) {
        res.redirect("/");
        return;
    }
    res.send(`Succé! Du spelar mot ${req.session.opponent}!`);
});

/*
hjälp-funktioner
*/

// hämta html i aktuellt språk
let getHtml = (targetLanguage, jsonData, htmlData) => {
    let lang = JSON.parse(jsonData);
    lang = lang.filter(function(item) {
        return item.language == targetLanguage;
    });
    if (lang.length > 0) {
        let vocabulary = lang[0].vocabulary;
        for (let key in vocabulary) {
            htmlData = htmlData.replace(key, vocabulary[key]);
        }
    }
    return htmlData;
};