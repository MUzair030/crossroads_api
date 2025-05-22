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

  static async findChatsByUser(userId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const chats = await Chat.aggregate([
        // Match chats where user is a participant
        { $match: { 'participants.userId': userId } },

        // Add a field for lastMessage
        {
            $addFields: {
                lastMessage: { $arrayElemAt: ["$messages", -1] }
            }
        },

        // Sort by lastMessage.sentAt descending
        {
            $sort: { "lastMessage.sentAt": -1 }
        },

        // Pagination
        { $skip: skip },
        { $limit: limit },

        // Lookup to populate participant details
        {
            $lookup: {
                from: "users", // adjust if your user collection is named differently
                localField: "participants.userId",
                foreignField: "_id",
                as: "participantUsers"
            }
        },

        // Project relevant fields
        {
            $project: {
                chatId: "$_id",
                participants: 1,
                lastMessage: {
                    content: "$lastMessage.content",
                    sentAt: "$lastMessage.sentAt",
                    sender: "$lastMessage.sender"
                },
                participantUsers: {
                    _id: 1,
                    name: 1
                }
            }
        }
    ]);

    // Map each chat to include sender name
    const chatSummaries = chats.map(chat => {
        const otherUser = chat.participantUsers.find(
            u => u._id.toString() !== userId.toString()
        );

        return {
            chatId: chat.chatId,
            senderName: otherUser ? otherUser.name : 'Unknown',
            lastMessage: chat.lastMessage
        };
    });

    return chatSummaries;
}




    static async findChatById(chatId) {
        return Chat.findById(chatId);
    }

    static async updateChat(chat) {
        return chat.save();
    }

    static async streamMessages(chatId, page = 1) {
    const chat = await Chat.findById(chatId, { messages: { $slice: [-20 * page, 20] } });

    if (!chat) return null;

    const totalMessages = chat.messages.length;
    const startIndex = Math.max(0, totalMessages - (page * 20));
    const paginatedMessages = chat.messages.slice(startIndex, startIndex + 20);

    return paginatedMessages;
}
static async markChatAsRead(chatId, userId) {
    const chat = await Chat.findById(chatId);
    if (!chat) throw new Error('Chat not found');

    const entry = chat.unreadMessageCounts.find(c => c.userId.toString() === userId.toString());
    if (entry) {
        entry.count = 0;
    }

    return chat.save();
}


}




export default ChatRepository;
