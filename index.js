const mock = false;  // FALSE VID DEPLOYMENT
const MOCKOPPONENT = "Firefox*-*" + Date.now();
const TIMEOUTMILLISECONDS = 3000;

const express = require("express");
const fs = require("fs");
const app = express();
const http = require("http");
const sessions = require('express-session');
app.use(express.static("publik"));
app.use(express.urlencoded({extended: true}));
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`listening on ${PORT}`));
const LANGUAGES = ["sv", "en"];
const DEFAULT_LANGUAGE = "sv";

// importera socket.io
const { Server } = require("socket.io");
const io = new Server(server);
let gameRequests = [];
let tempMatchings = {};
let gameSockets = [];

// sessionshantering
const oneHour = 1000 * 60 * 60;
app.use(sessions({
    secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
    saveUninitialized:true,
    cookie: { maxAge: oneHour },
    resave: false
}));

// importera klassen Game
const Game = require("./Game.js");
const { emit } = require("process");
let games = [];

// omdirigera till start med lämpligt språk
app.get("/", (req, res) => {
    res.redirect("start");
});
app.get("/start", (req, res) => {
    if (req.session.lang) res.redirect("start/" + req.session.lang);
    else res.redirect("start/" + DEFAULT_LANGUAGE);
});
app.get("/start/:lang", (req, res) => {
    if (!LANGUAGES.includes(req.params.lang)) {
        res.redirect("/");
        return;
    }
    req.session.lang = req.params.lang;
    if (req.session.playerId) {
        res.redirect(`../welcome/${req.params.lang}`);
        return;
    }
    fs.readFile("language.json", "utf-8", (err, data) => {
        fs.readFile("index.html", "utf-8", (err, html) => {
            let output = getHtml(req.params.lang, data, html);
            res.send(output);
        });
    });
});

// spara playerId och vidarebefordra till kö
app.post("/start/:lang", (req, res) => {
    req.session.playerName = req.body.inputName;
    if (!req.session.requestTime) req.session.requestTime = req.body.time;
    req.session.playerId = req.session.playerName + "*-*" + req.session.requestTime;
    res.redirect("/welcome/" + req.params.lang);
});

// vänta på motståndare
app.get("/welcome/:lang", (req, res) => {
    if (req.params.lang) req.session.lang = req.params.lang;
    if (!req.session.playerName) {
        if (req.session.lang) res.redirect("/start/" + req.session.lang);
        else res.redirect("/");
        return;
    }
    if (req.session.playerId && isPlayer(req.session.playerId)) {
        res.redirect("/game");  // återuppta spel för spelare med matchande session
        return;
    }
    fs.readFile("language.json", "utf-8", (err, data) => {
        fs.readFile("welcome.html", "utf-8", (err, html) => {
            let output = getHtml(req.session.lang, data, html);
            output = output.replace("---NAME---", req.session.playerName);
            output = output.replace("PLAYER_ID", req.session.playerName + "*-*" + req.session.requestTime);
            res.send(output);
        });
    });
});

// logga ut
app.get("/logout", (req, res) => {
    let language = req.session.lang;
    req.session.destroy();
    res.redirect("/start/" + language);
});

// matcha spelare med motståndare
app.get("/getopponent", (req, res) => {
    req.session.opponent = tempMatchings[req.query.playerId];
    res.redirect("/game");
});

// starta spel
app.get("/game", (req, res) => {

    /* TA BORT VID DEPLOYMENT */
    if (mock) {
        req.session.opponent = MOCKOPPONENT;                // MOCK
        req.session.playerId = "Chrome*-*" + Date.now();    // MOCK
        req.session.playerName = "Chrome";                  // MOCK
        req.session.lang = "sv";                            // MOCK
    }
    /* TA BORT VID DEPLOYMENT */

    if (!req.session.opponent) {
        req.session.destroy();
        res.redirect("/");
        return;
    }
    fs.readFile("game.html", "utf-8", (err, htmlData) => {
        let playerName = req.session.playerName;
        let opponentId = req.session.opponent;
        let html = htmlData.replaceAll("---NAME---", playerName);
        html = html.replaceAll("---OPPONENT---", opponentId.split("*-*")[0]);
        html = html.replace("PLAYER_ID", req.session.playerId);
        fs.readFile("language.json", "utf-8", (jsonErr, jsonData) => {
            html = getHtml(req.session.lang, jsonData, html);
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
            htmlData = htmlData.replaceAll(key, vocabulary[key]);
        }
    }
    return htmlData;
};

// hämta index för spelet i games, lägg in nytt om inte redan finns
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

// överlagrad version av ovanstående - används när motståndarens id är okänt, t.ex. när man direkt går in på games-sidan
let getGamesIndexOverloaded = (id) => {
    for (let i = 0; i < games.length; i++) {
        if (games[i].player1.name == id || games[i].player2.name == id) {
            return i;
        }
    }
    if (mock) {
        games.push(new Game(id, MOCKOPPONENT));
        console.log("CREATED NEW GAME!");
        return games.length - 1;
    }
    return undefined;
}

// avgöra om spelare redan har startat ett spel
let isPlayer = (id) => {
    for (let i = 0; i < games.length; i++) {
        if (games[i].player1.name == id || games[i].player2.name == id) return true;
    }
    return false;
}

// socket-hanterare
io.on("connect", (socket) => {
    
    // när man ber om att få spela (welcome.html)
    socket.on("gameRequest", (id) => {
        socket.playerId = id;
        gameRequests.push(socket);
        //console.log("Kö efter gameRequest (" + gameRequests.length + "):");
        if (gameRequests.length > 1) {
            let conn0 = gameRequests[0];
            let conn1 = gameRequests[1];
            tempMatchings[conn0.playerId] = conn1.playerId;
            tempMatchings[conn1.playerId] = conn0.playerId;
            conn1.emit("startGame", conn1.playerId);
            console.log("Started game for " + conn1.playerId + " with opponent " + conn0.playerId);
            conn1.disconnect();
            conn0.emit("startGame", conn0.playerId);
            console.log("Started game for " + conn0.playerId + " with opponent " + conn1.playerId);
            conn0.disconnect();
            gameRequests = gameRequests.filter((value, index, arr) => {
                return value != conn0 && value != conn1; // ta bort från connections
            });
        }
    });
    
    // när uppkoppling avslutas
    socket.on("disconnect", () => {
        gameRequests = gameRequests.filter((value, index, arr) => {
            return value != socket; // ta bort från connections
        });
        gameSockets = gameSockets.filter((value, index, arr) => {
            return value != socket; // ta bort från connections
        });
    });

    // när spel startas
    socket.on("startGame", (playerId) => {
        socket.playerId = playerId;
        gameSockets.push(socket);
        let opponentId = tempMatchings[playerId];
        let gameId;
        if (opponentId) {
            delete tempMatchings[playerId];
            gameId = getGamesIndex(playerId, opponentId);
        }
        else gameId = getGamesIndexOverloaded(playerId);
        if (gameId == undefined) socket.emit("error", {type: "GameNotFound"});  // TODO: Godtycklig översättning
        let game = games[gameId];
        let gameInfo = game.getInfo(playerId);
        socket.emit("updateGame", gameInfo);
        if (game.face1.length + game.face2.length < 2 || game.standoff()) {
            if (mock) game.nextFaces();     // TA BORT VID DEPLOYMENT
            else game.nextFace(playerId);
        }
        gameInfo = game.getInfo(playerId);
        socket.emit("wait", TIMEOUTMILLISECONDS);
        setTimeout(() => {
            socket.emit("updateGame", gameInfo);
            game.waiting = false;
            if (game.standoff()) handleStandoff(game);
        }, TIMEOUTMILLISECONDS);
    });

    // för att hämta spelet igen
    socket.on("getGame", (playerId) => {
        let gameId = getGamesIndexOverloaded(playerId);
        let type = "GameNotFound";  // TODO: Godtycklig översättning
        if (gameId == undefined) socket.emit("error", {type: type});
        let game = games[gameId];
        let gameInfo = game.getInfo(playerId);
        socket.emit("updateGame", gameInfo);
    });

    socket.on("abortGame", (playerId) => {
        let msg = "Game has been canceled!";    // TODO: Godtycklig översättning
        socket.emit("abortGame", {msg: msg});
        // ta bort spelet och meddela motspelaren
        let gameId = getGamesIndexOverloaded(playerId);
        let game = games[gameId];
        game.canceled = true;
    });

    // när någon har gjort något i spelet
    socket.on("playerMove", (data) => {
        let gameId = getGamesIndexOverloaded(data.player);
        let game = games[gameId];
        if (game.canceled) {
            games = games.filter((value, index, arr) => {
                return value != game;
            });
            let msg = "Game has been canceled!";    // TODO: Godtycklig översättning
            socket.emit("abortGame", {msg: msg});
            return;
        }
        let typeOfMove = game.getTypeOfMove(data);
        if (!typeOfMove) return;    // if undefined
        switch(typeOfMove) {
            case "standard move":
                game.moveCards(data);
                gameInfo = game.getInfo(data.player);
                if (game.player1.visible.length == 0 || game.player2.visible.length == 0) {
                    gameInfo.gameover = true;
                }
                socket.emit("updateGame", gameInfo);
                let opponent = game.player1.name;
                if (opponent == data.player) opponent = game.player2.name;
                for (let i = 0; i < gameSockets.length; i++) {
                    if (gameSockets[i].playerId == opponent) {
                        gameInfo = game.getInfo(opponent);
                        gameSockets[i].emit("updateGame", gameInfo);
                    }
                }
                if (game.standoff()) handleStandoff(game);
                break;
            case "stress":
                // code block
                break;
        }
    });

    let handleStandoff = (game) => {
        console.log("STANDOFF!!");
        if (game.player1.deck.length + game.player2.deck.length < 2) {
            game.stalemate = true;
            console.log("STALEMATE!!");
            return;
        }
        else {
            game.stalemate = false;
        }
        for (let playerId in game.players) {
            if (mock) game.nextFaces();     // TA BORT VID DEPLOYMENT
            else game.nextFace(playerId);
            gameInfo = game.getInfo(playerId);
            socket.emit("wait", TIMEOUTMILLISECONDS);
            setTimeout(() => {
                socket.emit("updateGame", gameInfo);
                game.waiting = false;
                if (game.standoff()) handleStandoff(game);
            }, TIMEOUTMILLISECONDS);
        }

    }

});