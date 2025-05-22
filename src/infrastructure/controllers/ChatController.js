import express from 'express';
import CommonResponse from '../../application/common/CommonResponse.js';
import ChatService from '../../application/services/ChatService.js';
import UserManagementService from "../../application/services/UserManagementService.js";
import Chat from "../../domain/models/Chat.js";

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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    try {
        const chats = await ChatService.getUserChats(userId, page, limit);
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

router.post('/:chatId/read', async (req, res) => {
    const { chatId } = req.params;
    const { userId } = req.body;

    try {
        const updatedChat = await ChatService.markChatAsRead(chatId, userId);
        CommonResponse.success(res, updatedChat);
    } catch (err) {
        CommonResponse.error(res, err.message, 400);
    }
});

export async function markChatAsRead(chatId, userId) {
    return ChatRepository.markChatAsRead(chatId, userId);
}


export async function findChatsByUser(userId) {
    const chats = await Chat.find({ 'participants.userId': userId })
        .populate({
            path: 'participants.userId',
            select: 'name'
        })
        .lean();

    const chatSummaries = chats.map(chat => {
        const otherParticipant = chat.participants.find(p => p.userId._id.toString() !== userId.toString());
        const senderName = otherParticipant ? `${otherParticipant.userId.name}` : 'Unknown';
        const lastMessage = chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null;

        return {
                        
            //unreadMessageCount: chat.unreadMessageCount,
            chatId: chat._id,
            senderName: senderName,
            lastMessage: lastMessage ? {
                content: lastMessage.content,
                sentAt: lastMessage.sentAt,
                sender: lastMessage.sender
            } : null
        };
    });

    return chatSummaries;
}



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
