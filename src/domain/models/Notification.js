import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      'friend_request',
      'friend_accepted',
      'mention',
      'new_follower',
      'ticket_purchased',
      'ticket_received',
      'event_updated',
      'event_reminder',
      'event_invite',
      'event_cancelled',
      'service_inquiry',
      'service_booked',
      'service_review',
      'service_updated',
      'message',
      'group_chat_mention',
      'group_invite',
      'admin_announcement',
      'account_warning',
      'app_update'
    ]
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  metadata: { type: Object }, // e.g., related event/service/etc
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', NotificationSchema);
export default Notification;
