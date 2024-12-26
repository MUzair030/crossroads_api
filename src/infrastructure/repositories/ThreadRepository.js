import Thread from "../../domain/models/Thread.js";


class ThreadRepository {
    async createThread(data) {
        const thread = new Thread(data);
        return await thread.save();
    }

    async getAllThreads() {
        return await Thread.find().populate('creator', 'username').sort({ timestamp: -1 });
    }

    async getThreadById(threadId) {
        return await Thread.findById(threadId).populate('creator', 'username').exec();
    }
}

export default new ThreadRepository();
