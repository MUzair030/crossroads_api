import Event from "../../domain/models/Event.js";

class EventRepository {
  async create(data) {
    const event = new Event(data);
    
    return event.save();
  }


  
async findPublicEvents({
  lat,
  long,
  maxDistance = 50000,
  category,
  query: searchQuery,
  startDate,
  endDate,
  page = 1,
  limit = 10
} = {}) {
  const baseFilter = {
    type: 'public',
    isDeleted: false,
    isLive: true,
  };

  if (category) baseFilter.category = category;
  if (searchQuery) baseFilter.title = { $regex: searchQuery, $options: 'i' };

  if (startDate || endDate) {
    baseFilter.date = {};
    if (startDate) baseFilter.date.$gte = new Date(startDate);
    if (endDate) baseFilter.date.$lte = new Date(endDate);
  }

  const skipCount = (page - 1) * limit;

  let geoFilter = {};
  if (lat && long) {
    geoFilter.location = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(long), parseFloat(lat)],
        },
        $maxDistance: parseInt(maxDistance),
      },
    };
  }

  const finalFilter = {
    ...baseFilter,
    ...geoFilter,
  };

  let query = Event.find(finalFilter)
    .skip(skipCount)
    .limit(limit);

  if (!lat || !long) {
    query = query.sort({ title: 1 });
  }

  return query;
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
