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

// default-språk är svenska
app.get("/", (req, res) => {
    res.redirect("/sv");
});
app.get("/:lang", (req, res) => {
    if (session) {
        res.send(`Hej ${session.name}!`);
    }
    else {
        io.on("connect", (socket) => {
            console.log("Connected!");
        });
        fs.readFile("language.json", "utf-8", (err, data) => {
            fs.readFile("index.html", "utf-8", (err, html) => {
                let output = getHtml(req.params.lang, data, html);
                res.send(output);
            });
        });
    }
});

// starta session
app.post("/:lang", (req, res) => {
    session=req.session;
    session.lang = req.params.lang;
    session.name = req.body.inputName;
    res.redirect(`/${req.params.lang}`);
});

/*
interna funktioner
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