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
    const objectUserId = new mongoose.Types.ObjectId(userId);


  const groups = await Group.find({
    isDeleted: false,
    'members.user': objectUserId,
    creator:  objectUserId , // Exclude created groups
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('name description bannerImages categories tags createdAt');

  const total = await Group.countDocuments({
    isDeleted: false,
    'members.user': objectUserId,
    creator:   objectUserId, // Exclude created groups,
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


      async  findGroupById(groupId, currentUserId = null) {
      const group = await Group.findOne({ _id: groupId, isDeleted: false })
        .populate('creator', 'name email profilePicture')
        .populate('members.user', 'name email profilePicture')
        .populate('inviteRequests.user', 'name email profilePicture')
        .populate({
          path: 'stagePosts',
          populate: {
            path: 'creatorId',
            select: 'name email profilePicture',
          }
        })
        .lean({ virtuals: true });
    
      if (!group) {
        throw new Error('Group not found');
      }
    
      const isMember = group.members.some(m => m.user?._id?.toString() === currentUserId?.toString());
      const isAdmin = group.members.some(m =>
        m.user?._id?.toString() === currentUserId?.toString() && m.role === 'admin'
      );
      const isCreator = group.creator?._id?.toString() === currentUserId?.toString();
      const isInvited = group.inviteRequests.some(
        req => req.user?._id?.toString() === currentUserId?.toString() && req.status === 'pending'
      );
      const isPublic = group.type === 'public';
    
      const base = {
        _id: group._id,
        name: group.name,
        bannerImages: group.bannerImages,
        categories: group.categories,
        tags: group.tags,
        type: group.type,
        creator: group.creator,
        createdAt: group.createdAt,
      };
    
      // Admin/Creator full access
      if (isAdmin || isCreator) {
        return {
          ...group,
          isAdmin,
          isCreator,
          isMember,
          isInvited,
        };
      }
    
      // Member or Invited to Private Group
      if (isMember || isInvited) {
        return {
          ...base,
          description: group.description,
          stagePosts: group.stagePosts,
          members: group.members,
          inviteRequests: group.inviteRequests,
          isAdmin,
          isCreator,
          isMember,
          isInvited,
        };
      }
    
      // Public Group — show limited data
      if (isPublic) {
        return {
          ...base,
          description: group.description,
          stagePosts: group.stagePosts,
        };
      }
    
      // Private Group + Not Member + Not Invited
      throw new Error('Unauthorized access to private group');
    }

}

export default new GroupService();
