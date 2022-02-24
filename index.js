const express = require("express");
const fs = require("fs");
const app = express();
app.use(express.static("publik"));
const http = require("http");
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`listening on ${PORT}`));

// importera socket.io
const { Server } = require("socket.io");
const io = new Server(server);

// default-språk är svenska
app.get("/", (req, res) => {
    res.redirect("/sv");
});
app.get("/:lang", (req, res) => {
    fs.readFile("language.json", "utf-8", (err, data) => {
        fs.readFile("index.html", "utf-8", (err, html) => {
            let output = getHtml(req.params.lang, data, html);
            res.send(output);
        });
    });
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
    let vocabulary = lang[0].vocabulary;
    for (let key in vocabulary) {
        htmlData = htmlData.replace(key, vocabulary[key]);
    }
    return htmlData;
};