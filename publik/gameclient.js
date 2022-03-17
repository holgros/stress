
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
    //console.log(id);
    
    socket.emit("startGame", id);
    
    socket.on("updateGame", (info) => {
        let nbrFace1 = document.getElementById("nbrFace1");
        nbrFace1.innerHTML = info.nbrFace1;
        let nbrFace2 = document.getElementById("nbrFace2");
        nbrFace2.innerHTML = info.nbrFace2;
        let nbrOpponent = document.getElementById("nbrOpponent");
        nbrOpponent.innerHTML = info.nbrOpponentDeck;
        let nbrPlayer = document.getElementById("nbrPlayer");
        nbrPlayer.innerHTML = info.nbrPlayerDeck;
        let opponent = document.getElementById("opponent");
        let opponentVisible = opponent.getElementsByClassName("col-20");
        placeCards(opponentVisible, info.opponentVisible);
    });

    socket.on("error", (data) => {
        alert(data.type);
        window.location.replace(`/logout`);
    });

};

// placera synliga kort
let placeCards = (divs, deck) => {
    for (let i = 0; i < divs.length - 1; i++) {
        // TODO: hantera case med fler än ett kort av samma valör
        divs[i].innerHTML = `${deck[i].unicode}<div class="counter">`;
    }
}