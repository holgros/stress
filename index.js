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
    if (req.params.lang == "logout") {
        let language = req.session.lang;
        req.session.destroy();
        res.redirect(`/${language}`);
        return;
    }
    fs.readFile("language.json", "utf-8", (err, data) => {
        if (req.session && req.session.name) {
            fs.readFile("welcome.html", "utf-8", (err, html) => {
                let output = getHtml(req.params.lang, data, html);
                output = output.replace("---NAME---", req.session.name);
                res.send(output);
            });
            /*
            io.on("connect", (socket) => {
                res.send(`Hej ${req.session.name}!`);
            });
            */
        }
        else {
            fs.readFile("index.html", "utf-8", (err, html) => {
                let output = getHtml(req.params.lang, data, html);
                res.send(output);
            });
        }
    });
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