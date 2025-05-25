import EventRepository from "../../infrastructure/repositories/EventRepository.js";
import GroupRepository from "../../infrastructure/repositories/GroupRepository.js";
import Event from "../../domain/models/Event.js";
import User from "../../domain/models/User.js";

import mongoose from "mongoose";

class EventService {
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
async getEventById(eventId, currentUserId) {
       return EventRepository.findById(eventId, currentUserId);
   }
    
    async getAllEvents(reqBody) {
        return EventRepository.findPublicEvents(reqBody);
    }


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


  // In EventService.js

static async inviteUsersToEvent(eventId, inviterId, userIds) {
  const event = await Event.findById(eventId);
  if (!event) throw new Error('Event not found');

  // Only organizer or team member can invite
  const isOrganizer = event.organizerId?.toString() === inviterId.toString();
  const isTeamMember = event.team?.has(inviterId.toString());
  if (!isOrganizer && !isTeamMember) {
    throw new Error('Unauthorized to invite users');
  }

  await event.inviteUsers(userIds); // assumes this is a method on your schema
  return event;
}

static async respondToEventInvite(eventId, userId, status) {
  const event = await Event.findById(eventId);
  if (!event) throw new Error('Event not found');

  await event.respondToInvite(userId, status); // schema method
  return event;
}




}

export default new EventService();
