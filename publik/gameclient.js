
window.onload = () => {
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

    let socket = io();

    let id = document.head.querySelector("[name~=playerId][content]").content;
    
    let player = document.getElementById("player");
    let playerVisible = player.getElementsByClassName("col-20");
    for (let i = 0; i < playerVisible.length; i++) {
        
    }

    socket.emit("startGame", id);
    
    socket.on("updateGame", (info) => {
        let nbrOpponent = document.getElementById("nbrOpponent");
        nbrOpponent.innerHTML = info.nbrOpponentDeck;
        let nbrPlayer = document.getElementById("nbrPlayer");
        nbrPlayer.innerHTML = info.nbrPlayerDeck;
        let opponent = document.getElementById("opponent");
        let opponentVisible = opponent.getElementsByClassName("col-20");
        placeCards(opponentVisible, info.opponentVisible);
        placeCards(playerVisible, info.playerVisible);
        if (info.face1 && info.face2) {
            let face1 = document.getElementById("face1");
            face1.innerHTML = info.face1.unicode + `<div class="counter" id="nbrFace1"></div>`;
            let face2 = document.getElementById("face2");
            face2.innerHTML = info.face2.unicode + `<div class="counter" id="nbrFace2"></div>`;
        }
        let nbrFace1 = document.getElementById("nbrFace1");
        nbrFace1.innerHTML = info.nbrFace1;
        let nbrFace2 = document.getElementById("nbrFace2");
        nbrFace2.innerHTML = info.nbrFace2;
    });

    socket.on("error", (data) => {
        alert("Error: " + data.type);
        window.location.replace(`/logout`);
    });

    socket.on("wait", (milliseconds) => {
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
                clearInterval(myInterval);
            }
        }, timeInterval);
    });

};

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
}