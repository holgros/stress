
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

};
