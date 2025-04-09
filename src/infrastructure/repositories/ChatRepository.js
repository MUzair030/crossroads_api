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
        return Chat.find({
            'participants.userId': userId,
        }).populate('participants.userId', 'firstName lastName email');
    }

    static async findChatById(chatId) {
        return Chat.findById(chatId);
    }

    static async updateChat(chat) {
        return chat.save();
    }
}

export default ChatRepository;
