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
let connections = [];
const redis = require('redis')
let RedisStore = require("connect-redis")(sessions);
let client  = redis.createClient();
let sessionMiddleware = sessions({
    store: new RedisStore({ host: 'localhost', port: 6379, client: client,ttl :  260}), // XXX redis server config
    secret: "keyboard cat",
});
io.use(function(socket, next) {
    sessionMiddleware(socket.request, socket.request.res || {}, next);
});
app.use(sessionMiddleware);

// importera klassen Game
const Game = require("./Game.js");
let games = [];

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
        session.requestGame = true;
    }
    res.redirect(`/welcome/${session.lang}`);
});

// logga ut
app.get("/logout", (req, res) => {
    let language = req.session.lang;
    req.session.destroy();
    res.redirect("/start/" + language);   // senast använda språket
});
let i = 0;
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
                socket.on("gameRequest", () => {
                    console.log(req.session);
                    console.log(socket.request.session);
                    i++;
                    console.log("Denna funktion har anropats " + i + " gånger.");
                    console.log("requestGame="+req.session.requestGame);
                    if (!req.session.requestGame) {
                        //console.log("Vill inte spela!");
                        return;
                    }
                    //console.log("Någon vill spela...");
                    socket.myId = req.session.name + "*-*" + req.session.time;  // unikt id
                    let push = true;
                    for (let i = 0; i < connections.length; i++) {
                        if (connections[i].myId == socket.myId) {
                            push = false;
                            break;
                        }
                    }
                    if (push) {
                        connections.push(socket);
                    }
                    //console.log("Antal uppkopplade på rad 106: " + connections.length);
                    socket.on("disconnect", () => {
                        connections = connections.filter((value, index, arr) => {
                            console.log("Tvingad disconnect!");
                            return value != socket; // ta bort från connections
                        });
                    });
                    if (connections.length > 1) {
                        let conn0 = connections[0];
                        let conn1 = connections[1];
                        conn1.emit("startGame", conn0.myId);
                        console.log("Started game for " + conn1.myId + " with opponent " + conn0.myId);
                        conn1.disconnect();
                        conn0.emit("startGame", conn1.myId);
                        console.log("Started game for " + conn0.myId + " with opponent " + conn1.myId);
                        conn0.disconnect();
                        connections = connections.filter((value, index, arr) => {
                            return value != conn0 && value != conn1; // ta bort från connections
                        });
                    }
                    //console.log("Antal uppkopplade på rad 125: " + connections.length);
                    for (let i = 0; i < connections.length; i++) {
                        console.log(connections[i].myId);
                    }
                });
            });
        });
    });
});

app.get("/getopponent", (req, res) => {
    //console.log("Getting opponent!");
    //console.log("req.session.requestGame="+req.session.requestGame);
    req.session.opponent = req.query.opponent;
    req.session.requestGame = false;
    //console.log(req.session);
    //console.log(req.query.opponent);
    res.redirect("/game");
});

// starta spelet
app.get("/game", (req, res) => {
    //req.session.opponent = "Firefox*-*1645990401188!";  // MOCK
    //req.session.name = "Chrome*-*1645990389929!";       // MOCK
    //req.session.language = "sv";                        // MOCK
    if (!req.session.opponent) {
        req.session.destroy();
        res.redirect("/");
        return;
    }
    let myId = req.session.name + "*-*" + req.session.time; // unikt id
    let gamesIndex = getGamesIndex(myId, req.session.opponent);
    fs.readFile("game.html", "utf-8", (err, htmlData) => {
        let playerName = req.session.name;
        let opponentId = req.session.opponent;
        let html = htmlData.replaceAll("---NAME---", playerName);
        html = html.replaceAll("---OPPONENT---", opponentId.split("*-*")[0]);
        fs.readFile("language.json", "utf-8", (jsonErr, jsonData) => {
            html = getHtml(req.session.language, jsonData, html);
            res.send(html);
            io.on("connect", (socket) => {
                socket.myId = myId;
                //console.log(`socket.myId=${socket.myId}`);
                //console.log("Game:");
                //console.log(games[gamesIndex]);
            });
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
            htmlData = htmlData.replaceAll(key, vocabulary[key]);
        }
    }
    return htmlData;
};

// hämta index för spelet i games, lägg in om inte redan finns
let getGamesIndex = (id1, id2) => {
    for (let i = 0; i < games.length; i++) {
        if (games[i].player1.name == id1 && games[i].player2.name == id2 ||
            games[i].player2.name == id1 && games[i].player1.name == id2) {
                return i;
            }
    }
    let game = new Game(id1, id2);
    games.push(game);
    return games.length - 1;
}
