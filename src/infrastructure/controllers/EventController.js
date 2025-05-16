import express from 'express';
import passport from '../../application/services/GoogleAuthService.js';
import CommonResponse from '../../application/common/CommonResponse.js';
import EventService from '../../application/services/EventService.js';
import User from '../../domain//models/User.js'; 

const router = express.Router();

// 1. Create Event
router.post(
  '/',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const {
      title,
      description,
      locations,      // array of { coordinates: [lat, long], votes: [userId] }
      dates,          // array of arrays of { votes: [userId], startDate, endDate? }
      bannerImages,
      tags,
      categories,
      groupId,
      isLive,
      access,
    } = req.body;

    try {
      const event = await EventService.createEvent({
        title,
        description,
        locations,
        dates,
        bannerImages,
        tags,
        categories,
        groupId,
        creatorId: req.user.id,
        isLive,
        access,
      });

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

// 2. Get All Public Events
router.post('/public', async (req, res) => {
  try {
    const events = await EventService.getAllEvents(req.body);
    CommonResponse.success(res, events);
  } catch (err) {
    CommonResponse.error(res, err.message, 400);
  }
});
/*
// 3. Get Events by Group
router.get('/group/:groupId', async (req, res) => {
  const { groupId } = req.params;
  try {
    const events = await EventService.getGroupEvents(groupId);
    CommonResponse.success(res, events);
  } catch (err) {
    CommonResponse.error(res, err.message, 400);
  }
});

// 4. Edit Event
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

// 5. Delete Event (soft delete)
router.delete(
  '/:eventId',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { eventId } = req.params;

    try {
      const deletedEvent = await EventService.deleteEvent(eventId, req.user.id);
      CommonResponse.success(res, { message: 'Event deleted', event: deletedEvent });
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 6. Search Events
router.get('/search', async (req, res) => {
  const { query, category } = req.query;

  try {
    const events = await EventService.searchEvents(query, category);
    CommonResponse.success(res, events);
  } catch (err) {
    CommonResponse.error(res, err.message, 400);
  }
});*/

export default router;
