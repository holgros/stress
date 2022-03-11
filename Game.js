module.exports = class Game {
    constructor() {
        let deck = getDeck();
        this.player1 = {
            deck: [], 
            visible: []
        };
        this.player2 = {
            deck: [], 
            visible: []
        };
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
        }
        /*
        console.log("Player 1:");
        console.log(this.player1);
        console.log("Player 2:");
        console.log(this.player2);
        */
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