import express from 'express';
import multer from 'multer';
import CommonResponse from '../../application/common/CommonResponse.js';
import GroupService from "../../application/services/GroupService.js";
import GroupPostService from "../../application/services/GroupPostService.js";
import passport from "../../application/services/GoogleAuthService.js";
import mongoose from "mongoose";


const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (file && !file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed'), false);
        }
        cb(null, true);
    },
});
// 1. Create Group
router.post('/', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const { name, description, category, coverPicture, groupPicture, type } = req.body;
    const userId = req.user.id;

    try {
        const group = await GroupService.createGroup({
            name,
            description,
            category,
            coverPicture,
            groupPicture,
            members: [{
                user: new mongoose.Types.ObjectId(userId),
                role: "admin"
            }],
            type,
            creator: userId,
        });
        CommonResponse.success(res, group);
    } catch (err) {
        CommonResponse.error(res, err.message, 400);
    }
});

// 2. Get All Public Groups
router.get('/public', async (req, res) => {
    try {
        const groups = await GroupService.getAllPublicGroups();
        CommonResponse.success(res, groups);
    } catch (err) {
        CommonResponse.error(res, err.message, 400);
    }
});

// 3. Edit/Modify Group
router.post('/:groupId', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const { groupId } = req.params;
    const updates = req.body;

    try {
        const group = await GroupService.editGroup(groupId, updates, req.user.id);
        CommonResponse.success(res, group);
    } catch (err) {
        CommonResponse.error(res, err.message, 400);
    }
});

// 4. Search Public Groups
router.get('/search', async (req, res) => {
    const { query, category } = req.query;
    console.log(query, category)

    try {
        const groups = await GroupService.searchPublicGroups(query, category);
        CommonResponse.success(res, groups);
    } catch (err) {
        CommonResponse.error(res, err.message, 400);
    }
});


// 5. Invite Users to Group
router.get('/invite', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const { groupId, userIds } = req.query;
        const parsedUserIds = userIds.split(",");
        await GroupService.inviteUsers(groupId, parsedUserIds, req.user.id);
        CommonResponse.success(res, { message: 'Users invited successfully.' });
    } catch (err) {
        console.error("Error:", err);  // Log the error to debug
        CommonResponse.error(res, err.message, 400);
    }
});

// 7. Update Member Roles
router.patch('/role', async (req, res) => {
    const { groupId, userId, role } = req.body;

    try {
        await GroupService.updateMemberRole(groupId, userId, role, req.user.id);
        CommonResponse.success(res, { message: 'Member role updated successfully.' });
    } catch (err) {
        CommonResponse.error(res, err.message, 400);
    }
});



// POSTS ================

// 1. Create Group Post
router.get('/:groupId/posts', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const { groupId } = req.params;

    try {
        const post = await GroupPostService.getAllGroupPosts({
            groupId,
            userId: req.user.id,
        });
        CommonResponse.success(res, post);
    } catch (err) {
        CommonResponse.error(res, err.message, 400);
    }
});

router.post('/:groupId/posts', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const { content, images } = req.body;
    const { groupId } = req.params;

    try {
        const post = await GroupPostService.createGroupPost({
            groupId,
            content,
            images,
            userId: req.user.id,
        });
        CommonResponse.success(res, post);
    } catch (err) {
        CommonResponse.error(res, err.message, 400);
    }
});

// 2. Edit Group Post
router.put('/posts/:postId', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const { postId } = req.params;
    const { content, images } = req.body;

    try {
        const updatedPost = await GroupPostService.editGroupPost({
            postId,
            content,
            images,
            userId: req.user.id,
        });
        CommonResponse.success(res, updatedPost);
    } catch (err) {
        CommonResponse.error(res, err.message, 400);
    }
});

// 3. Add Comment to Group Post
router.post('/posts/:postId/comment', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const { postId } = req.params;
    const { content } = req.body;

    try {
        const comment = await GroupPostService.addCommentToPost({
            postId,
            content,
            userId: req.user.id,
        });
        CommonResponse.success(res, comment);
    } catch (err) {
        CommonResponse.error(res, err.message, 400);
    }
});

// 4. Edit Existing Comment
router.put('/posts/comment/:commentId', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    try {
        const updatedComment = await GroupPostService.editComment({
            commentId,
            content,
            userId: req.user.id,
        });
        CommonResponse.success(res, updatedComment);
    } catch (err) {
        CommonResponse.error(res, err.message, 400);
    }
});


export default router;
