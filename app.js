const socket =
    io();

let me = "";

let currentTarget = "";

let localStream;

let peer;

let pendingOffer = null;

let inCall = false;

const usersList =
    document.getElementById("users");

const statusText =
    document.getElementById("status");

const remoteAudio =
    document.getElementById("remoteAudio");

const ringtone =
    document.getElementById("ringtone");

const incomingPopup =
    document.getElementById(
        "incomingPopup"
    );

const callerName =
    document.getElementById(
        "callerName"
    );

/* LOGIN */

function login() {

    const username =
        document.getElementById(
            "username"
        ).value;

    const password =
        document.getElementById(
            "password"
        ).value;

    socket.emit("login", {

        username,
        password

    });

}

socket.on("loginSuccess",
async (data) => {

    me = data.username;

    localStorage.setItem(
        "family_user",
        me
    );

    localStorage.setItem(
        "token",
        data.token
    );

    document.getElementById(
        "loginScreen"
    ).classList.add("hidden");

    document.getElementById(
        "app"
    ).classList.remove("hidden");

    document.getElementById(
        "me"
    ).innerText =
        "Logged in as: " + me;

    Notification.requestPermission();

    localStream =
        await navigator.mediaDevices
        .getUserMedia({

            audio: true

        });

});

/* LOGIN FAILED */

socket.on("loginFailed",
() => {

    document.getElementById(
        "loginError"
    ).innerText =
        "Invalid Username or Password";

});

/* USERS */

socket.on("onlineUsers",
(users) => {

    usersList.innerHTML = "";

    users.forEach((user) => {

        if(user !== me) {

            const li =
                document.createElement("li");

            li.innerHTML = `

                <span>${user}</span>

                <button
                    onclick="callUser('${user}')"
                >
                    Call
                </button>

            `;

            usersList.appendChild(li);

        }

    });

});

/* CREATE PEER */

async function createPeer() {

    peer =
        new RTCPeerConnection({

            iceServers: [

                {
                    urls:
                    "stun:stun.l.google.com:19302"
                }

            ]

        });

    localStream
        .getTracks()
        .forEach(track => {

            peer.addTrack(
                track,
                localStream
            );

        });

    peer.ontrack = (e) => {

        remoteAudio.srcObject =
            e.streams[0];

    };

    peer.onicecandidate = (e) => {

        if(e.candidate) {

            socket.emit(
                "iceCandidate",
                {

                    candidate:
                        e.candidate,

                    to:
                        currentTarget

                }
            );

        }

    };

}

/* CALL */

async function callUser(user) {

    if(inCall) return;

    currentTarget = user;

    await createPeer();

    const offer =
        await peer.createOffer();

    await peer.setLocalDescription(
        offer
    );

    socket.emit("callUser", {

        from: me,

        to: user,

        offer,

        token:
            localStorage.getItem(
                "token"
            )

    });

    statusText.innerText =
        "Calling " + user;

}

/* INCOMING */

socket.on("incomingCall",
(data) => {

    pendingOffer =
        data.offer;

    currentTarget =
        data.from;

    callerName.innerText =
        data.from +
        " is calling you";

    incomingPopup.classList.remove(
        "hidden"
    );

    ringtone.play();

    statusText.innerText =
        "Incoming Call";

    if(
        Notification.permission ===
        "granted"
    ) {

        new Notification(
            "Incoming Call",

            {

                body:
                    "Call from " +
                    data.from

            }

        );

    }

});

/* ACCEPT */

async function acceptCall() {

    ringtone.pause();

    ringtone.currentTime = 0;

    incomingPopup.classList.add(
        "hidden"
    );

    await createPeer();

    await peer.setRemoteDescription(

        new RTCSessionDescription(
            pendingOffer
        )

    );

    const answer =
        await peer.createAnswer();

    await peer.setLocalDescription(
        answer
    );

    socket.emit("answerCall", {

        to: currentTarget,

        answer

    });

    inCall = true;

    statusText.innerText =
        "Connected";

}

/* REJECT */

function rejectCall() {

    ringtone.pause();

    ringtone.currentTime = 0;

    incomingPopup.classList.add(
        "hidden"
    );

    socket.emit("rejectCall", {

        to: currentTarget

    });

    statusText.innerText =
        "Call Rejected";

}

/* ANSWERED */

socket.on("callAnswered",
async (data) => {

    await peer.setRemoteDescription(

        new RTCSessionDescription(
            data.answer
        )

    );

    inCall = true;

    statusText.innerText =
        "Connected";

});

/* ICE */

socket.on("iceCandidate",
async (data) => {

    try {

        await peer.addIceCandidate(

            new RTCIceCandidate(
                data.candidate
            )

        );

    }
    catch(err) {

        console.log(err);

    }

});

/* END */

function endCall() {

    if(peer) {

        peer.close();

    }

    socket.emit("endCall", {

        from: me,

        to: currentTarget

    });

    inCall = false;

    statusText.innerText =
        "Call Ended";

}

socket.on("callEnded",
() => {

    if(peer) {

        peer.close();

    }

    inCall = false;

    statusText.innerText =
        "Other User Ended Call";

});

/* REJECTED */

socket.on("callRejected",
() => {

    statusText.innerText =
        "Call Rejected";

});

/* BUSY */

socket.on("userBusy",
() => {

    statusText.innerText =
        "User Busy";

});

/* MIC */

function toggleMic() {

    const track =
        localStream
        .getAudioTracks()[0];

    track.enabled =
        !track.enabled;

}

/* LOGOUT */

function logout() {

    localStorage.clear();

    location.reload();

}