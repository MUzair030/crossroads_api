import mongoose from "mongoose";
import stagePostSchema from "./StagePost.js"; // adjust path if needed

const ticketSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  currency: String,
  quantity: Number,
  sold: { type: Number, default: 0 },
}, { _id: false });

const rsvpEntrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { _id: false });

const teamMemberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  role: { type: String, required: true },
}, { _id: false });

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,

  isLinkedWithGroup: { type: Boolean, default: false },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", default: null },

  isLive: { type: Boolean, default: false },

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
        type: [String], // array of userIds
        default: [],
      }
    }
  ],

  // Geolocation for search
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }, // [long, lat]
  },

  // Date options (polls)
  dates: [
    [
      {
        votes: {
          type: [String],
          default: []
        },
        startDate: {
          type: Date,
          required: true
        },
        endDate: {
          type: Date // optional
        }
      }
    ]
  ],

  // Organizer
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  organizerName: String,

  // Media & Classification
  bannerImages: [String],
  tags: [String],
  categories: [String],

  // Access control
  access: { type: String, enum: ['public', 'private'], default: 'public' },

  // Tickets
  price: [ticketSchema],
  maxAttendees: Number,

  // StagePosts
  stagePosts: [stagePostSchema],

  // State
  isCancelled: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },

  // Poll toggles
  wherePoll: { type: Boolean, default: false },
  whenPoll: { type: Boolean, default: false },

  // Services
  services: [String],

  // RSVP Object
  rsvps: {
    attendees: { type: [rsvpEntrySchema], default: [] },
    invited: { type: [rsvpEntrySchema], default: [] },
    interested: { type: [rsvpEntrySchema], default: [] },
  },

  // Team Array
  team: { type: [teamMemberSchema], default: [] },

  // Pool
  pool: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  teamSetup: { type: Boolean, default: false },
  poolSetup: { type: Boolean, default: false },

  // Refund
  lastDateForRefund: Date,

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Geo Index
eventSchema.index({ location: "2dsphere" });

// Virtual for like count
eventSchema.virtual("likesCount").get(function () {
  return this.likes?.length || 0;
});

// Dynamic field for frontend
eventSchema.methods.setIsLiked = function (currentUserId) {
  this.isLiked = this.likes?.some(userId => userId.equals(currentUserId));
};

// Safe RSVP adder
eventSchema.methods.addRsvp = function (type, userId) {
  if (!["attendees", "invited", "interested"].includes(type)) return;

  const entryExists = this.rsvps[type]?.some(entry => entry.userId.equals(userId));
  if (!entryExists) {
    this.rsvps[type].push({ userId });
  }
};

// Safe Team add/update
eventSchema.methods.addOrUpdateTeamMember = function (userId, role) {
  const existing = this.team.find(member => member.userId.equals(userId));
  if (existing) {
    existing.role = role;
  } else {
    this.team.push({ userId, role });
  }
};

// Optional: remove team member
eventSchema.methods.removeTeamMember = function (userId) {
  this.team = this.team.filter(member => !member.userId.equals(userId));
};

export default mongoose.model("Event", eventSchema);
