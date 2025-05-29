import FileUploadService from '../services/FileUploadService.js';
import GroupRepository from "../../infrastructure/repositories/GroupRepository.js";
import mongoose from "mongoose";
import Group from "../../domain/models/Group.js";

class GroupService {
    async createGroup(data) {
        return GroupRepository.create(data);
    }

    async getAllPublicGroups(searchString = '', category = '', page = 1, limit = 10, userId) {
        return GroupRepository.findPublicGroups({
            userId: userId,
  searchString: searchString,
  category: category,
  page: page,
  limit: limit,
    });
    }
    async editGroup(groupId, updates, userId) {
        const group = await GroupRepository.findById(groupId);
        if (!group) throw new Error('Group not found.');
        if (group.creator.toString() !== userId) throw new Error('Unauthorized.');

        return GroupRepository.updateGroup(groupId, updates);
    }

    async searchPublicGroups(query, category) {
        return GroupRepository.searchPublicGroups(query, category);
    }

    async inviteUsers(groupId, userIds, inviterId) {
        // Convert groupId and userIds to ObjectId
        const groupIdObject = new mongoose.Types.ObjectId(groupId);
        const userIdsArray = userIds?.map(userId => new mongoose.Types.ObjectId(userId));
        const group = await GroupRepository.findById(groupIdObject);
        if (!group) {
            throw new Error('Group not found.');
        }

        console.log("group.members", group.members)

        const isAdmin = group?.members.some(m => m.user && m.user._id.toString() === inviterId && m.role === 'admin');
        if (!isAdmin) {
            throw new Error('Only admins can invite users.');
        }

        // Add users to inviteRequests if they are not already invited
        for (const userId of userIdsArray) {
            const isAlreadyInvited = group?.inviteRequests.some(req => req.user.toString() === userId.toString());
            if (!isAlreadyInvited) {
                group?.inviteRequests.push({ user: userId });
            }
        }
        return GroupRepository.save(group);
    }

    async getMyCreatedGroups(userId, page = 1, limit = 10) {
  const skip = (page - 1) * limit;

  const groups = await Group.find({ creator: userId, isDeleted: false })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('name description bannerImages categories tags createdAt');

  const total = await Group.countDocuments({ creator: userId, isDeleted: false });

  return {
    groups,
    pagination: {
      page,
      limit,
      total,
    },
  };
}

async getMyJoinedGroups(userId, page = 1, limit = 10) {
  const skip = (page - 1) * limit;

  const groups = await Group.find({
    isDeleted: false,
    'members.user': userId,
    creator: { $ne: userId }, // Exclude created groups
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('name description bannerImages categories tags createdAt');

  const total = await Group.countDocuments({
    isDeleted: false,
    'members.user': userId,
    creator: { $ne: userId },
  });

  return {
    groups,
    pagination: {
      page,
      limit,
      total,
    },
  };
}



    async updateMemberRole(groupId, userId, role, adminId) {
        const group = await GroupRepository.findById(groupId);
        if (!group) throw new Error('Group not found.');
        const isAdmin = group?.members.some(m => m.user.toString() === adminId && m.role === 'admin');
        if (!isAdmin) throw new Error('Unauthorized.');

        const member = group?.members.find(m => m.user.toString() === userId);
        if (!member) throw new Error('User is not a member.');
        member.role = role;

        return GroupRepository.save(group);
    }

}

export default new GroupService();
