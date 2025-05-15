import mongoose from 'mongoose';

const StagePostSchema = new mongoose.Schema(
  {
    text: { type: String },
    mediaUrls: [{ type: String }],
    timestamp: { type: Date, default: Date.now },
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: true }
);

const GroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    tags: [{ type: String }],
    categories: [{ type: String }],
    bannerImages: [{ type: String }], // Equivalent of coverPicture/groupPicture
    type: { type: String, enum: ['public', 'private'], required: true }, // corresponds to "access"
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    creatorName: { type: String }, // Optional: if you want to store it separately

    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['admin', 'member'], default: 'member' },
      },
    ],

    inviteRequests: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: {
          type: String,
          enum: ['pending', 'accepted', 'rejected'],
          default: 'pending',
        },
      },
    ],

    stagePosts: [StagePostSchema],

    eventIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
    eventStatuses: {
      type: Map,
      of: String, // e.g., { "eventId": "upcoming" }
    },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Group = mongoose.model('Group', GroupSchema);
export default Group;
