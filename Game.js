module.exports = class Game {
    constructor() {
        this.deck = getDeck();
        console.log(this.deck);
    }
}

class Card {
    constructor(suit, value, unicode) {
        this.suit = suit;
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
