import EventRepository from "../../infrastructure/repositories/EventRepository.js";
import GroupRepository from "../../infrastructure/repositories/GroupRepository.js";
import Event from "../../domain/models/Event.js";
import User from "../../domain/models/User.js";
import mongoose from "mongoose";

class EventService {


  /// Create a new event
async function createEvent(data) {
  const { groupId, creatorId, tickets = [] } = data;

  // Remove tickets from data to prevent schema mismatch
  delete data.tickets;

  // Set defaults
  data.isLive = data.isLive ?? false;
  data.access = data.access ?? 'public';
  data.isLinkedWithGroup = !!groupId;
  data.groupId = groupId || null;

  // --- Step 1: Validate group (if provided) ---
  if (groupId) {
    const group = await GroupRepository.findById(groupId);
    if (!group) throw new Error('Group not found.');

    const isAdmin = group.members.some(
      (m) => m.user.toString() === creatorId && m.role === 'admin'
    );
    if (!isAdmin) throw new Error('Only group admins can create events.');
  }

  // --- Step 2: Create the event without tickets ---
  const event = await EventRepository.create(data);

  // --- Step 3: Create and associate tickets ---
  if (tickets.length > 0) {
    const createdTickets = await Ticket.insertMany(
      tickets.map(ticket => ({
        ...ticket,
        eventId: event._id,
        sold: 0, // ensure sold starts at 0
      }))
    );

    event.tickets = createdTickets.map(t => t._id);
    await event.save();
  }

  // --- Step 4: Associate event with group ---
  if (groupId) {
    const group = await GroupRepository.findById(groupId); // re-fetch
    group.eventIds.push(event._id);
    group.eventStatuses.set(event._id.toString(), 'upcoming');
    await GroupRepository.save(group);
  }

  // --- Step 5: Add event to user's myEventIds ---
  await User.findByIdAndUpdate(
    creatorId,
    { $addToSet: { myEventIds: event._id } },
    { new: true }
  );

  // --- Optional: Return event with populated tickets ---
  return await Event.findById(event._id).populate('tickets');
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
