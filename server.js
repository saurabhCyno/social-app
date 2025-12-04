import express from "express";
import http from "http";
import path from "path";
import { Server } from "socket.io";
import { fileURLToPath } from "url";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create HTTP server
const server = http.createServer(app);

// Attach Socket.IO
const io = new Server(server);

// Serve static files from "public"
app.use(express.static(path.join(__dirname, 'public')));

const users = new Map(); // Map<socketId, userName>
const messages = [];     // Array<{ userName, text, timestamp }>

// Remove expired messages (older than 24h) every hour
setInterval(() => {
    const now = Date.now();
    for (let i = messages.length - 1; i >= 0; i--) {
        if (now - messages[i].timestamp > 24 * 60 * 60 * 1000) {
            messages.splice(i, 1);
        }
    }
}, 60 * 60 * 1000); // every hour

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle user joining
    socket.on('join', (userName) => {
        users.set(socket.id, userName);

        // Send chat history to the new user
        socket.emit('chatHistory', messages.map(msg => ({
            userName: msg.userName,
            text: msg.text
        })));

        // Notify all other clients
        socket.broadcast.emit('userJoined', userName);

        // Send updated user list to all clients
        io.emit('userList', Array.from(users.values()));
    });

    // Handle chat messages
    socket.on('chatMessage', ({ userName, text }) => {
        // Save message with timestamp
        messages.push({ userName, text, timestamp: Date.now() });

        // Broadcast to all clients, including sender
        io.emit('chatMessage', { userName, text });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        const userName = users.get(socket.id);
        if (userName) {
            users.delete(socket.id);

            // Notify other users
            socket.broadcast.emit('userLeft', userName);

            // Update users list
            io.emit('userList', Array.from(users.values()));
        }
        console.log('A user disconnected:', socket.id);
    });
});

// Start server
const PORT = 3000;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
