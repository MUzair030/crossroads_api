import mongoose from "mongoose";
import stagePostSchema from "./StagePost.js"; // adjust path as needed

const ticketSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  currency: String,
  quantity: Number,
  sold: { type: Number, default: 0 },
}, { _id: false });

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,

  isLinkedWithGroup: { type: Boolean, default: false },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", default: null },

  // Likes
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

  // Location options (polls)
  locations: [
    {
      coordinates: {
        type: [Number], // [lat, long]
        required: true,
      },
      votes: {
        type: [String], // userIds
        default: [],
      }
    }
  ],

  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }, // [long, lat]
  },
  locationTBA: { type: Boolean, default: false },

  // Date options (polls)
  dates: [
    [
      {
        votes: { type: [String], default: [] }, // userIds
        startDate: { type: Date, required: true },
        endDate: { type: Date },
      }
    ]
  ],
  dateTBA: { type: Boolean, default: false },

  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  organizerName: String,

  bannerImages: [String],
  tags: [String],
  categories: [String],

  access: { type: String, enum: ['public', 'private'], default: 'public' },

  price: [ticketSchema],
  maxAttendees: { type: Number, default: 0 },

  stagePosts: [stagePostSchema],

  isCancelled: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  isLive: { type: Boolean, default: false },

  wherePoll: { type: Boolean, default: false },
  whenPoll: { type: Boolean, default: false },

  services: [String],

  // Team: Map of userId → role (role can be null or string)
  team: {
    type: Map,
    of: {
      role: { type: String, default: null }
    },
    default: {}
  },

  // Pool: generic map
  pool: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },

  teamSetup: { type: Boolean, default: false },
  poolSetup: { type: Boolean, default: false },

  // RSVPs: object keyed by userId
  rsvps: {
    type: Map,
    of: {
      status: { type: String, enum: ['attending', 'maybe', 'declined'], default: 'maybe' },
      respondedAt: { type: Date, default: Date.now },
    },
    default: {}
  },

  lastDateForRefund: Date,
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for geo queries
eventSchema.index({ location: "2dsphere" });

// Virtual: total number of likes
eventSchema.virtual("likesCount").get(function () {
  return this.likes?.length || 0;
});

// Check if a user liked this event
eventSchema.methods.isLikedBy = function (userId) {
  if (!userId) return false;
  return this.likes.some(id => id.equals(userId));
};

// Add like from userId
eventSchema.methods.like = function (userId) {
  if (!userId) return;
  if (!this.likes.some(id => id.equals(userId))) {
    this.likes.push(userId);
  }
  return this.save();
};

// Remove like from userId
eventSchema.methods.unlike = function (userId) {
  if (!userId) return;
  this.likes = this.likes.filter(id => !id.equals(userId));
  return this.save();
};

// Add these methods inside your eventSchema.methods

// Vote for a location or date option
// type: 'location' | 'date'
// index: which location or date option index (for dates, it's [outerIndex, innerIndex])
// userId: voter user id
eventSchema.methods.vote = function(type, index, userId) {
  if (!userId) throw new Error('UserId is required');

  if (type === 'location') {
    // index is location index
    if (!this.locations || !this.locations[index]) {
      throw new Error('Invalid location index');
    }
    const votes = this.locations[index].votes;
    if (!votes.includes(userId.toString())) {
      votes.push(userId.toString());
    }
  } else if (type === 'date') {
    // index is expected to be an array [outerIndex, innerIndex]
    if (!Array.isArray(index) || index.length !== 2) {
      throw new Error('Date vote requires [outerIndex, innerIndex]');
    }
    const [outerIndex, innerIndex] = index;
    if (!this.dates || !this.dates[outerIndex] || !this.dates[outerIndex][innerIndex]) {
      throw new Error('Invalid date index');
    }
    const votes = this.dates[outerIndex][innerIndex].votes;
    if (!votes.includes(userId.toString())) {
      votes.push(userId.toString());
    }
  } else {
    throw new Error('Invalid vote type');
  }

  return this.save();
};

// Remove vote for a location or date option
eventSchema.methods.unvote = function(type, index, userId) {
  if (!userId) throw new Error('UserId is required');

  if (type === 'location') {
    if (!this.locations || !this.locations[index]) {
      throw new Error('Invalid location index');
    }
    this.locations[index].votes = this.locations[index].votes.filter(id => id.toString() !== userId.toString());
  } else if (type === 'date') {
    if (!Array.isArray(index) || index.length !== 2) {
      throw new Error('Date unvote requires [outerIndex, innerIndex]');
    }
    const [outerIndex, innerIndex] = index;
    if (!this.dates || !this.dates[outerIndex] || !this.dates[outerIndex][innerIndex]) {
      throw new Error('Invalid date index');
    }
    this.dates[outerIndex][innerIndex].votes = this.dates[outerIndex][innerIndex].votes.filter(id => id.toString() !== userId.toString());
  } else {
    throw new Error('Invalid vote type');
  }

  return this.save();
};



// Invite users to event
eventSchema.methods.inviteUsers = function(userIds) {
  if (!Array.isArray(userIds)) {
    throw new Error('userIds must be an array');
  }

  userIds.forEach(userId => {
    if (!this.pool.has(userId.toString())) {
      this.pool.set(userId.toString(), { invited: true });
    }
  });

  return this.save();
};

// Respond to invite
// status must be: 'attending', 'maybe', or 'declined'
eventSchema.methods.respondToInvite = function(userId, status) {
  const validStatuses = ['attending', 'maybe', 'declined'];
  if (!validStatuses.includes(status)) {
    throw new Error('Invalid RSVP status');
  }

  // If not invited, don't allow response
  if (!this.pool.has(userId.toString()) || !this.pool.get(userId.toString()).invited) {
    throw new Error('User not invited to this event');
  }

  this.rsvps.set(userId.toString(), {
    status,
    respondedAt: new Date(),
  });

  return this.save();
};




// Automatically update maxAttendees based on sum of tickets quantity
eventSchema.pre('save', function (next) {
  if (Array.isArray(this.price)) {
    this.maxAttendees = this.price.reduce((total, ticket) => total + (ticket.quantity || 0), 0);
  } else {
    this.maxAttendees = 0;
  }
  next();
});

export default mongoose.model("Event", eventSchema);
