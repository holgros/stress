let socket = io();

socket.on("startGame", (opponent) => {
    window.location.replace(`/game?opponent=${opponent}`);
});