import express from "express";
import http from "http";
import path from "path";
import {Server} from "socket.io";
import { fileURLToPath } from "url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// create http server
const server = http.createServer(app);

// initiate socket io and attach this to the http server
const io = new Server(server);

// serve static files
app.use(express.static(path.join(__dirname,'/public')));

const users = new Set();

// socket connection
io.on('connection', (socket) => {
    // console.log(`User is connected : `, socket);

    // handle user when they join the chat
    socket.on('join', (userName) => {
        users.add(userName);
        socket.userName = userName;
        // broadcast to all clients/users that a new user has joined
        io.emit('userJoined', userName);

        // send the users list to all the clients
        io.emit('userList', Array.from(users));
    });

    // handle incoming user message
    socket.on('chatMessage', (message) => {
        // broadcast the received message to all the connected users

        io.emit('chatMessage', message);
    });

    // handle disconnect
    socket.on('disconnect', () => {
        if(socket.userName){
            users.delete(socket.userName);

            // notify other users
            io.emit('userLeft', socket.userName);

            // update the users list
            io.emit('userList', Array.from(users));

        }   
    });

});

server.listen(3000, () => console.log('Server is listening at 3000'));