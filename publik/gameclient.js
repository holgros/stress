
window.onload = () => {
    // GLOBALA VARIABLER
    let socket = io();
    let player = document.getElementById("player");
    let playerVisible = player.getElementsByClassName("col-20");
    let cardsInEachPile;
    let deck1topCard;
    let deck2topCard;
    let selected;
    let hovering;
    let waiting;
    let id = document.head.querySelector("[name~=playerId][content]").content;

    // HÄNDELSEHANTERARE

    let clickListener = () => {
        let confirmDialog = document.getElementById("quitConfirm");
        confirmDialog.style.display = "block";
    }
    
    let quitBtn = document.getElementById("quit");
    quitBtn.addEventListener("click", clickListener);
    
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
    icon.addEventListener("click", clickListener);

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
        }
        selected = undefined;
    }

    window.addEventListener("mouseup", mouseuphandler);

    for (let i = 0; i < 4; i++) {
        let faceDiv = document.getElementById("faceCard"+i);
        faceDiv.addEventListener("mousedown", faceCardMousedownHandler);
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
    }

    // SOCKET-HÄNDELSER

    socket.emit("startGame", id);
    
    socket.on("updateGame", (info) => {
        console.log(info);
        if (info.nbrFace1 == 0 || info.nbrFace2 == 0) {
            socket.emit("getGame", id);
            return;
        }
        let nbrOpponent = document.getElementById("nbrOpponent");
        nbrOpponent.innerHTML = info.nbrOpponentDeck;
        let nbrPlayer = document.getElementById("nbrPlayer");
        nbrPlayer.innerHTML = info.nbrPlayerDeck;
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
        //console.log(info);
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

};

// HJÄLPFUNKTONER

// placera synliga kort - korten förutsätts vara sorterade efter valör
let placeCards = (divs, deck) => {
    let multiValues = [1, 1, 1, 1];
    let j = 0;
    for (let i = 0; i < deck.length; i++) {
        let card = deck[i];
        if (i == 0 || deck[i-1].value != card.value) {
            divs[i+j].innerHTML = `${card.unicode}<div class="counter"></div>`;
            continue;
        }
        j--;
        multiValues[i+j]++;
        divs[i+j].innerHTML = `${card.unicode}<div class="counter">${multiValues[i+j]}</div>`;
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
