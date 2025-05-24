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
