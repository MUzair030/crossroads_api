import ChatRepository from "../../infrastructure/repositories/ChatRepository.js";


class ChatService {
    static async initiateChat(participant1, participant2) {
        let chat = await ChatRepository.findChatByParticipants(participant1, participant2);

        if (!chat) {
            // If not, create a new chat
            chat = await ChatRepository.createChat([
                { userId: participant1 },
                { userId: participant2 },
            ]);
        }
        return chat;
    }

    static async getUserChats(userId) {
        return ChatRepository.findChatsByUser(userId);
    }

    static async getChatById(chatId) {
        return ChatRepository.findChatById(chatId);
    }

    static async addMessage(chatId, senderId, content) {
        const chat = await ChatRepository.findChatById(chatId);
        if (!chat) throw new Error('Chat not found');
        chat.messages.push({ sender: senderId, content });
        return ChatRepository.updateChat(chat);
    }
}

export default ChatService;
