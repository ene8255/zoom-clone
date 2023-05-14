const socket = io();

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");

const call = document.getElementById("call");
call.hidden = true;

let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;
let myDataChannel;

let pcList = {};

async function getCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((device) => device.kind === "videoinput");
        const currentCamera = myStream.getVideoTracks()[0];

        cameras.forEach(camera => {
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.innerText = camera.label;
            if(currentCamera.label === camera.label) {
                option.selected = true;
            }
            camerasSelect.appendChild(option);
        })
    } catch(e) {
        console.log(e);
    }
}

async function getMedia(deviceId) {
    const initialConstraints = {
        audio: true,
        video: { facingMode: "user" },
    }
    const cameraConstraints = {
        audio: true,
        video: { deviceId: { exact: deviceId } },
    }

    try {
        myStream = await navigator.mediaDevices.getUserMedia(
            deviceId ? cameraConstraints : initialConstraints
        );
        myFace.srcObject = myStream;
        if (!deviceId) {
            await getCameras();
        }
    } catch(e) {
        console.log(e);
    }
}

function handleMuteClick() {
    myStream
        .getAudioTracks()
        .forEach((track) => (track.enabled = !track.enabled));

    if(!muted) {
        muteBtn.innerText = "Unmute";
        muted = true;
    } else {
        muteBtn.innerText = "Mute";
        muted = false;
    }
}

function handleCameraClick() {
    myStream
        .getVideoTracks()
        .forEach((track) => (track.enabled = !track.enabled));

    if(cameraOff) {
        cameraBtn.innerText = "Turn Camera Off";
        cameraOff = false;
    } else {
        cameraBtn.innerText = "Turn Camera On";
        cameraOff = true;
    }
}

async function handleCameraChange() {
    await getMedia(camerasSelect.value);
    if(myPeerConnection) {
        const videoTrack = myStream.getVideoTracks()[0];
        const videoSender = myPeerConnection
            .getSenders()
            .find(sender => sender.track.kind === "video");
        videoSender.replaceTrack(videoTrack);
    }
    // localtunnel로 임시 퍼블릭 서버 만들어서 테스트할 수 있음
    // npm i -g localtunnel
    // lt --port 3000
    // 그러면 나오는 url에 접속해서 폰에서도 테스트 가능
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);


// welcome form (join a room)
const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");

async function initCall() {
    welcome.hidden = true;
    call.hidden = false;
    await getMedia();
    makeConnection();
}

async function handleWelcomeSubmit(event) {
    event.preventDefault();
    const input = welcomeForm.querySelector("input");
    await initCall();
    socket.emit("join_room", input.value);
    roomName = input.value;
    input.value = "";
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);


// socket code
socket.on("welcome", async () => {
    // data channel
    myDataChannel = myPeerConnection.createDataChannel("chat");
    myDataChannel.addEventListener("message", (event) => console.log(event.data));
    console.log("made data channel");

    const offer = await myPeerConnection.createOffer();
    console.log("sent the offer");
    myPeerConnection.setLocalDescription(offer);
    socket.emit("offer", offer, roomName);
});  // 이 코드는 방을 만든 host browser에서 실행됨

socket.on("offer", async (offer) => {
    myPeerConnection.addEventListener("datachannel", (event) => {
        myDataChannel = event.channel;
        myDataChannel.addEventListener("message", (event) => console.log(event.data));
    });

    console.log("received the offer");
    myPeerConnection.setRemoteDescription(offer);
    const answer = await myPeerConnection.createAnswer();
    myPeerConnection.setLocalDescription(answer);
    socket.emit("answer", answer, roomName);
    console.log("sent the answer");
    console.log(myPeerConnection);
});  // 이 코드는 방에 들어간 guest browser에서 실행됨

socket.on("answer", (answer) => {
    console.log("received the answer");
    myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice) => {
    console.log("received candidate");
    myPeerConnection.addIceCandidate(ice);
})

// RTC code
function makeConnection() {
    myPeerConnection = new RTCPeerConnection({
        iceServers: [
            {
                urls: [
                    "stun:stun.l.google.com:19302",
                    "stun:stun1.l.google.com:19302",
                    "stun:stun2.l.google.com:19302",
                    "stun:stun3.l.google.com:19302",
                    "stun:stun4.l.google.com:19302",
                    "stun:stun2.l.google.com:19305",
                    "stun:iphone-stun.strato-iphone.de:3478"
                ],
            },
          ],
    }); // stun server를 사용해야 서로 다른 wifi를 사용하고 있어도 접속할 수 있음

    myPeerConnection.addEventListener("icecandidate", handleIce);
    myPeerConnection.addEventListener("track", handleAddStream);
    myStream
        .getTracks()
        .forEach((track) => myPeerConnection.addTrack(track, myStream));
    console.log(myStream);
}

function handleIce(data) {
    socket.emit("ice", data.candidate, roomName);
    console.log("sent candidate");
}

function handleAddStream(data) {
    // const peerFace = document.getElementById("peerFace");
    // peerFace.srcObject = data.streams[0];

    if(data.track.kind === "video") {
        const newStream = document.createElement("div");
        const newVideo = document.createElement("video");
        newVideo.autoplay = true;
        newVideo.playsInline = true;
        newVideo.width = 400;
        newVideo.height = 400;
        newVideo.srcObject = data.streams[0];
        newStream.appendChild(newVideo);
        call.appendChild(newStream);
    }
}