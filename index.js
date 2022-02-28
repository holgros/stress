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
    req.session.language = req.params.lang;
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
                    let conn0 = connections[0];
                    let conn1 = connections[1];
                    conn1.emit("startGame", conn0.myId);
                    conn1.disconnect();
                    conn0.emit("startGame", conn1.myId);
                    conn0.disconnect();
                    connections = connections.filter((value, index, arr) => {
                        return value != conn0 && value != conn1; // ta bort från connections
                    });
                }
                console.log("Antal uppkopplade: " + connections.length);
            });
        });
    });
});

// starta spelet
app.get("/game", (req, res) => {
    /*
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
    */
    req.session.opponent = "Firefox*-*1645990401188!";  // MOCK
    req.session.name = "Chrome*-*1645990389929!";       // MOCK
    req.session.language = "sv";                        // MOCK
    fs.readFile("game.html", "utf-8", (err, htmlData) => {
        let playerId = req.session.name;
        let opponentId = req.session.opponent;
        let html = htmlData.replace("---NAME---", playerId.split("*-*")[0]);
        html = html.replace("---OPPONENT---", opponentId.split("*-*")[0]);
        fs.readFile("language.json", "utf-8", (jsonErr, jsonData) => {
            html = getHtml(req.session.language, jsonData, html);
            res.send(html);
        });
    });
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