import EventRepository from "../../infrastructure/repositories/EventRepository.js";
import GroupRepository from "../../infrastructure/repositories/GroupRepository.js";
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

        return event;
    } else {
        // No group linked — create standalone event
        data.isLinkedWithGroup = false;
        data.groupId = null;
        data.isLive = data.isLive ?? false;
        data.isLive = data.isLive ?? false;
        data.access = data.access ?? 'public';


        const event = await EventRepository.create(data);
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
    throw new Error('Event not found');
  }

  if (!event.organizerId.equals(userId)) {
    throw new Error('Unauthorized: Only the organizer can delete this event');
  }

  event.isDeleted = true;
  await event.save();

  return { message: 'Event soft deleted successfully' };
}

/*
    async getGroupEvents(groupId) {
        return EventRepository.findByGroupId(groupId);
    }

   


    async editEvent(eventId, updates, userId) {
        const event = await EventRepository.findById(eventId);
        if (!event) throw new Error('Event not found.');
        if (event.creator.toString() !== userId) throw new Error('Unauthorized.');

        return EventRepository.update(eventId, updates);
    }

    async deleteEvent(eventId, userId) {
        const event = await EventRepository.findById(eventId);
        if (!event) throw new Error('Event not found.');
        if (event.creator.toString() !== userId) throw new Error('Unauthorized.');

        const group = await GroupRepository.findById(event.groupId);
        if (group) {
            group.eventIds = group.eventIds.filter(id => id.toString() !== eventId.toString());
            group.eventStatuses.delete(eventId.toString());
            await GroupRepository.save(group);
        }

        return EventRepository.delete(eventId);
    }*/
}

export default new EventService();
