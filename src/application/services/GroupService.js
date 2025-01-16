import FileUploadService from '../services/FileUploadService.js';
import GroupRepository from "../../infrastructure/repositories/GroupRepository.js";
import mongoose from "mongoose";

class GroupService {
    async createGroup(data) {
        return GroupRepository.create(data);
    }

    async getAllPublicGroups() {
        return GroupRepository.findPublicGroups();
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
