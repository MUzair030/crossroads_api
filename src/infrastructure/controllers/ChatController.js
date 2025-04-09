import express from 'express';
import CommonResponse from '../../application/common/CommonResponse.js';
import ChatService from '../../application/services/ChatService.js';
import UserManagementService from "../../application/services/UserManagementService.js";
// import {io} from "../../index.js";

const router = express.Router();
const userManagementService = new UserManagementService();
export const userSocketMap = {};

router.post('/initiate', async (req, res) => {
    const { userId1, userId2 } = req.body;
    try {
        const chat = await ChatService.initiateChat(userId1, userId2);
        CommonResponse.success(res, chat);
    } catch (err) {
        CommonResponse.error(res, err.message, 400);
    }
});

router.get('/user/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const chats = await ChatService.getUserChats(userId);
        CommonResponse.success(res, chats);
    } catch (err) {
        CommonResponse.error(res, err.message, 400);
    }
});

router.get('/:chatId', async (req, res) => {
    const { chatId } = req.params;
    try {
        const chat = await ChatService.getChatById(chatId);
        CommonResponse.success(res, chat);
    } catch (err) {
        CommonResponse.error(res, err.message, 400);
    }
});

router.post('/:chatId/message', async (req, res) => {
    const { chatId } = req.params;
    const { senderId, content } = req.body;
    try {
        const updatedChat = await ChatService.addMessage(chatId, senderId, content);
        CommonResponse.success(res, updatedChat);
    } catch (err) {
        CommonResponse.error(res, err.message, 400);
    }
});

export async function handleSendMessage(socket, data, io) {
    const { chatId, senderId, content } = data;
    try {
        const updatedChat = await ChatService.addMessage(chatId, senderId, content);
        const newMessage = updatedChat.messages[updatedChat.messages.length - 1];
    } catch (err) {
        console.error('Error sending message:', err);
        socket.emit('errorMessage', 'Failed to send message');
    }
}

// Helper function to get the socket IDs of participants in a chat
export async function getReceiverSocketId(chatId) {
    try {
        const chat = await ChatService.getChatById(chatId);
        if (chat) {
            return chat.participants;
        } else {
            console.log(`Chat ${chatId} not found.`);
            return null;
        }
    } catch (err) {
        console.error('Error fetching chat participants:', err);
        return null;
    }
}


export default router;
