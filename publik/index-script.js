window.onload = () => {
    //let socket = io();
    let submitBtn = document.getElementById("submitBtn");
    let time = Date.now();
    document.getElementById("time").value = time;
    submitBtn.addEventListener("click", (e) => {
        e.preventDefault();
        let playerName = document.getElementById("inputName").value;
        //socket.emit("submitName", {name: playerName, requestTime: time});
        document.getElementById("myForm").submit();
    });
}
