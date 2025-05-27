import EventRepository from "../../infrastructure/repositories/EventRepository.js";
import GroupRepository from "../../infrastructure/repositories/GroupRepository.js";
import Event from "../../domain/models/Event.js";
import User from "../../domain/models/User.js";
import mongoose from "mongoose";

class EventService {


  /// Create a new event
// Create a new event
async function createEvent(data) {
  const { groupId, creatorId, tickets = [] } = data;

  // Remove tickets from the event data to avoid schema mismatch
  delete data.tickets;

  data.isLive = data.isLive ?? false;
  data.access = data.access ?? 'public';
  data.isLinkedWithGroup = !!groupId;
  data.groupId = groupId || null;

  // Validate group admin if group is provided
  if (groupId) {
    const group = await GroupRepository.findById(groupId);
    if (!group) throw new Error('Group not found.');

    const isAdmin = group.members.some(
      (m) => m.user.toString() === creatorId && m.role === 'admin'
    );
    if (!isAdmin) throw new Error('Only group admins can create events.');
  }

  // 1. Create and save the event
  const event = new Event(data);
  await event.save();

  // 2. Re-fetch event to ensure Mongoose tracks changes
  const freshEvent = await Event.findById(event._id);
  if (!Array.isArray(freshEvent.tickets)) {
    freshEvent.tickets = [];
  }

  // 3. Create tickets and push to event
  for (const ticketData of tickets) {
    eventId=freshEvent._id; // Ensure ticket references the correct event
    const ticket = new Ticket({
      ...ticketData,
     eventId
    });
    await ticket.save();
    freshEvent.tickets.push(ticket._id);
  }

  await freshEvent.save();

  // 4. Associate event with group if applicable
  if (groupId) {
    const group = await GroupRepository.findById(groupId); // re-fetch in case of changes
    group.eventIds.push(freshEvent._id);
    group.eventStatuses.set(freshEvent._id.toString(), 'upcoming');
    await GroupRepository.save(group);
  }

  // 5. Add event ID to user's events
  await User.findByIdAndUpdate(
    creatorId,
    { $push: { myEventIds: freshEvent._id } },
    { new: true }
  );

  // 6. Return fully populated event
  return await Event.findById(freshEvent._id).populate('tickets');
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






}

export default new EventService();
