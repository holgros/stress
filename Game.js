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
    }

    nextFaces = () => {
        if (this.player1.deck.length + this.player2.deck.length < 2) {
            // TODO: Aktivera handpåläggning
        }
        let card;
        if (this.player1.deck.length > 0) card = this.player1.deck.pop();
        else card = this.player2.pop();
        this.face1.push(card);
        if (this.player2.deck.length > 0) card = this.player2.deck.pop();
        else card = this.player1.pop();
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
        if (this.player1 == id) {
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
        // TODO: Returnera true ifall inget kort kan läggas
        return false;
    }

    sortByValue = (deck) => {
        return deck.sort(compareCardValue);
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