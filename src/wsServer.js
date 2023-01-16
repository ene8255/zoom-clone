// server using ws
import http from "http";
import WebSocket from "ws";
import express from "express";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));

app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("/"));

const handleListen = () => console.log(`Listening on http://localhost:3000`);
// app.listen(3000, handleListen);


// http server와 WebSocket server 같이 실행
const server = http.createServer(app);

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

server.listen(3000, handleListen);