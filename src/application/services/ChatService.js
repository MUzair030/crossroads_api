import ChatRepository from "../../infrastructure/repositories/ChatRepository.js";


class ChatService {
    static async initiateChat(participant1, participant2) {
    let chat = await ChatRepository.findChatByParticipants(participant1, participant2);

    if (!chat) {
        chat = await ChatRepository.createChat([
            { userId: participant1 },
            { userId: participant2 },
        ]);
    }

    return { chatId: chat._id };
}


    static async getUserChats(userId,page,limit) {
        return ChatRepository.findChatsByUser(userId,page,limit);
    }

    static async getChatById(chatId) {
        return ChatRepository.findChatById(chatId);
    }

    static async markChatAsRead(chatId, userId) {
    return ChatRepository.markChatAsRead(chatId, userId);
}


    static async addMessage(chatId, senderId, content) {
    const chat = await ChatRepository.findChatById(chatId);
    if (!chat) throw new Error('Chat not found');

    // Add the new message
    chat.messages.push({ sender: senderId, content });

    // Ensure unreadMessageCounts is initialized
    if (!chat.unreadMessageCounts || chat.unreadMessageCounts.length === 0) {
        chat.unreadMessageCounts = chat.participants.map(p => ({
            userId: p.userId,
            count: 0
        }));
    }

    // Increment unread count for every participant except sender
    chat.unreadMessageCounts.forEach(entry => {
        if (entry.userId.toString() !== senderId.toString()) {
            entry.count += 1;
        }
    });

    return ChatRepository.updateChat(chat);
}


    static async streamMessages(chatId, page = 1) {
    const messages = await ChatRepository.streamMessages(chatId, page);
    if (!messages) throw new Error('Chat not found');
    return messages;
}




}

export default ChatService;
