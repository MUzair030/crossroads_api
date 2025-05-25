import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  googleId: { type: String, required: false },
  name: { type: String, required: false },
  firstName: { type: String, required: false },
  lastName: { type: String, required: false },
  userName: { type: String, required: false },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: false },
  dob: { type: Date, required: false },
  city: { type: String, required: false },
  state: { type: String, required: false },
  country: { type: String, required: false },
  password: { type: String, required: true },
  profilePicture: { type: String, required: false },
  isVerified: { type: Boolean, default: false },
  isProfileSetup: { type: Boolean, default: false },
  userType: { type: String, required: false },
  identificationNumber: { type: String, required: false },
  identificationRecord: { type: String, required: false },
  isCompany: { type: Boolean, default: false, required: true },
  companyName: { type: String, required: false },
  companyRegistrationNumber: { type: String, required: false },
  verificationToken: String,
  resetOtpExpiry: { type: Date, default: null },
  isDeleted: { type: Boolean, default: false },
  myEventIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],

  tickets: [
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    ticketType: { type: String, required: true },       // e.g., 'VIP', 'General Admission'
    quantity: { type: Number, default: 1 },
    purchaseDate: { type: Date, default: Date.now },
    status: { 
      type: String, 
      enum: ['active', 'used', 'refunded', 'cancelled'], 
      default: 'active' 
    },
    ticketCode: { 
      type: String, 
      required: true, // Must be unique per ticket 
      unique: true,   // Make sure to add unique index if needed
    }, 
    pricePaid: { type: Number, required: false },
  }
],


  friendRequests: [
    {
      from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    },
  ],
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // 📦 Notifications
notifications: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Notification'
}]
,



  unreadNotificationCount: { type: Number, default: 0 },
  notificationSettings: {
    type: Map,
    of: Boolean,
    default: {
      friend_request: true,
      friend_accepted: true,
      mention: true,
      new_follower: true,
      ticket_purchased: true,
      ticket_received: true,
      event_updated: true,
      event_reminder: true,
      event_cancelled: true,
      service_inquiry: true,
      service_booked: true,
      service_review: true,
      service_updated: true,
      message: true,
      group_chat_mention: true,
      group_invite: true,
      admin_announcement: true,
      account_warning: true,
      app_update: true,
    },
  },

  // 🔔 FCM push token
  fcmTokens: {
    type: [String],   // array of strings
    default: []       // default empty array
  }
});

const User = mongoose.model('User', UserSchema);
export default User;
