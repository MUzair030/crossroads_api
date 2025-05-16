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
    limit = 10,
  } = {}) {
    const baseFilter = {
      access: 'public',
      isDeleted: false,
      isLive: true,
      categories: { $in: ['music'] },

    };

    if (category) baseFilter.categories = { $in: [category] };
    if (searchQuery) baseFilter.title = { $regex: searchQuery, $options: 'i' };
    if (startDate || endDate) {
      baseFilter.date = {};
      if (startDate) baseFilter.date.$gte = new Date(startDate);
      if (endDate) baseFilter.date.$lte = new Date(endDate);
    }

    const skipCount = (page - 1) * limit;

    let query;

    if (lat && long) {
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

    query = query.skip(skipCount).limit(limit);

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
