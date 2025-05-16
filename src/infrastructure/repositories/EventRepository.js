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
  searchString,       // search string for title
  startDate,
  endDate,
  page = 1,
  limit = 10,
} = {}) {
  const baseFilter = {
    access: 'public',
    isDeleted: false,
    isLive: true,
  };

  // Only add category filter if category is a non-empty string
  if (typeof category === 'string' && category.trim() !== '') {
    baseFilter.categories = { $in: [category.trim()] };
  }

  // Only add search query filter if query is a non-empty string
  if (typeof searchString === 'string' && searchString.trim() !== '') {
    baseFilter.title = { $regex: searchString.trim(), $options: 'i' };
  }

  // Only add date filter if either startDate or endDate is defined and valid
  if (startDate || endDate) {
    baseFilter.date = {};
    if (startDate && !isNaN(Date.parse(startDate))) {
      baseFilter.date.$gte = new Date(startDate);
    }
    if (endDate && !isNaN(Date.parse(endDate))) {
      baseFilter.date.$lte = new Date(endDate);
    }
    // If date is empty object (both dates invalid), delete the field
    if (Object.keys(baseFilter.date).length === 0) {
      delete baseFilter.date;
    }
  }

  const skipCount = (page > 0 ? page - 1 : 0) * limit;

  let query;

  if (lat != null && long != null) {
    query = Event.find({
      ...baseFilter,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(long), parseFloat(lat)],
          },
          $maxDistance: parseInt(maxDistance),
        },
      },
    });
  } else {
    query = Event.find(baseFilter).sort({ title: 1 });
  }

query = query
  .select('title dates categories bannerImages locations organizerId organizerName')  // include only selected fields
  .skip(skipCount)
  .limit(limit);
  return query.exec();
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
