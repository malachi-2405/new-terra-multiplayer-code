const {createServer} = require("http")
const {Server} = require("socket.io")
const express = require("express")

let app = new express();
const path = require('path')

console.log(path.resolve());
app.use('/', express.static(path.join(path.resolve(), 'dist')))


app.listen(3100);

const socket = 3000

const server = createServer();
const io = new Server(server, {
    cors: {
        origins: ["*:80", "*:443", "*:1234"],
        methods: ["GET", "POST"],
        allowedHeaders: ["new-terra-game-connection"]
    }
});

const roomMap = Object.create(null);
const userObject = Object.create(null);
const callbacks = Object.create(null);

//underscore denotes server side method

Object.assign(callbacks, {
    _setPlayerData: (socket, data) => { 
        let string = data.constructor.name === "String" ? data : `${data.name}#${data.id}`
        userObject[string] = {socket}
    },
    _getIfPlayerExists: (socket, data) => {
        if (data.constructor.name === "String") return data in userObject;
        return `${data.name}#${data.id}` in userObject;
    },
    _createRoom(socket, playerName, roomId) {
        let playerNameString = playerName.constructor.name === "String" ? playerName : `${playerName.name}#${playerName.id}`;
        const roomName = `${playerName}-${roomId}`
        roomMap[playerNameString] = roomName;
        socket.join(roomName);
        console.log(roomMap);
        return roomName
    },
    _roomExists(socket, roomName) {
        return roomName in roomMap
    },
    _askPlayer(socket, playerName, recipientName) {
        let playerNameString = playerName.constructor.name === "String" ? playerName : `${playerName.name}#${playerName.id}`;
        let recipientNameString = recipientName.constructor.name === "String" ? recipientName : `${recipientName.name}#${recipientName.id}`
        userObject[recipientNameString]?.socket.emit?.("askPlayer", playerNameString, roomMap[playerNameString]);
        return recipientNameString in userObject;
    },
    _informClient(socket, {playerName, recipientName}, status) {
        let playerNameString = playerName.constructor.name === "String" ? playerName : `${playerName.name}#${playerName.id}`;
        let recipientNameString = recipientName.constructor.name === "String" ? recipientName : `${recipientName.name}#${recipientName.id}`
        userObject[recipientNameString].socket.emit("informClient", playerNameString, status);
        return true;
    },
    _joinClientRoom(socket, {playerName, recipientName}) { 
        console.log(userObject, roomMap, playerName, recipientName)
        if (!(playerName in userObject) || !(recipientName in userObject)) return false;
        let playerNameString = playerName.constructor.name === "String" ? playerName : `${playerName.name}#${playerName.id}`;
        let recipientNameString = recipientName.constructor.name === "String" ? recipientName : `${recipientName.name}#${recipientName.id}`;
        if (!(recipientName in roomMap)) return false;
        userObject[recipientNameString].socket.join(roomMap[playerNameString]);
        roomMap[recipientNameString] = roomMap[playerNameString];
        return true
    }
})

io.on("connection", (socket) => {
    socket.onAny((event, ...data) => {
        for (let room of socket.rooms) {
            if(io.sockets.adapter.rooms.get(room).size <= 1) continue;
            io.to(room).emit(event, ...data);
        }

        if (data == null || event[0] !== "_") return;
        let result = callbacks[event.split("-")[0]]?.(socket, ...data);
        if (result != null) socket.emit(event, result);
    })
});

server.listen(socket);
