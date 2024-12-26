import FileUploadService from './FileUploadService.js';
import ThreadRepository from "../../infrastructure/repositories/ThreadRepository.js";

class ThreadService {
    async createThread(title, description, creatorId, files) {
        let mediaUrls = [];

        if (files && files.length > 0) {
            for (let file of files) {
                try {
                    const fileBuffer = file.buffer;
                    const fileName = `${Date.now()}-${file.originalname}`;
                    const mimeType = file.mimetype;

                    const result = await FileUploadService.uploadToS3(fileBuffer, fileName, mimeType);
                    mediaUrls.push(result.Location);
                } catch (err) {
                    throw new Error('Error uploading files: ' + err.message);
                }
            }
        }

        const newThread = await ThreadRepository.createThread({
            title,
            description,
            media: mediaUrls,
            creator: creatorId,
        });

        return newThread;
    }

    async getAllThreads() {
        return await ThreadRepository.getAllThreads();
    }

    async getThreadById(threadId) {
        return await ThreadRepository.getThreadById(threadId);
    }
}

export default new ThreadService();
