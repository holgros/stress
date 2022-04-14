const { set } = require("express/lib/application");

module.exports = class Game {
    constructor(name1, name2) {
        let deck = getDeck();
        this.player1 = {
            name: name1,
            deck: [], 
            visible: []
        };
        this.player2 = {
            name: name2,
            deck: [], 
            visible: []
        };
        this.face1 = [];
        this.face2 = [];
        for (let playerDeck of [this.player1.deck, this.player2.deck]) {
            for (let i = 0; i < 26; i++) {
            //for (let i = 0; i < 6; i++) {  // MOCK!!
                playerDeck.push(deck.pop());
            }
        }
        for (let player of [this.player1, this.player2]) {
            for (let i = 0; i < 4; i++) {
                let card = player.deck.pop();
                while (includesRank(player.visible, card)) {
                    player.visible.push(card);
                    card = player.deck.pop();
                }
                player.visible.push(card);
            }
            player.visible = this.sortByValue(player.visible);
        }
        this.players = {
            name1: this.player1.name,
            name2: this.player2.name
        }
        this.waiting = true;
        this.stalemate = false;
    }

    // ta ett kort från spelarens hög och lägg den i en av högarna i mitten
    nextFace = (id) => {
        let blockedThread = false;
        if (this.player1.deck.length + this.player2.deck.length == 2) {
            blockedThread = true;
            this.nextFaces();
            blockedThread = false;
            return;
        }
        if (this.player1.deck.length + this.player2.deck.length < 2) {
            return;
        }
        let card;
        let player = this.player1;
        let opponent = this.player2;
        let face = this.face1;
        if (this.players.name2 == id) {
            player = this.player2;
            opponent = this.player1;
            face = this.face2;
        }
        if (player.deck.length > 0) card = player.deck.pop();
        else card = opponent.deck.pop();
        face.push(card);
    }
    
    // som ovanstående, men tar ett kort från varje spelare - används vid specialfallet då spelarna tillsammans har exakt två kort kvar samt vid testning
    nextFaces = () => {
        if (this.player1.deck.length + this.player2.deck.length < 2) {
            // TODO: Aktivera handpåläggning
        }
        let card;
        if (this.player1.deck.length > 0) card = this.player1.deck.pop();
        else card = this.player2.deck.pop();
        this.face1.push(card);
        if (this.player2.deck.length > 0) card = this.player2.deck.pop();
        else card = this.player1.deck.pop();
        this.face2.push(card);
    };

    // returnera den information som kan ses av spelarna
    getInfo = (id) => {
        let visible = {
            nbrFace1: this.face1.length,
            nbrFace2: this.face2.length
        }
        let player = this.player2;
        let opponent = this.player1;
        if (this.player1.name == id) {
            player = this.player1;
            opponent = this.player2;
        }
        visible.playerVisible = player.visible;
        visible.opponentVisible = opponent.visible;
        visible.nbrPlayerDeck = player.deck.length;
        visible.nbrOpponentDeck = opponent.deck.length;
        if (this.face1 && this.face2) {
            visible.face1 = this.face1[this.face1.length-1];
            visible.face2 = this.face2[this.face2.length-1];
        }
        return visible;
    }

    standoff = () => {
        if (this.face1.length == 0 || this.face2.length == 0) return false;
        let face1Value = this.face1[this.face1.length-1].value;
        let face2Value = this.face2[this.face2.length-1].value;
        for (let playerVisible of [this.player1.visible, this.player2.visible]) {
            for (let card of playerVisible) {
                if (Math.abs(card.value - face1Value) == 1 || 
                Math.abs(card.value - face2Value) == 1 ||
                Math.abs(card.value - face1Value) == 12 || 
                Math.abs(card.value - face2Value) == 12) return false;
            }
        }
        return true;
    }

    sortByValue = (deck) => {
        return deck.sort(compareCardValue);
    }

    getTypeOfMove = (data) => {
        if (data.player && data.cards && data.deck && (data.deck == 1 || data.deck == 2)) {
            let face = this.face1;
            if (data.deck == 2) face = this.face2;
            if (Math.abs(data.cards[0].value - face[face.length - 1].value) % 11 == 1) return "standard move";
        }
        if (data.face && ["face1", "face2"].includes(data.face) && this.standoff && this.stalemate) {
            this.stalemate = false;
            return "claim";
        }
        if (data.type == "stress" && this.stress()) return "stress";
        return undefined;
    }

    lessThanFourIdenticals = (deck) => {
        let numbers = new Set();
        for (let i = 0; i < deck.length; i++) {
            let card = deck[i];
            numbers.add(card.value);
        }
        return numbers.size < 4;
    }

    moveCards = (data) => {
        let player = this.player1;
        if (data.player == this.player2.name) player = this.player2;
        let face = this.face1;
        if (data.deck == 2) face = this.face2;
        if (Math.abs(face[face.length-1].value - data.cards[0].value) % 11 != 1) {
            return; // ogiltigt drag, t.ex. vid manipulation av klientsideskod, gör ingenting
        }
        for (let i = 0; i < data.cards.length; i++) {
            face.push(data.cards[i]);
            player.visible = player.visible.filter((value, index, arr) => {
                return value.suit != data.cards[i].suit || value.value != data.cards[i].value;
            });
        }
        while (player.deck.length > 0 && this.lessThanFourIdenticals(player.visible)) {
            player.visible.push(player.deck.pop());
            player.visible = this.sortByValue(player.visible);
        }
        // TODO: Hantera fallet då spelarens deck är slut
    }

    handleClaim = (playerId, face) => {
        let playerFace = this.face1;
        let opponentFace = this.face2;
        if (face == "face2") {
            playerFace = this.face2;
            opponentFace = this.face1;
        }
        let playerDeck = this.player1.deck;
        let opponentDeck = this.player2.deck;
        let playerVisible = this.player1.visible;
        let opponentVisible = this.player2.visible;
        if (playerId == this.player2.name) {
            playerDeck = this.player2.deck;
            opponentDeck = this.player1.deck;
            playerVisible = this.player2.visible;
            opponentVisible = this.player1.visible;
        }
        for (let i = 0; i < playerFace.length; i++) {
            playerDeck.push(playerFace.pop());
        }
        playerDeck = shuffle(playerDeck);
        while (this.lessThanFourIdenticals(playerVisible) && playerDeck.length > 0) {
            playerVisible.push(playerDeck.pop());
        }
        for (let i = 0; i < opponentFace.length; i++) {
            opponentDeck.push(opponentFace.pop());
        }
        opponentDeck = shuffle(opponentDeck);
        while (this.lessThanFourIdenticals(opponentVisible) && opponentDeck.length > 0) {
            opponentVisible.push(opponentDeck.pop());
        }
    }

    handleStress = (callingPlayer) => {
        let face1 = this.face1;
        let face2 = this.face2;
        let opponentDeck = this.player2.deck;
        let opponentVisible = this.player2.visible;
        if (callingPlayer == this.player2.name) {
            opponentDeck = this.player1.deck;
            opponentVisible = this.player1.visible;
        }
        while (face1.length > 0) {
            opponentDeck.push(face1.pop());
        }
        while (face2.length > 0) {
            opponentDeck.push(face2.pop());
        }
        opponentDeck = shuffle(opponentDeck);
        while (this.lessThanFourIdenticals(opponentVisible) && opponentDeck.length > 0) {
            opponentVisible.push(opponentDeck.pop());
        }
    }

    stress = () => {
        return this.face1[this.face1.length-1].value == this.face2[this.face2.length-1].value;
    }

}

class Card {
    constructor(suit, value, unicode) {
        this.suit = suit;   // "H", "C", "S" eller "D"
        this.value = value; // nollindexerad, dvs. 0=ess och 12=kung
        this.unicode = unicode;
    }
}

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

// returnera en blandad kortlek
let getDeck = (deck) => {
    let myDeck = [];
    for (let suit of ["H", "C", "S", "D"]) {
        for (let i = 0; i < 13; i++) {
            let number = i+161;
            switch(suit) {
                case "H":
                    number += 16;
                    break;
                case "D":
                    number += 32;
                    break;
                case "C":
                    number += 48;
            }            
            if (i > 10) {   // dam eller kung
                number++;
            }
            let hexString = number.toString(16);
            let card = new Card(suit, i, "&#x1F0"+hexString);
            myDeck.push(card);
        }
    }
    myDeck = shuffle(myDeck);
    return myDeck;
}

// kolla om kort av samma värde redan finns
let includesRank = (deck, card) => {
    for (let c of deck) {
        if (card.value == c.value) {
            return true;
        }
    }
    return false;
}

// sortera kort efter valör
function compareCardValue( a, b ) {
    if ( a.value < b.value ) return -1;
    if ( a.value > b.value ) return 1;
    return 0;
}