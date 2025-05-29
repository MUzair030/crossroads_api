import Group from "../../domain/models/Group.js";

class GroupRepository {
    async create(data) {
        const group = new Group(data);
        return group.save();
    }

  async findPublicGroups({
  searchString,
  category,
  page = 1,
  limit = 10,
  userId,
} = {}) {
  const baseFilter = {
    type: 'public',
    isDeleted: false,
  };

  // Search by name (case-insensitive)
  if (typeof searchString === 'string' && searchString.trim() !== '') {
    baseFilter.name = { $regex: searchString.trim(), $options: 'i' };
  }

  // Filter by category
  if (typeof category === 'string' && category.trim() !== '') {
    baseFilter.categories = { $in: [category.trim()] };
  }

  const skipCount = (page > 0 ? page - 1 : 0) * limit;

  const query = Group.find(baseFilter)
  .sort({ createdAt: -1 }) // Newest first
  .select('name description bannerImages categories tags members inviteRequests creator') // include members & invites
  .skip(skipCount)
  .limit(limit)
  .populate('creator', 'name username _id profilePicture'); // Populate creator details

const groups = await query.exec();
const total = await Group.countDocuments(baseFilter);

// Compute status flags for the current user
const groupsWithStatus = groups.map(group => {
  const { isMember, isAdmin, isInvited } =  group.getUserGroupStatus(userId);
  return {
    ...group.toObject(),
    isMember,
    isAdmin,
    isInvited
  };
});

return {
  groups: groupsWithStatus,
  pagination: {
    total,
    page,
    limit
  }
};

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
