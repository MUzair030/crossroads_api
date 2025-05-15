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
  query,
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
  if (query) baseFilter.title = { $regex: query, $options: 'i' };

  if (startDate || endDate) {
    baseFilter.date = {};
    if (startDate) baseFilter.date.$gte = new Date(startDate);
    if (endDate) baseFilter.date.$lte = new Date(endDate);
  }

  const skipCount = (page - 1) * limit;
  const useGeo = lat && long;

  let queryBuilder = Event.find(baseFilter);

  if (useGeo) {
    queryBuilder = queryBuilder.where('location').near({s
      center: {
        type: 'Point',
        coordinates: [parseFloat(long), parseFloat(lat)],
      },
      maxDistance: parseInt(maxDistance),
      spherical: true,
    });
  } else {
    queryBuilder = queryBuilder.sort({ title: 1 }); // fallback to title sort if no geo
  }

  return queryBuilder.skip(skipCount).limit(limit);
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
