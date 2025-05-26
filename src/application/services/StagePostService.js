import Event from "../../domain/models/Event.js";
import Group from "../../domain/models/Group.js";
import StagePost from "../../domain/models/StagePost.js";
class StagePostService {
  // Helper: Get parent (Event or Group) and check permissions
  async getParentAndCheckAuth(refType, refId, userId) {
    let parentDoc;

    if (refType === "Event") {
      parentDoc = await Event.findById(refId);
      if (!parentDoc) throw new Error("Event not found");

      const isOrganizer = parentDoc.organizerId?.equals(userId);
      const isTeamMember = parentDoc.team?.has(userId.toString());
      if (!isOrganizer && !isTeamMember) throw new Error("Unauthorized");
    } else if (refType === "Group") {
      parentDoc = await Group.findById(refId);
      if (!parentDoc) throw new Error("Group not found");

      const isAdmin = parentDoc.admins?.some(admin => admin.equals(userId));
      const isMod = parentDoc.moderators?.some(mod => mod.equals(userId));
      if (!isAdmin && !isMod) throw new Error("Unauthorized");
    } else {
      throw new Error("Invalid refType");
    }

    return parentDoc;
  }

 // Create a stage post and associate it with Event or Group
async create(refType, refId, postData, userId) {
  const parentDoc = await this.getParentAndCheckAuth(refType, refId, userId);

  const post = await StagePost.create({
    ...postData,
    creatorId: userId,
    refType,
    refId
  });

  // Add post reference to parent
  parentDoc.stagePosts = parentDoc.stagePosts || [];
  parentDoc.stagePosts.push(post._id);
  await parentDoc.save();

  return post;
}


  // Update post text/media
  async update(postId, userId, updatedFields) {
    const post = await StagePost.findById(postId);
    if (!post) throw new Error("Stage post not found");

    return await post.editPost(userId, updatedFields.text, updatedFields.mediaUrls);
  }

  // Delete post
  async delete(postId, userId) {
    const post = await StagePost.findById(postId);
    if (!post) throw new Error("Stage post not found");

    const parent = await this.getParentAndCheckAuth(post.refType, post.refId, userId);
    if (post.creatorId.toString() !== userId.toString()) {
      throw new Error("Unauthorized to delete post");
    }

    await StagePost.findByIdAndDelete(postId);
    return true;
  }

  // Toggle like
  async toggleLike(postId, userId) {
    const post = await StagePost.findById(postId);
    if (!post) throw new Error("Stage post not found");

    return await post.toggleLike(userId);
  }

  // Add comment
  async addComment(postId, userId, text) {
    const post = await StagePost.findById(postId);
    if (!post) throw new Error("Stage post not found");

    return await post.addComment(userId, text);
  }

  // Edit comment
  async editComment(postId, commentId, userId, newText) {
    const post = await StagePost.findById(postId);
    if (!post) throw new Error("Stage post not found");

    return await post.editComment(commentId, userId, newText);
  }

  // Delete comment
  async deleteComment(postId, commentId, userId) {
    const post = await StagePost.findById(postId);
    if (!post) throw new Error("Stage post not found");

    await post.deleteComment(commentId, userId);
    return true;
  }

  // Reorder posts for a specific refType + refId
  async reorderPosts(refType, refId, newOrderIds, userId) {
    const parent = await this.getParentAndCheckAuth(refType, refId, userId);

    const posts = await StagePost.find({ refType, refId });

    if (posts.length !== newOrderIds.length)
      throw new Error("Mismatch in number of posts and order list");

    const postMap = new Map(posts.map(p => [p._id.toString(), p]));

    const ordered = newOrderIds.map(id => postMap.get(id.toString()));
    if (ordered.includes(undefined)) throw new Error("Invalid post ID in order list");

    // Optional: Save order index in each post if needed
    for (let i = 0; i < ordered.length; i++) {
      ordered[i].order = i;
      await ordered[i].save();
    }

    return ordered;
  }
}

export default new StagePostService();
