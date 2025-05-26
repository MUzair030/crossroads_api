import express from 'express';
import passport from '../../application/services/GoogleAuthService.js';
import CommonResponse from '../../application/common/CommonResponse.js';
import EventService from '../../application/services/EventService.js';
import User from '../../domain//models/User.js'; 
import multer from 'multer';


const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });


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

// 8. Like an event
router.post(
  '/:eventId/like',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { eventId } = req.params;
    const userId = req.user.id;

    try {
      const updatedEvent = await EventService.likeEvent(eventId, userId);
      CommonResponse.success(res, { likesCount: updatedEvent.likesCount, likedByUser: true });
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 9. Dislike (unlike) an event
router.post(
  '/:eventId/dislike',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { eventId } = req.params;
    const userId = req.user.id;

    try {
      const updatedEvent = await EventService.dislikeEvent(eventId, userId);
      CommonResponse.success(res, { likesCount: updatedEvent.likesCount, likedByUser: false });
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 10. Vote on an option (location or date)
router.post(
  '/:eventId/vote',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { eventId } = req.params;
    const { type, index } = req.body; // type: 'location' or 'date', index: number or array
    const userId = req.user.id;

    try {
      const updatedEvent = await EventService.voteOnOption(eventId, type, index, userId);
      CommonResponse.success(res, { message: 'Vote recorded', event: updatedEvent });
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 11. Unvote on an option (location or date)
router.post(
  '/:eventId/unvote',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { eventId } = req.params;
    const { type, index } = req.body;
    const userId = req.user.id;

    try {
      const updatedEvent = await EventService.unvoteOnOption(eventId, type, index, userId);
      CommonResponse.success(res, { message: 'Vote removed', event: updatedEvent });
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);



//12. Invite users to event (organizer/team only)
router.post(
  '/:eventId/invite',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { eventId } = req.params;
    const inviterId = req.user.id;
    const { userIds } = req.body;

    try {
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return CommonResponse.error(res, 'userIds must be a non-empty array', 400);
      }

      const event = await EventService.inviteUsersToEvent(eventId, inviterId, userIds);
      CommonResponse.success(res, { message: 'Users invited', event });
    } catch (err) {
      CommonResponse.error(res, err.message, 403);
    }
  }
);

//13. RSVP to event invite
router.post(
  '/:eventId/rsvp',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { eventId } = req.params;
    const userId = req.user.id;
    const { status } = req.body;

    if (!['attending', 'maybe', 'declined'].includes(status)) {
      return CommonResponse.error(res, 'Invalid RSVP status', 400);
    }

    try {
      const event = await EventService.respondToEventInvite(eventId, userId, status);
      CommonResponse.success(res, { message: 'RSVP updated', event });
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 14. Add a new stage post to an event
router.post(
  '/:eventId/stage-posts',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { eventId } = req.params;
    const postData = req.body;
    const userId = req.user.id;

    try {
      const event = await EventService.addStagePost(eventId, postData, userId);
      CommonResponse.success(res, { message: 'Stage post added', event });
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 15. Update a stage post by postId
router.put(
  '/:eventId/stage-posts/:postId',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { eventId, postId } = req.params;
    const updatedFields = req.body;
    const userId = req.user.id;

    try {
      const event = await EventService.updateStagePost(eventId, postId, updatedFields, userId);
      CommonResponse.success(res, { message: 'Stage post updated', event });
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 16. Delete a stage post by postId
router.delete(
  '/:eventId/stage-posts/:postId',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { eventId, postId } = req.params;
    const userId = req.user.id;

    try {
      const event = await EventService.deleteStagePost(eventId, postId, userId);
      CommonResponse.success(res, { message: 'Stage post deleted', event });
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 17. Reorder stage posts with an array of post IDs in new order
router.post(
  '/:eventId/stage-posts/reorder',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { eventId } = req.params;
    const { newOrder } = req.body;
    const userId = req.user.id;

    try {
      if (!Array.isArray(newOrder)) {
        return CommonResponse.error(res, 'newOrder must be an array', 400);
      }
      const event = await EventService.reorderStagePosts(eventId, newOrder, userId);
      CommonResponse.success(res, { message: 'Stage posts reordered', event });
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);


// 17. Toggle like/dislike on a stage post
router.post(
  '/:eventId/stage-posts/:postId/like',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { eventId, postId } = req.params;
    const userId = req.user.id;

    try {
      const likeCount = await EventService.toggleLikeOnStagePost(eventId, postId, userId);
      CommonResponse.success(res, { message: 'Toggled like on stage post', likeCount });
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 18. Add a comment to a stage post
router.post(
  '/:eventId/stage-posts/:postId/comments',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { eventId, postId } = req.params;
    const { text } = req.body;
    const userId = req.user.id;

    try {
      const comment = await EventService.addCommentToStagePost(eventId, postId, userId, text);
      CommonResponse.success(res, { message: 'Comment added', comment });
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 19. Edit a comment on a stage post
router.put(
  '/:eventId/stage-posts/:postId/comments/:commentId',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { eventId, postId, commentId } = req.params;
    const { text } = req.body;
    const userId = req.user.id;

    try {
      const updatedComment = await EventService.editCommentOnStagePost(eventId, postId, commentId, userId, text);
      CommonResponse.success(res, { message: 'Comment updated', updatedComment });
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 20. Delete a comment from a stage post
router.delete(
  '/:eventId/stage-posts/:postId/comments/:commentId',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { eventId, postId, commentId } = req.params;
    const userId = req.user.id;

    try {
      await EventService.deleteCommentFromStagePost(eventId, postId, commentId, userId);
      CommonResponse.success(res, { message: 'Comment deleted' });
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

//18. Upload banner image for an event
router.post('/:id/banner-image', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return CommonResponse.error(res, 'No file uploaded', 400);
    }
    const event = await EventService.getEventById(id);
    if(event){
      const uploadResult = await EventService.uploadEventBannerImage(file, event);
      CommonResponse.success(res, uploadResult);
    }
  } catch (error) {
    CommonResponse.error(res, error.message, 500);
  }
});





export default router;
