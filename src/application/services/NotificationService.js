import Notification from '../..//domain/models/Notification.js';
import User from '../../domain/models/User.js';
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
 */import admin from '../../config/firebase.js'; // adjust path as needed



export const registerNotification = async ({
  type,
  title,
  message,
  receiverId,
  senderId ,
  metadata = {},
}) => {
  try {
    const receiver = await User.findById(receiverId);
    if (!receiver) throw new Error('Receiver not found');

    const isEnabled = receiver.notificationSettings?.get(type);
    if (isEnabled === false) return;

    const notification = new Notification({
      type,
      title,
      message,
      receiver: receiverId,
      sender: senderId,
      metadata,
    });

    await notification.save();

    await User.findByIdAndUpdate(receiverId, {
      $push: {
            notifications: notification._id  // just push the ObjectId

      },
      $inc: { unreadNotificationCount: 1 },
    });

    if (receiver.fcmTokens && receiver.fcmTokens.length > 0) {
      for (const token of receiver.fcmTokens) {
  try {
    const messagee = {
      notification: {
        title,
        body: message,
      },
      token,
    };
    await admin.messaging().send(messagee);
    console.log(`Sent to token: ${token}`);
  } catch (error) {
    console.error(`Failed to send to token ${token}:`, error.message);
  }
}
    }

    return notification;
  } catch (err) {
    console.error('Failed to register notification:', err.message);
  }
};