import express from 'express';
import multer from 'multer';
import CommonResponse from '../../application/common/CommonResponse.js';
import GroupService from "../../application/services/GroupService.js";
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
router.post(
  '/',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const {
      name,
      description,
      categories,
      tags,
      bannerImages,
      type, // public / private
    } = req.body;

    const userId = req.user.id;

    try {
      const group = await GroupService.createGroup({
        name,
        description,
        categories: categories || [],
        tags: tags || [],
        bannerImages: bannerImages || [],
        type,
        creator: userId,
        members: [
          {
            user: new mongoose.Types.ObjectId(userId),
            role: 'admin',
          },
        ],
        stagePosts: [],
        eventIds: [],
        eventStatuses: new Map(),
      });

      CommonResponse.success(res, group);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);




router.get('/public', 
      passport.authenticate('jwt', { session: false }),

    async (req, res) => {
        const { userId } = req.params;

  try {
    const {
      category,
      searchString,
      page,
      limit,
    } = req.query;

    const filters = {
      category,
      searchString,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    };

    const groups = await GroupService.getAllPublicGroups({...filters,userId});
    CommonResponse.success(res, groups);
  } catch (err) {
    CommonResponse.error(res, err.message || 'Something went wrong', 400);
  }
});

// Get paginated groups created by user
router.get(
  '/:userId/my-groups',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    try {
      const result = await GroupService.getMyCreatedGroups(userId, parseInt(page), parseInt(limit));
      CommonResponse.success(res, result);
    } catch (err) {
      CommonResponse.error(res, err.message, 403);
    }
  }
);


// Get paginated groups joined by user
router.get(
  '/:userId/joined-groups',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    try {
      const result = await GroupService.getMyJoinedGroups(userId, parseInt(page), parseInt(limit));
      CommonResponse.success(res, result);
    } catch (err) {
      CommonResponse.error(res, err.message, 403);
    }
  }
);




// Edit/Modify Group
router.post(
  '/:groupId',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { groupId } = req.params;
    const {
      name,
      description,
      categories,
      tags,
      bannerImages,
      type,
    } = req.body;

    const updates = {};

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (categories !== undefined) updates.categories = categories;
    if (tags !== undefined) updates.tags = tags;
    if (bannerImages !== undefined) updates.bannerImages = bannerImages;
    if (type !== undefined) updates.type = type;

    try {
      const group = await GroupService.editGroup(groupId, updates, req.user.id);
      CommonResponse.success(res, group);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);


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





export default router;
