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
let idLanguages = [];
let languageData;
fs.readFile("language.json", "utf-8", (jsonErr, jsonData) => {
    languageData = JSON.parse(jsonData);
});

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

    idLanguages[req.session.playerId] = req.session.lang;
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

// generera meddelande när spelet är slut
let getGameOverMsg = (game, player) => {
    let lang = idLanguages[player];
    delete idLanguages[player];
    lang = languageData.filter(function(item) {
        return item.language == lang;
    });
    let msg;
    if (lang.length > 0) {
        msg = lang[0].vocabulary.GAMEOVER;
        let won = ((game.players.name1 == player && game.player1.visible.length == 0) || (game.players.name2 == player && game.player2.visible.length == 0));
        if (won) msg += lang[0].vocabulary.YOUHAVEWON;
        else msg += lang[0].vocabulary.YOUHAVELOST;
    }
    return msg;
}

// generera felmeddelande
let getErrorMsg = (player, type) => {
    let lang = idLanguages[player];
    lang = languageData.filter(function(item) {
        return item.language == lang;
    });
    let msg;
    if (lang.length > 0) {
        switch (type) {
            case "GameNotFound":
                msg = lang[0].vocabulary.ERRORGAMENOTFOUND;
                break;
            case "GameCanceled":
                msg = lang[0].vocabulary.GAMECANCELED;
        }
    }
    return msg;
}

// avgöra om spelare redan har startat ett spel
let isPlayer = (id) => {
    for (let i = 0; i < games.length; i++) {
        if (games[i].player1.name == id || games[i].player2.name == id) return true;
    }
    return false;
}

/*
// Fisher-Yates (Knuth) algorithm
let shuffle = (array) => {
    let currentIndex = array.length,  randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}
*/

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
        if (gameId == undefined) socket.emit("error", {type: getErrorMsg(playerId, "ERROR-GAMENOTFOUND")});
        let game = games[gameId];
        let gameInfo = game.getInfo(playerId);
        gameInfo.waiting = true;
        game.waiting = true;
        socket.emit("updateGame", gameInfo);
        gameInfo = game.getInfo(playerId);
        socket.emit("wait", TIMEOUTMILLISECONDS);
        setTimeout(() => {
            if (game.face1.length + game.face2.length < 2 || game.standoff()) {
                if (mock) game.nextFaces();     // TA BORT VID DEPLOYMENT
                else game.nextFace(playerId);
            }
            socket.emit("updateGame", gameInfo);
            game.waiting = false;
            if (game.standoff()) handleStandoff(game);
        }, TIMEOUTMILLISECONDS);
    });

    // för att hämta spelet igen
    socket.on("getGame", (playerId) => {
        let gameId = getGamesIndexOverloaded(playerId);
        let type = "GameNotFound";
        if (gameId == undefined) socket.emit("error", getErrorMsg(playerId, type));
        let game = games[gameId];
        if (game.waiting) return;
        let gameInfo = game.getInfo(playerId);
        socket.emit("updateGame", gameInfo);
    });

    socket.on("abortGame", (playerId) => {
        let type = "GameCanceled";
        socket.emit("abortGame", {msg: getErrorMsg(playerId, type)});
        // ta bort spelet och meddela motspelaren
        let gameId = getGamesIndexOverloaded(playerId);
        let game = games[gameId];
        if (game) game.canceled = true;
        delete idLanguages[playerId];
    });

    // när någon har gjort något i spelet
    socket.on("playerMove", (data) => {
        //console.log("playerMove");
        let gameId = getGamesIndexOverloaded(data.player);
        let game = games[gameId];
        let gameInfo;
        if (game.gameover) {
            gameInfo = game.getInfo(data.player);
            gameInfo.gameover = true;
            socket.emit("updateGame", gameInfo);
            return;
        }
        if (game.canceled) {
            games = games.filter((value, index, arr) => {
                return value != game;
            });
            let type = "GameCanceled";
            emitToAllPlayerSockets(game.player1.name, "abortGame", {msg: getErrorMsg(game.player1.name, type)});
            emitToAllPlayerSockets(game.player2.name, "abortGame", {msg: getErrorMsg(game.player2.name, type)});
            delete idLanguages[data.player];
            //socket.emit("abortGame", {msg: msg});
            return;
        }
        let typeOfMove = game.getTypeOfMove(data);
        if (!typeOfMove) return;    // if undefined
        let opponent = game.player1.name;
        if (opponent == data.player) opponent = game.player2.name;
        switch(typeOfMove) {
            case "standard move":
                game.moveCards(data);
                
                /* MOCK
                console.log("Mocking stress...");
                game.face1.push({suit: "H", value: 0, unicode: "&#x1F0B1"})
                game.face2.push({suit: "S", value: 0, unicode: "&#x1F0A1"})
                */
                
                gameInfo = game.getInfo(data.player);
                if (game.player1.visible.length == 0 || game.player2.visible.length == 0) {
                    gameInfo.gameover = true;
                    game.gameover = true;
                    emitToAllPlayerSockets(data.player, "gameover", getGameOverMsg(game, data.player));
                    emitToAllPlayerSockets(opponent, "gameover", getGameOverMsg(game, opponent));
                }
                socket.emit("updateGame", gameInfo);
                gameInfo = game.getInfo(opponent);
                for (let i = 0; i < gameSockets.length; i++) {
                    if (gameSockets[i].playerId == opponent) {
                        gameSockets[i].emit("updateGame", gameInfo);
                        if (game.gameover) {
                            gameSockets[i].emit("gameover", getGameOverMsg(game, opponent));
                        }
                    }
                }
                if (game.standoff()) handleStandoff(game);
                break;
            case "claim":
                console.log("CLAIM!");
                game.handleClaim(data.player, data.face);
                gameInfo = game.getInfo(data.player);                
                emitToAllPlayerSockets(data.player, "updateGame", gameInfo);
                gameInfo = game.getInfo(opponent);
                emitToAllPlayerSockets(opponent, "updateGame", gameInfo);
                emitToAllPlayerSockets(data.player, "wait", TIMEOUTMILLISECONDS);
                emitToAllPlayerSockets(opponent, "wait", TIMEOUTMILLISECONDS);
                game.nextFace(data.player);
                game.nextFace(opponent);
                setTimeout(() => {
                    gameInfo = game.getInfo(data.player);                
                    emitToAllPlayerSockets(data.player, "updateGame", gameInfo);
                    gameInfo = game.getInfo(opponent);
                    emitToAllPlayerSockets(opponent, "updateGame", gameInfo);
                    if (game.standoff()) handleStandoff(game);
                }, TIMEOUTMILLISECONDS);
                break;
            case "stress":
                console.log("STRESS!");
                game.handleStress(data.player);
                gameInfo = game.getInfo(data.player);                
                emitToAllPlayerSockets(data.player, "updateGame", gameInfo);
                gameInfo = game.getInfo(opponent);
                emitToAllPlayerSockets(opponent, "updateGame", gameInfo);
                emitToAllPlayerSockets(data.player, "wait", TIMEOUTMILLISECONDS);
                emitToAllPlayerSockets(opponent, "wait", TIMEOUTMILLISECONDS);
                game.nextFace(data.player);
                game.nextFace(opponent);
                setTimeout(() => {
                    gameInfo = game.getInfo(data.player);                
                    emitToAllPlayerSockets(data.player, "updateGame", gameInfo);
                    gameInfo = game.getInfo(opponent);
                    emitToAllPlayerSockets(opponent, "updateGame", gameInfo);
                    if (game.standoff()) handleStandoff(game);
                }, TIMEOUTMILLISECONDS);
                break;
            default:
                gameInfo = game.getInfo(data.player);
                emitToAllPlayerSockets(data.player, "updateGame", gameInfo);
        }
    });

    let handleStandoff = (game) => {
        console.log("STANDOFF!!");
        if (game.stress()) return;
        if (game.player1.deck.length + game.player2.deck.length < 2) {
            game.stalemate = true;
            console.log("STALEMATE!!");
        }
        else {
            game.stalemate = false;
        }
        for (let name in game.players) {
            let playerId = game.players[name];
            let mySockets = getSocketsById(playerId);
            if (game.stalemate) {
                for (let s of mySockets) {
                    s.emit("stalemate");
                }
                continue;
            }
            if (mock) game.nextFaces();     // TA BORT VID DEPLOYMENT
            else game.nextFace(playerId);
            for (let s of mySockets) {
                s.emit("wait", TIMEOUTMILLISECONDS);
            }
            setTimeout(() => {
                let myGameInfo = game.getInfo(playerId);
                console.log(myGameInfo);
                emitToAllPlayerSockets(playerId, "updateGame", myGameInfo);
                /*
                for (let s of mySockets) {
                    s.emit("updateGame", gameInfo);
                }
                */
                game.waiting = false;   // ta bort? fyller ingen funktion?
            }, TIMEOUTMILLISECONDS);
        }
        setTimeout(() => {
            if (game.standoff()) handleStandoff(game);
        }, TIMEOUTMILLISECONDS + 100);
    }

    let getSocketsById = (id) => {
        let output = [];
        for (let i = 0; i < gameSockets.length; i++) {
            if (gameSockets[i].playerId == id) {
                output.push(gameSockets[i]);
            }
        }
        return output;
    }

    let emitToAllPlayerSockets = (player, evt, data) => {
        let mySockets = getSocketsById(player);
        for (let i = 0; i < mySockets.length; i++) {
            mySockets[i].emit(evt, data);
        }
    }

});