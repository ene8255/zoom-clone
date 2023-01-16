const socket = io();  // io function은 socket.io를 실행하고 있는 서버를 알아서 찾음

const welcome = document.querySelector("#welcome");
const form = welcome.querySelector("form");

function handleRoomSubmit(event) {
    event.preventDefault();
    const input = form.querySelector("input");
    socket.emit("enter_room", { payload: input.value }, () => {
        console.log("Server is done!");
    });   // name of event, JSON object, function
    input.value = "";
}

form.addEventListener("submit", handleRoomSubmit);