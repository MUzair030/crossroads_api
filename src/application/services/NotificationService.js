import Notification from '../models/Notification.js';
import User from '../models/User.js';
// import pushService from '../utils/pushService'; // if you use FCM or OneSignal

/**
 * Registers a notification and optionally sends a push if enabled.
 * 
 * @param {Object} params
 * @param {string} params.type - notification type
 * @param {string} params.title - short heading
 * @param {string} params.message - main message
 * @param {ObjectId} params.receiverId - receiver user ID
 * @param {ObjectId} [params.senderId] - optional sender
 * @param {Object} [params.metadata] - optional extra info (e.g., eventId, serviceId)
 */
export const registerNotification = async ({
  type,
  title,
  message,
  receiverId,
  senderId = null,
  metadata = {}
}) => {
  try {
    const receiver = await User.findById(receiverId);
    if (!receiver) throw new Error('Receiver not found');

    const isEnabled = receiver.notificationSettings?.get(type);
    if (isEnabled === false) return; // respect user preferences

    const notification = new Notification({
      type,
      title,
      message,
      receiver: receiverId,
      sender: senderId,
      metadata
    });

    await notification.save();

    // Attach to user and increment unread count
    await User.findByIdAndUpdate(receiverId, {
      $push: { notifications: notification._id },
      $inc: { unreadNotificationCount: 1 }
    });

    // Optionally send a push notification
    // await pushService.send(receiverId, title, message, metadata);

    return notification;
  } catch (err) {
    console.error('Failed to register notification:', err.message);
  }
};
