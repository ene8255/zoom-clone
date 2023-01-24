import http from "http";
import { Server } from "socket.io";
import { instrument } from "@socket.io/admin-ui";
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
const wsServer = new Server(httpServer, {
    // admin panel을 사용하기 위한 설정 (origin 사이트 주소로 접속해서 내 프로젝트 주소를 입력하면 볼 수 있음)
    cors: {
        origin: ["https://admin.socket.io"],
        credentials: true,
    }
});   // http://localhost:3000/socket.io/socket.io.js에 접속해보면 socket.io가 제공하는 기능을 볼 수 있음 -> 이것을 client에도 적용시켜 줘야 기능을 사용할 수 있음

// admin panel을 사용하기 위한 설정
instrument(wsServer, {
    auth: false,
});

// socket 정보를 이용하여 public room의 id 정보만 가져옴
function publicRooms() {
    const { 
        sockets: { 
            adapter: { sids, rooms },
        },
    } = wsServer;
    const publicRooms = [];

    // rooms => Maps 형태
    rooms.forEach((_, key) => {
        if(sids.get(key) === undefined) {
            publicRooms.push(key);
        }
    });
    return publicRooms;
}

function countRoom(roomName) {
    return wsServer.sockets.adapter.rooms.get(roomName)?.size;
}

wsServer.on("connection", (socket) => {
    socket["nickname"] = "Anonymous";
    wsServer.sockets.emit("room_change", publicRooms());

    socket.onAny((event) => {
        console.log(`Socket Event:${event}`);
    });
    socket.on("enter_room", (roomName, done) => {
        socket.join(roomName);
        done();
        // setTimeout(() => {
        //     done("hello");   // back-end에서 front-end 함수 실행 시작
        // }, 5000);
        socket.to(roomName).emit("welcome", socket.nickname, countRoom(roomName));
        wsServer.sockets.emit("room_change", publicRooms());   // 모든 socket에 메세지 보냄 => 새로운 public room이 생겼을때 접속해 있는 모든 사람에게 알려줄 수 있음
    });
    socket.on("disconnecting", () => {
        socket.rooms.forEach((room) => 
            socket.to(room).emit("bye", socket.nickname, countRoom(room) - 1)
        );
    });
    socket.on("disconnect", () => {
        wsServer.sockets.emit("room_change", publicRooms());   // public room이 없어졌을때 접속해 있는 모든 사람에게 알려줄 수 있
    });
    socket.on("new_message", (msg, room, done) => {
        socket.to(room).emit("new_message", `${socket.nickname}: ${msg}`);
        done();
    });
    socket.on("nickname", (nickname) => (socket["nickname"] = nickname));
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