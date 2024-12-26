import express from 'express';
import multer from 'multer';
import CommonResponse from '../../application/common/CommonResponse.js';
import ThreadService from "../../application/services/ThreadService.js";
import CommentService from "../../application/services/CommentService.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/thread', upload.array('media', 10), async (req, res) => {
    const { title, description, creatorId } = req.body;

    try {
        const newThread = await ThreadService.createThread(title, description, creatorId, req.files);
        CommonResponse.success(res, newThread);
    } catch (err) {
        CommonResponse.error(res, err.message, 500);
    }
});

router.get('/threads', async (req, res) => {
    try {
        const threads = await ThreadService.getAllThreads();
        CommonResponse.success(res, threads);
    } catch (err) {
        CommonResponse.error(res, err.message, 500);
    }
});

router.post('/comment', upload.array('media', 10), async (req, res) => {
    const { content, threadId, senderId } = req.body;

    try {
        const newMessage = await CommentService.createComment(content, threadId, senderId, req.files);
        CommonResponse.success(res, newMessage);
    } catch (err) {
        CommonResponse.error(res, err.message, 500);
    }
});

router.get('/thread/:threadId', async (req, res) => {
    const { threadId } = req.params;

    try {
        const thread = await ThreadService.getThreadById(threadId);
        if (!thread) {
            return CommonResponse.error(res, 'Thread not found', 404);
        }

        const comments = await CommentService.getCommentsByThread(threadId);
        CommonResponse.success(res, { thread, comments });
    } catch (err) {
        CommonResponse.error(res, err.message, 500);
    }
});

export default router;
