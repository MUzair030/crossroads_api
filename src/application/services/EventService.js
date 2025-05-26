import EventRepository from "../../infrastructure/repositories/EventRepository.js";
import GroupRepository from "../../infrastructure/repositories/GroupRepository.js";
import Event from "../../domain/models/Event.js";
import User from "../../domain/models/User.js";
import mongoose from "mongoose";

class EventService {


  // Create a new event
  async createEvent(data) {
    const { groupId, creatorId } = data;

    if (groupId) {
      // Find the group by ID
      const group = await GroupRepository.findById(groupId);
      if (!group) throw new Error('Group not found.');

      // Check if creator is admin in the group
      const isAdmin = group.members.some(
        (m) => m.user.toString() === creatorId && m.role === 'admin'
      );
      if (!isAdmin) throw new Error('Only group admins can create events.');

      // Mark the event as linked with this group
      data.isLinkedWithGroup = true;
      data.groupId = groupId;
      data.isLive = data.isLive ?? false;
      data.access = data.access ?? 'public';

      // Create the event
      const event = await EventRepository.create(data);

      // Add event ID to group's eventIds array
      group.eventIds.push(event._id);

      // Optionally update event status map
      group.eventStatuses.set(event._id.toString(), 'upcoming');

      // Save updated group
      await GroupRepository.save(group);

      // Add event ID to creator's myEventIds array
      await User.findByIdAndUpdate(
        creatorId,
        { $push: { myEventIds: event._id } },
        { new: true }
      );

      return event;
    } else {
      // No group linked — create standalone event
      data.isLinkedWithGroup = false;
      data.groupId = null;
      data.isLive = data.isLive ?? false;
      data.access = data.access ?? 'public';

      const event = await EventRepository.create(data);

      // Add event ID to creator's myEventIds array
      await User.findByIdAndUpdate(
        creatorId,
        { $push: { myEventIds: event._id } },
        { new: true }
      );

      return event;
    }
  }

  //Upload Images
  async uploadEventBannerImage(file, event) {
      const uniqueFileName = `images/events/${event.id}/${uuidv4()}_${file.originalname}`;
      const uploadResult = await FileUploadService.uploadToS3(file.buffer, uniqueFileName, file.mimetype);
      console.log("uploadResult:::::::: ", uploadResult);
      await this.editEvent(event.id, {bannerImages: uploadResult?.Location});
      return uploadResult;
    }


  //Get Event by ID
  async getEventById(eventId, currentUserId) {
        return EventRepository.findById(eventId, currentUserId);
  }
    
  async getAllEvents(reqBody) {
        return EventRepository.findPublicEvents(reqBody);
  }

  // Edit an existing event
  async  editEvent(eventId, updates, userId) {
    // Find event
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    // Check if the user is authorized to edit (e.g., must be the organizer)
    if (!event.organizerId.equals(userId)) {
      throw new Error('Unauthorized to edit this event');
    }

    // Update allowed fields only (optional: whitelist fields)
    const allowedUpdates = [
      'title', 'description', 'locations', 'dates',
      'categories', 'bannerImages', 'isLive', 'access',
      'price', 'maxAttendees', 'tags', 'services',
    ];

    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        event[key] = updates[key];
      }
    });

    // Save and return updated event
    return event.save();
  }

  async searchEvents(query, page, limit ) {
        return EventRepository.searchPublicEvents(query, page, limit);
  }

  // Soft delete an event  
  async softDeleteEvent(eventId, userId) {
    const event = await Event.findById(eventId);

    if (!event) {
      throw new Error("Event not found");
    }

    if (!event.organizerId || !event.organizerId.equals(userId)) {
      throw new Error("Unauthorized: You are not the organizer");
    }

    event.isDeleted = true;
    await event.save();

    return { message: "Event soft-deleted successfully" };
  }

// Like and dislike events

  async likeEvent(eventId, userId) {
    const event = await Event.findById(eventId);
    if (!event) throw new Error('Event not found');
    await event.like(userId);
    return { success: true, message: 'Event liked' };
  }

  async dislikeEvent(eventId, userId) {
    const event = await Event.findById(eventId);
    if (!event) throw new Error('Event not found');
    await event.unlike(userId);
    return { success: true, message: 'Event unliked' };
  }

  // Vote for a location or date option
  async voteOnOption(eventId, type, index, userId) {
    const event = await Event.findById(eventId);
    if (!event) throw new Error('Event not found');

    // Call schema method
    return event.vote(type, index, userId);
  }

  // Unvote for a location or date option
  async unvoteOnOption(eventId, type, index, userId) {
    const event = await Event.findById(eventId);
    if (!event) throw new Error('Event not found');

    // Call schema method
    return event.unvote(type, index, userId);
  }

// Invite users to an event
  async inviteUsersToEvent(eventId, inviterId, userIds) {
  const event = await Event.findById(eventId);
  if (!event) throw new Error('Event not found');

  const isOrganizer = event.organizerId?.toString() === inviterId.toString();
  const isTeamMember = event.team?.has(inviterId.toString());
  if (!isOrganizer && !isTeamMember) {
    throw new Error('Unauthorized to invite users');
  }

  await event.inviteUsers(userIds, inviterId); // ✅ pass inviterId for notifications
  return event;
  }

  async respondToEventInvite(eventId, userId, status) {
  const event = await Event.findById(eventId);
  if (!event) throw new Error('Event not found');

  await event.respondToInvite(userId, status); // schema method
  return event;
  }
  //add a stage post to an event
 async addStagePost(eventId, postData, userId) {
  const event = await Event.findById(eventId);
  if (!event) throw new Error("Event not found");

  const isOrganizer = event.organizerId?.equals(userId);
  const isTeamMember = event.team?.has(userId.toString());
  if (!isOrganizer && !isTeamMember) {
    throw new Error("Unauthorized to add stage posts");
  }

  // Inject creatorId into the post data
  const newPost = {
    ...postData,
    creatorId: userId,
    timestamp: new Date(), // optional, in case you want to explicitly set it
  };

  event.stagePosts.push(newPost);
  await event.save();

  return event;
}


  // Update an existing stage post in an event
  async updateStagePost(eventId, postId, updatedFields, userId) {
    const event = await Event.findById(eventId);
    if (!event) throw new Error("Event not found");

    const isOrganizer = event.organizerId?.equals(userId);
    const isTeamMember = event.team?.has(userId.toString());
    if (!isOrganizer && !isTeamMember) {
      throw new Error("Unauthorized to update stage posts");
    }

    // Use schema method to update stage post
    await event.updateStagePost(postId, updatedFields);
    return event;
  }

  // Delete a stage post by ID
  async deleteStagePost(eventId, postId, userId) {
    const event = await Event.findById(eventId);
    if (!event) throw new Error("Event not found");

    const isOrganizer = event.organizerId?.equals(userId);
    const isTeamMember = event.team?.has(userId.toString());
    if (!isOrganizer && !isTeamMember) {
      throw new Error("Unauthorized to delete stage posts");
    }

    await event.deleteStagePost(postId);
    return event;
  }

  // Reorder stage posts by providing new order of stagePost IDs
  async reorderStagePosts(eventId, newOrderIds, userId) {
    const event = await Event.findById(eventId);
    if (!event) throw new Error("Event not found");

    const isOrganizer = event.organizerId?.equals(userId);
    const isTeamMember = event.team?.has(userId.toString());
    if (!isOrganizer && !isTeamMember) {
      throw new Error("Unauthorized to reorder stage posts");
    }

    await event.reorderStagePosts(newOrderIds);
    return event;
  }


  async toggleLikeOnStagePost(eventId, postId, userId) {
  const event = await Event.findById(eventId);
  if (!event) throw new Error("Event not found");

  const post = event.stagePosts.id(postId);
  if (!post) throw new Error("Stage post not found");

  await post.toggleLike(userId);
  await event.save(); // must save parent after modifying embedded post

  return post.likes.length;
}

async addCommentToStagePost(eventId, postId, userId, text) {
  const event = await Event.findById(eventId);
  if (!event) throw new Error("Event not found");

  const post = event.stagePosts.id(postId);
  if (!post) throw new Error("Stage post not found");

  const newComment = await post.addComment(userId, text);
  await event.save(); // save parent doc

  return newComment;
}

async editCommentOnStagePost(eventId, postId, commentId, userId, newText) {
  const event = await Event.findById(eventId);
  if (!event) throw new Error("Event not found");

  const post = event.stagePosts.id(postId);
  if (!post) throw new Error("Stage post not found");

  const updatedComment = await post.editComment(commentId, userId, newText);
  await event.save();

  return updatedComment;
}

async deleteCommentFromStagePost(eventId, postId, commentId, userId) {
  const event = await Event.findById(eventId);
  if (!event) throw new Error("Event not found");

  const post = event.stagePosts.id(postId);
  if (!post) throw new Error("Stage post not found");

  await post.deleteComment(commentId, userId);
  await event.save();

  return true;
}





}

export default new EventService();
