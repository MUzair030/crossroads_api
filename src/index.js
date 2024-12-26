import express from 'express';
import cors from 'cors';
import session from 'express-session';
import connectDB from './infrastructure/database/MongoDB.js';
import bodyParser from 'body-parser';
import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import passport from './application/services/GoogleAuthService.js';
import CommonResponse from "./application/common/CommonResponse.js";
import authController from './infrastructure/controllers/AuthController.js';
import profileController from './infrastructure/controllers/ProfileController.js';
import friendController from './infrastructure/controllers/FriendController.js';
import postsController from './infrastructure/controllers/ThreadController.js';
import chatController, {
    getReceiverSocketId,
    handleSendMessage,
    userSocketMap
} from './infrastructure/controllers/ChatController.js';

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO server with Express HTTP server
const io = new SocketIOServer(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

const corsOptions = {
    origin: process.env.ALLOWED_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
};

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());

app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: true,
}));
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth', authController);
app.use('/api/account', profileController);
app.use('/api/users', profileController);
app.use('/api/friend', friendController);
app.use('/api/posts', postsController);
app.use('/api/chat', chatController);

// Socket.IO Connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Register user by their userId (sent via query string or headers)
    socket.on('registerUser', (userId) => {
        userSocketMap[userId] = socket.id;
        console.log(`User ${userId} connected with socket ID: ${socket.id}`);
    });

    // Listen for 'sendMessage' events from users
    socket.on('sendMessage', async (data) => {
        const { senderId, chatId, content } = data;
        handleSendMessage(socket, data, io);

        try {
            // Fetch the participants for the given chatId
            const participants = await getReceiverSocketId(chatId);
            if (participants) {
                participants.forEach((participant) => {
                    const receiverSocketId = userSocketMap[participant.userId]; // Use userId to get socket ID

                    if (receiverSocketId) {
                        // Send notification to the receiver
                        io.to(receiverSocketId).emit('newMessageNotification', {
                            senderId,
                            content,
                            notification: 'You have a new message!',
                        });
                        console.log(`Notification sent to receiver ${participant.userId} in chat ID: ${chatId}`);
                    } else {
                        console.log(`User ${participant.userId} is not online`);
                    }
                });
            } else {
                console.log(`No participants found for chat ID: ${chatId}`);
            }
        } catch (err) {
            console.error('Error sending message notification:', err);
        }
    });

    // Handle user disconnections
    socket.on('disconnect', () => {
        for (let userId in userSocketMap) {
            if (userSocketMap[userId] === socket.id) {
                delete userSocketMap[userId];
                console.log(`User ${userId} disconnected and removed from map`);
                break;
            }
        }
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err);
    CommonResponse.error(res, err);
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {  // Make sure you're using server.listen() to bind with HTTP server
    console.log(`Server started on port ${PORT}`);
});
