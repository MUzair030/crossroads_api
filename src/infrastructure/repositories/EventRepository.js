import Event from "../../domain/models/Event.js";

class EventRepository {
  async create(data) {
    const event = new Event(data);
    
    return event.save();
  }


  
  async findPublicEvents({ 
  lat, 
  long, 
  maxDistance = 50000, // in meters, e.g., 50km
  category, 
  query, 
  startDate, 
  endDate, 
  page = 1, 
  limit = 10 
}={}) {
  const filter = {
    type: 'public',
    isDeleted: false,
    isLive: true,
  };

  if (category) filter.category = category;
  if (query) filter.name = { $regex: query, $options: 'i' };
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  const geoFilter = lat && long
    ? {
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [parseFloat(long), parseFloat(lat)]
            },
            $maxDistance: parseInt(maxDistance)
          }
        }
      }
    : {};

  return Event.find({ ...filter, ...geoFilter })
    .skip((page - 1) * limit)
    .limit(limit);
}

/*
  async findById(eventId) {
    return Event.findById(eventId)
      .populate('organizer')
      .populate('attendees.user')
      .populate('interestedUsers');
  }

  async updateEvent(eventId, updates) {
    return Event.findByIdAndUpdate(eventId, updates, { new: true });
  }

  async searchPublicEvents(query, category) {
    const filter = { type: 'public', isDeleted: false };
    if (query) filter.name = { $regex: query, $options: 'i' };
    if (category) filter.category = category;
    return Event.find(filter);
  }

  async save(event) {
    return event.save();
  }*/
}

export default new EventRepository();
