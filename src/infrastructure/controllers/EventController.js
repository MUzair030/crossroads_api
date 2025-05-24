import express from 'express';
import passport from '../../application/services/GoogleAuthService.js';
import CommonResponse from '../../application/common/CommonResponse.js';
import EventService from '../../application/services/EventService.js';
import User from '../../domain//models/User.js'; 

const router = express.Router();

router.post(
  '/',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const {
      title,
      description,
      locations = [],
      dates = [],
      bannerImages = [],
      tags = [],
      categories = [],
      groupId = null,
      isLive = false,
      access = 'public',
      maxAttendees,
      services = [],
      lastDateForRefund,
    } = req.body;

    try {
      // Find user for organizerName
      const user = await User.findById(req.user.id);
      if (!user) throw new Error("User not found");

      // Default to first location for geo field
      const primaryLocation = locations[0]?.coordinates || [0, 0];

      // Prepare rsvps object: Map with userId keys
      const rsvps = new Map([
        [req.user.id.toString(), { status: 'attending', respondedAt: new Date() }]
      ]);

      // Prepare team Map
      const team = new Map([
        [req.user.id.toString(), { role: 'organizer' }]
      ]);

      const event = await EventService.createEvent({
        title,
        description,
        locations,
        dates,
        bannerImages,
        tags,
        categories,
        groupId,
        isLinkedWithGroup: !!groupId,
        isLive,
        access,
        maxAttendees,
        services,
        lastDateForRefund,

        // Organizer
        organizerId: req.user.id,
        organizerName: user.name,

        // Initial team and RSVPs as Maps
        team,
        rsvps,

        // Geo search location
        location: {
          type: 'Point',
          coordinates: [primaryLocation[1], primaryLocation[0]] // GeoJSON: [long, lat]
        },
      });

      // Add event ID to user
      await User.findByIdAndUpdate(
        req.user.id,
        { $push: { myEventIds: event._id } },
        { new: true }
      );

      CommonResponse.success(res, { id: event._id.toString() });
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);
// 2. Get Event by ID
router.get('/public/:id', async (req, res) => {
  try {
    const eventId = req.params.id;
    const currentUserId = req.user?._id; // optional: if you're using auth middleware

    const event = await EventService.getEventById(eventId, currentUserId);
    CommonResponse.success(res, event);
  } catch (err) {
    CommonResponse.error(res, err.message, 400);
  }
});

// 3. Get All Public Events (GET with query params)
router.get('/public', async (req, res) => {
  try {
    // Extract query params from req.query
    // req.query properties are always strings, so convert as needed
    const {
      lat,
      long,
      maxDistance,
      category,
      searchString,
      startDate,
      endDate,
      page,
      limit,
    } = req.query;

    const filters = {
      lat: lat ? parseFloat(lat) : undefined,
      long: long ? parseFloat(long) : undefined,
      maxDistance: maxDistance ? parseInt(maxDistance) : undefined,
      category,
      searchString,
      startDate,
      endDate,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    };

    const events = await EventService.getAllEvents(filters);
    CommonResponse.success(res, events);
  } catch (err) {
    CommonResponse.error(res, err.message, 400);
  }
});


// 4. Get Events by Group
router.get('/group/:groupId', async (req, res) => {
  const { groupId } = req.params;
  try {
    const events = await EventService.getGroupEvents(groupId);
    CommonResponse.success(res, events);
  } catch (err) {
    CommonResponse.error(res, err.message, 400);
  }
});

// 5. Edit Event
router.put(
  '/:eventId',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { eventId } = req.params;
    const updates = req.body;

    try {
      const updatedEvent = await EventService.editEvent(
        eventId,
        updates,
        req.user.id
      );
      CommonResponse.success(res, updatedEvent);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 6. Soft Delete Event
router.delete(
  '/:eventId',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { eventId } = req.params;

    try {
      const result = await EventService.softDeleteEvent(eventId, req.user.id);
      CommonResponse.success(res, result);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);



// 7. Search Events (Public & Live)
router.get('/search', async (req, res) => {
  const { query, page, limit } = req.query;

  try {
    const result = await EventService.searchEvents(query, parseInt(page), parseInt(limit));
    CommonResponse.success(res, result);
  } catch (err) {
    CommonResponse.error(res, err.message, 400);
  }
});


export default router;
