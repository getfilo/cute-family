require("dotenv").config();

const express =
    require("express");

const http =
    require("http");

const helmet =
    require("helmet");

const cors =
    require("cors");

const jwt =
    require("jsonwebtoken");

const rateLimit =
    require("express-rate-limit");

const path =
    require("path");

const { Server } =
    require("socket.io");

const app =
    express();

/* SECURITY */

app.use(helmet());

app.use(cors());

app.use(express.json());

app.use(

    rateLimit({

        windowMs:
            15 * 60 * 1000,

        max: 100

    })

);

app.use(

    express.static(

        path.join(
            __dirname,
            "../frontend"
        )

    )

);

const server =
    http.createServer(app);

const io =
    new Server(server, {

        cors: {

            origin: "*"

        }

    });

/* USERS */

const USERS = [

    {
        username:
            "kkhullatti",

        password:
            "3065"
    },

    {
        username:
            "lathapatil",

        password:
            "3065"
    },

    {
        username:
            "meghanahullatti",

        password:
            "3065"
    },

    {
        username:
            "narenhullatti",

        password:
            "3065"
    }

];

/* MEMORY */

let onlineUsers = [];

let busyUsers = [];

/* TOKEN */

function verifyToken(token) {

    try {

        return jwt.verify(
            token,
            process.env.JWT_SECRET
        );

    }
    catch {

        return null;

    }

}

/* SOCKET */

io.on("connection",
(socket) => {

    console.log(
        "Connected:",
        socket.id
    );

    /* LOGIN */

    socket.on("login",
    (data) => {

        const user =
            USERS.find(

                u =>

                u.username ===
                data.username &&

                u.password ===
                data.password

            );

        if(!user) {

            socket.emit(
                "loginFailed"
            );

            return;

        }

        const token =
            jwt.sign(

                {

                    username:
                        user.username

                },

                process.env.JWT_SECRET,

                {

                    expiresIn:
                        "7d"

                }

            );

        socket.username =
            user.username;

        if(

            !onlineUsers.find(
                u =>
                u.username ===
                user.username
            )

        ) {

            onlineUsers.push({

                username:
                    user.username,

                socketId:
                    socket.id

            });

        }

        socket.emit(
            "loginSuccess",

            {

                username:
                    user.username,

                token

            }

        );

        io.emit(

            "onlineUsers",

            onlineUsers.map(
                u => u.username
            )

        );

    });

    /* CALL */

    socket.on("callUser",
    (data) => {

        const verified =
            verifyToken(
                data.token
            );

        if(!verified) {

            return;

        }

        if(
            busyUsers.includes(
                data.to
            )
        ) {

            socket.emit(
                "userBusy"
            );

            return;

        }

        const target =
            onlineUsers.find(

                u =>
                u.username ===
                data.to

            );

        if(target) {

            busyUsers.push(
                data.from
            );

            busyUsers.push(
                data.to
            );

            io.to(
                target.socketId
            ).emit(

                "incomingCall",

                {

                    from:
                        data.from,

                    offer:
                        data.offer

                }

            );

        }

    });

    /* ANSWER */

    socket.on("answerCall",
    (data) => {

        const caller =
            onlineUsers.find(

                u =>
                u.username ===
                data.to

            );

        if(caller) {

            io.to(
                caller.socketId
            ).emit(

                "callAnswered",

                {

                    answer:
                        data.answer

                }

            );

        }

    });

    /* REJECT */

    socket.on("rejectCall",
    (data) => {

        busyUsers =
            busyUsers.filter(

                u =>

                u !== data.to &&

                u !== socket.username

            );

        const target =
            onlineUsers.find(

                u =>
                u.username ===
                data.to

            );

        if(target) {

            io.to(
                target.socketId
            ).emit(
                "callRejected"
            );

        }

    });

    /* ICE */

    socket.on("iceCandidate",
    (data) => {

        const target =
            onlineUsers.find(

                u =>
                u.username ===
                data.to

            );

        if(target) {

            io.to(
                target.socketId
            ).emit(

                "iceCandidate",

                {

                    candidate:
                        data.candidate

                }

            );

        }

    });

    /* END */

    socket.on("endCall",
    (data) => {

        busyUsers =
            busyUsers.filter(

                u =>

                u !== data.from &&

                u !== data.to

            );

        const target =
            onlineUsers.find(

                u =>
                u.username ===
                data.to

            );

        if(target) {

            io.to(
                target.socketId
            ).emit(
                "callEnded"
            );

        }

    });

    /* DISCONNECT */

    socket.on("disconnect",
    () => {

        onlineUsers =
            onlineUsers.filter(

                u =>
                u.username !==
                socket.username

            );

        busyUsers =
            busyUsers.filter(

                u =>
                u !== socket.username

            );

        io.emit(

            "onlineUsers",

            onlineUsers.map(
                u => u.username
            )

        );

        console.log(
            "Disconnected:",
            socket.id
        );

    });

});

/* START */

const PORT =
    process.env.PORT || 5000;

server.listen(

    PORT,

    "0.0.0.0",

    () => {

        console.log(
            "Server Running On Port",
            PORT
        );

    }

);