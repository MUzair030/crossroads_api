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
 */import admin from 'firebase-admin';


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
        notifications: {
          _id: notification._id.toString(),
          type,
          title,
          message,
          sender: senderId.toString(),
          createdAt: new Date(),
        },
      },
      $inc: { unreadNotificationCount: 1 },
    });

    if (receiver.fcmTokens && receiver.fcmTokens.length > 0) {
      const messagePayload = {
        notification: {
          title,
          body: message,
        },
        data: {
          type,
          notificationId: notification._id.toString(),
          ...metadata,
        },
        tokens: receiver.fcmTokens,
      };

      const response = await admin.messaging().sendMulticast(messagePayload);
      console.log('Push notification sent:', response.successCount, 'successes');
    }

    return notification;
  } catch (err) {
    console.error('Failed to register notification:', err.message);
  }
};