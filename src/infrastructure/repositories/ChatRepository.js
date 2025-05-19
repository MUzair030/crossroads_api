import Chat from "../../domain/models/Chat.js";

class ChatRepository {
    static async findChatByParticipants(participant1, participant2) {
        return Chat.findOne({
            participants: {
                $all: [
                    { userId: participant1 },
                    { userId: participant2 },
                ],
            },
        });
    }

    static async createChat(participants) {
        const chat = new Chat({ participants, messages: [] });
        return chat.save();
    }

   static async findChatsByUser(userId) {
    const chats = await Chat.find({ 'participants.userId': userId })
        .populate({
            path: 'participants.userId',
            select: 'firstName lastName email'
        })
        .lean(); // use lean() to make manipulation easier

    // Trim messages to keep only the latest
    const chatsWithLatestMessage = chats.map(chat => {
        const latestMessage = chat.messages.length
            ? chat.messages[chat.messages.length - 1]
            : null;

        return {
            ...chat,
            messages: latestMessage ? [latestMessage] : [],
        };
    });

    return chatsWithLatestMessage;
}


    static async findChatById(chatId) {
        return Chat.findById(chatId);
    }

    static async updateChat(chat) {
        return chat.save();
    }
}

export default ChatRepository;
