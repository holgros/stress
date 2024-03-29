// GLOBALA VARIABLER
let deck1topCard;
let deck2topCard;
let cardsInEachPile;
let selected;
let hovering;
let waiting;
let stalemate;

window.onload = () => {
    let socket = io();
    let player = document.getElementById("player");
    let playerVisible = player.getElementsByClassName("col-20");
    let id = document.head.querySelector("[name~=playerId][content]").content;

    // HÄNDELSEHANTERARE OCH RELATERADE FUNKTIONER

    let showQuitDialog = () => {
        let confirmDialog = document.getElementById("quitConfirm");
        confirmDialog.style.display = "block";
    }
    
    let quitBtn = document.getElementById("quit");
    quitBtn.addEventListener("click", showQuitDialog);
    
    let dismissBtns = document.getElementsByClassName("dismissBtn");
    for (const btn of dismissBtns) {
        btn.addEventListener("click", () => {
            let dismissable = document.getElementsByClassName("dismissable");
            for (const dis of dismissable) {
                dis.style.display = "none";
            }
        });
    }

    let icon = document.getElementsByClassName("icon")[0];
    icon.addEventListener("click", showQuitDialog);

    let quitConfirmationButton = document.getElementById("quitConfirmationButton");
    quitConfirmationButton.addEventListener("click", () => {
        socket.emit("abortGame", id);
    });

    let faceCardMousedownHandler = (e) => {
        if (waiting) return;
        let div = document.getElementById(e.target.id);
        div.style.color = "red";
        let id = Number(e.target.id.substring(8));
        selected = cardsInEachPile[id];
    }

    let mouseuphandler = (e) => {
        for (let i = 0; i < 4; i++) {
            let faceCard = document.getElementById("faceCard"+i);
            faceCard.style.color = "black";
        }
        if (hovering && selected) {
            let hoveringCard = deck1topCard;
            if (hovering == 2) {
                hoveringCard = deck2topCard;
            }
            if(Math.abs(selected[0].value - hoveringCard.value) % 11 == 1) {
                let data = {
                    player: id,
                    cards: selected,
                    deck: hovering
                };
                socket.emit("playerMove", data);
            }
            // återställa ifall det är en touch-händelse som inte lyssnar på mouseout
            for (let face of ["face1", "face2"]) {
                let faceDiv = document.getElementById(face);
                faceDiv.style.color = "black";
            }
        }
        selected = undefined;
    }

    let touchmovehandler = (e) => {
        for (let face of ["face1", "face2"]) {
            let faceDiv = document.getElementById(face);
            domRect = faceDiv.getBoundingClientRect();
            //alert("x:" + domRect.x + ",y:" + domRect.y + ",width:" + domRect.width + ",height:" + domRect.height);
            let x = e.touches[0].pageX;
            let y = e.touches[0].pageY;
            if (x < domRect.x+domRect.width && x > domRect.x) {
                if (y < domRect.y+domRect.height && y > domRect.y) {
                    // kopia från motsvarande händelsehanterare för mus
                    if (!selected) return;
                    hovering = Number(face.substring(4));   // 1 eller 2
                    let hoveringCard = deck1topCard;
                    if (hovering == 2) hoveringCard = deck2topCard;
                    if(Math.abs(selected[0].value - hoveringCard.value) % 11 != 1) return;
                    // OBS - skillnad från händelsehanterare för mus
                    faceDiv.style.color = "red";
                }
            }
        }
    }

    window.addEventListener("mouseup", mouseuphandler);
    window.addEventListener("touchend", mouseuphandler);
    window.addEventListener("touchmove", touchmovehandler);

    for (let i = 0; i < 4; i++) {
        let faceDiv = document.getElementById("faceCard"+i);
        faceDiv.addEventListener("mousedown", faceCardMousedownHandler);
        faceDiv.addEventListener("touchstart", faceCardMousedownHandler);
    }

    for (let face of ["face1", "face2"]) {
        let faceDiv = document.getElementById(face);
        faceDiv.addEventListener("mouseenter", (e) => {
            if (!selected) return;
            hovering = Number(face.substring(4));   // 1 eller 2
            let hoveringCard = deck1topCard;
            if (hovering == 2) hoveringCard = deck2topCard;
            if(Math.abs(selected[0].value - hoveringCard.value) % 11 != 1) return;
            e.target.style.color = "red";
        });
        faceDiv.addEventListener("mouseleave", (e) => {
            hovering = undefined;
            e.target.style.color = "black";
        });
        faceDiv.addEventListener("click", (e) => {
            if (stress()) socket.emit("playerMove", {
                type: "stress",
                player: id
            });
            if (!stalemate) return;
            socket.emit("playerMove", {
                face: face,
                player: id
            });
            stalemate = false;
        });
    }

    // SOCKET-HÄNDELSER

    socket.emit("startGame", id);
    
    socket.on("updateGame", (info) => {
        //console.log(info);
        if ((info.nbrFace1 == 0 || info.nbrFace2 == 0) && !info.waiting) {
            socket.emit("getGame", id);
            return;
        }
        if (info.nbrOpponentDeck == 0) {
            let opponentDeck = document.getElementById("opponentDeck");
            opponentDeck.innerHTML = `<div class="counter" id="nbrOpponent"></div>`;
        }
        else {
            let opponentDeck = document.getElementById("opponentDeck");
            opponentDeck.innerHTML = `&#x1F0A0<div class="counter" id="nbrOpponent"></div>`;
            let nbrOpponent = document.getElementById("nbrOpponent");
            nbrOpponent.innerHTML = info.nbrOpponentDeck;
        }
        if (info.nbrPlayerDeck == 0) {
            let playerDeck = document.getElementById("playerDeck");
            playerDeck.innerHTML = `<div class="counter" id="nbrPlayer"></div>`;
        }
        else {
            let playerDeck = document.getElementById("playerDeck");
            playerDeck.innerHTML = `&#x1F0A0<div class="counter" id="nbrPlayer"></div>`;
            let nbrPlayer = document.getElementById("nbrPlayer");
            nbrPlayer.innerHTML = info.nbrPlayerDeck;
        }
        if (info.nbrPlayerDeck == 0) {
            nbrPlayer.innerHTML = "";
        }
        let opponent = document.getElementById("opponent");
        let opponentVisible = opponent.getElementsByClassName("col-20");
        placeCards(opponentVisible, info.opponentVisible);
        cardsInEachPile = placeCards(playerVisible, info.playerVisible);
        if (info.face1 && info.face2) {
            let face1 = document.getElementById("face1");
            deck1topCard = info.face1;
            face1.innerHTML = info.face1.unicode + `<div class="counter" id="nbrFace1"></div>`;
            let face2 = document.getElementById("face2");
            face2.innerHTML = info.face2.unicode + `<div class="counter" id="nbrFace2"></div>`;
            deck2topCard = info.face2;
        }
        let nbrFace1 = document.getElementById("nbrFace1");
        nbrFace1.innerHTML = info.nbrFace1;
        let nbrFace2 = document.getElementById("nbrFace2");
        nbrFace2.innerHTML = info.nbrFace2;
        if (info.gameover) {
            showQuitDialog();    // Visa dialogruta
        }
    });

    socket.on("error", (data) => {
        alert("Error: " + data.type);
        window.location.replace(`/logout`);
    });

    socket.on("wait", (milliseconds) => {
        waiting = true;
        let wait = document.getElementById("wait");
        wait.setAttribute("style", "inner-height:" + window.innerHeight);
        let timeInterval = Math.round(milliseconds/3);
        let i = 3;
        wait.innerHTML = i;
        let myInterval = setInterval(() => {
            i--;
            wait.innerHTML = i;
            if (i == 0) {
                wait.style.display = "none";
                waiting = false;
                clearInterval(myInterval);
            }
        }, timeInterval);
    });

    socket.on("abortGame", (data) => {
        alert(data.msg);
        window.location.replace("/logout");
    });

    socket.on("gameover", (data) => {
        document.getElementById("hamburgerHeader").innerHTML = data;
        document.getElementById("quit").innerHTML = "";
        document.getElementById("quitCancelButton").style.display = "none";
        showQuitDialog();
    });

    socket.on("stalemate", () => {
        stalemate = true;
    });

};

// HJÄLPFUNKTONER

// placera synliga kort - korten förutsätts vara sorterade efter valör
let placeCards = (divs, deck) => {
    let multiValues = [0, 0, 0, 0];
    let j = 0;
    for (let i = 0; i < deck.length; i++) {
        let card = deck[i];
        if (i == 0 || deck[i-1].value != card.value) {
            divs[i+j].innerHTML = `${card.unicode}<div class="counter"></div>`;
            multiValues[i+j] = 1;
            continue;
        }
        j--;
        multiValues[i+j]++;
        divs[i+j].innerHTML = `${card.unicode}<div class="counter">${multiValues[i+j]}</div>`;
    }
    for (let i = 0; i < 4; i++) {
        if (multiValues[i] == 0) {
            divs[i].innerHTML = "";
        }
    }
    let output = [];
    let k = 0;
    for (let nbrMultiples of multiValues) {
        let temp = [];
        for (let i = 0; i < nbrMultiples; i++) {
            temp.push(deck[k]);
            k++;
        }
        output.push(temp);
    }
    return output;
}

let stress = () => {
    return deck1topCard.value == deck2topCard.value;
}
