import mongoose from "mongoose";
import stagePostSchema from "./StagePost.js"; // adjust the path as needed

const ticketSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  currency: String,
  quantity: Number,
  sold: { type: Number, default: 0 },
}, { _id: false });

const teamMemberSchema = new mongoose.Schema({
  role: { type: String, required: false, default: null }
}, { _id: false });

const rsvpsSchema = new mongoose.Schema({
  attending: { type: [mongoose.Schema.Types.ObjectId], default: [] },
  invited: { type: [mongoose.Schema.Types.ObjectId], default: [] },
  declined: { type: [mongoose.Schema.Types.ObjectId], default: [] }
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
        type: [Number], // [lat, long] from frontend input
        required: true,
      },
      votes: {
        type: [String], // array of userIds
        default: [],
      }
    }
  ],

  // Geolocation for search (GeoJSON: [long, lat])
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }, // [long, lat]
  },
  locationTBA: { type: Boolean, default: false },

  // Date options (polls)
  dates: [
    [
      {
        votes: { type: [String], default: [] },
        startDate: { type: Date, required: true },
        endDate: { type: Date } // optional
      }
    ]
  ],
  dateTBA: { type: Boolean, default: false },

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

  // Team & Pool
  team: {
    type: Map,
    of: teamMemberSchema,
    default: {}
  },
  pool: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  teamSetup: { type: Boolean, default: false },
  poolSetup: { type: Boolean, default: false },

  // RSVP (attendance)
  rsvps: {
    type: rsvpsSchema,
    default: () => ({})
  },

  // Refund
  lastDateForRefund: Date,

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Geospatial index
eventSchema.index({ location: "2dsphere" });

// Virtual for likes count
eventSchema.virtual("likesCount").get(function () {
  return this.likes?.length || 0;
});

// Method to dynamically set if current user liked it
eventSchema.methods.setIsLiked = function (currentUserId) {
  this.isLiked = this.likes?.some(userId => userId.equals(currentUserId));
};

export default mongoose.model("Event", eventSchema);
