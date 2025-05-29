import FileUploadService from '../services/FileUploadService.js';
import GroupRepository from "../../infrastructure/repositories/GroupRepository.js";
import mongoose from "mongoose";
import Group from "../../domain/models/Group.js";
import { registerNotification } from '../../application/services/NotificationService.js'; // adjust path as needed


class GroupService {
    async createGroup(data) {
        return GroupRepository.create(data);
    }

    // In GroupService
async getAllPublicGroups({ searchString = '', category = '', page = 1, limit = 10, userId }) {
  return GroupRepository.findPublicGroups({
    userId,
    searchString,
    category,
    page,
    limit,
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
                await registerNotification({
                        type: 'group_invite',
                        title: 'You’ve been invited!',
                        message: `You’ve been invited to the group "${group.name}"`,
                        receiverId: userId,
                        senderId: inviterId,
                        metadata: { groupId: group._id }
                      });
            }
        }
        return GroupRepository.save(group);
    }


    async respondToInviteOrJoin(groupId, userId, action) {
  const group = await GroupRepository.findById(groupId);
  if (!group) throw new Error('Group not found.');

  const isPublic = group.type === 'public';
  const isPrivate = group.type === 'private';

  const isAlreadyMember = group.members.some(m => m.user.toString() === userId);
  if (isAlreadyMember) throw new Error('User is already a group member.');

  const inviteRequestIndex = group.inviteRequests.findIndex(req => req.user.toString() === userId);

  if (isPrivate && inviteRequestIndex === -1) {
    throw new Error('You must be invited to join this private group.');
  }

  if (action === 'accept') {
    // Add to members
    group.members.push({ user: userId, role: 'member' });

    // Remove from inviteRequestss
    if (inviteRequestIndex > -1) {
      group.inviteRequests.splice(inviteRequestIndex, 1);
    }

    

  } else if (action === 'reject') {
    // Only reject if user was invited
    if (inviteRequestIndex > -1) {
      group.inviteRequests[inviteRequestIndex].status = 'rejected';
    } else {
      throw new Error('You have not been invited to this group.');
    }

  } else {
    throw new Error('Invalid action. Use "accept" or "reject".');
  }
  GroupRepository.save(group);

  return { groupId: group._id };
}


    async getMyCreatedGroups(userId, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  const objectUserId = new mongoose.Types.ObjectId(userId);


  const groups = await Group.find({ creator: objectUserId, isDeleted: false })
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
