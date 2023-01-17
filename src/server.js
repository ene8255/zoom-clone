import http from "http";
import SocketIO from "socket.io";
import express from "express";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));

app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("/"));

const handleListen = () => console.log(`Listening on http://localhost:3000`);
// app.listen(3000, handleListen);


// http server와 socket.io server 같이 실행
const httpServer = http.createServer(app);
const wsServer = SocketIO(httpServer);   // http://localhost:3000/socket.io/socket.io.js에 접속해보면 socket.io가 제공하는 기능을 볼 수 있음 -> 이것을 client에도 적용시켜 줘야 기능을 사용할 수 있음

wsServer.on("connection", (socket) => {
    socket.onAny((event) => {
        console.log(`Socket Event:${event}`);
    });
    socket.on("enter_room", (roomName, done) => {
        socket.join(roomName);
        done();
        // setTimeout(() => {
        //     done("hello");   // back-end에서 front-end 함수 실행 시작
        // }, 5000);
        socket.to(roomName).emit("welcome");
    });
    socket.on("disconnecting", () => {
        socket.rooms.forEach((room) => socket.to(room).emit("bye"));
    });
    socket.on("new_message", (msg, room, done) => {
        socket.to(room).emit("new_message", msg);
        done();
    });
});

/*
const wss = new WebSocket.Server({ server });
const sockets = [];   // fake db
wss.on("connection", (socket) => {
    // console.log(socket);
    sockets.push(socket);
    socket["nickname"] = "Anonymous";
    console.log("Connected to Browser ✅");
    socket.on("close", () => {console.log("Disconnected from Browser ❌");});
    socket.on("message", (msg) => {
        const message = JSON.parse(msg.toString('utf-8'));
        switch (message.type) {
            case "new_message":
                sockets.forEach((aSocket) => 
                    aSocket.send(`${socket.nickname}: ${message.payload}`)
                );
                break;
            case "nickname":
                socket["nickname"] = message.payload;
        }
        // socket.send(message.toString('utf-8'));
    });
});
*/

httpServer.listen(3000, handleListen);