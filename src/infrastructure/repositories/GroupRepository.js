import Group from "../../domain/models/Group.js";

class GroupRepository {
    async create(data) {
        const group = new Group(data);
        return group.save();
    }

    async findPublicGroups() {
        return Group.find({ type: 'public', isDeleted: false });
    }

    async findById(groupId) {
        return Group.findById(groupId).populate('members.user').populate('inviteRequests.user');
    }

    async updateGroup(groupId, updates) {
        return Group.findByIdAndUpdate(groupId, updates, { new: true });
    }

    async searchPublicGroups(query, category) {
        const filter = { type: 'public', isDeleted: false };
        if (query) filter.name = { $regex: query, $options: 'i' };
        if (category) filter.category = category;
        return Group.find(filter);
    }

    async save(group) {
        return group.save();
    }
}

export default new GroupRepository();
