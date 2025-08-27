import {v4 as uuidv4} from 'uuid';
import FileUploadService from "./FileUploadService.js";
import UserRepositoryImpl from "../../infrastructure/repositories/UserRepositoryImpl.js";
import {mapToDomainUpdateReq, mapToDto,mapToFullDto} from "../common/mapper/User.js";
import {UserType} from "../common/UserType.js";
import User from '../../domain/models/User.js';


class UserManagementService {
  constructor() {
    this.userRepository = new UserRepositoryImpl();
  }

  async getAllUsers() {
    const users = await this.userRepository.findAll();
    if (!users || users?.length === 0) {
      throw new Error('Users not found');
    }
    return users?.map(user => mapToDto(user));
  }
  async getUserOverview(userId) {
    const user = await User.findById(userId).select('-password') // exclude only password
    .populate({
      path: 'friends',
      select: '_id name email userName profilePicture',
      options: { limit: 10 }
    })
    .populate({
      path: 'friendRequests.from',
      select: '_id name email userName profilePicture',
      options: { limit: 10 }
    })
    .populate({
      path: 'notifications',
      options: { sort: { createdAt: -1 }, limit: 10 }
    });

    if (!user) throw new Error('User not found.');

    return {
      
        id: user._id,
        name: user.name,
        email: user.email,
        userName: user.userName,
        profilePicture: user.profilePicture,
        unreadNotificationCount: user.unreadNotificationCount,
        notificationSettings: user.notificationSettings,
      
      friends: user.friends,
      friendRequests: user.friendRequests,
      notifications: user.notifications,
    };
  }


  async searchUsers(query, page = 1, limit = 20) {
    const { users, total } = await this.userRepository.searchUsers(query, page, limit);

    if (!users || users.length === 0) {
    return {
      users: [],
      total: 0,
      page,
      pages: 0
    };
}


    return {
      users: users.map(user => mapToDto(user)),
      total,
      page,
      pages: Math.ceil(total / limit)
    };
}

 async getUserById(id, userId) {
  if (!id) throw new Error("User ID is required");

  const user = await User.findById(id)
    .populate("notifications")
    .populate("friends", "name userName profilePicture")
    .populate("friendRequests.from", "name userName profilePicture")
    .populate("stagePosts")
    .lean();

  if (!user) throw new Error("User not found");

  const isSelf = id.toString() === userId.toString();
  const isFriend = user.friends?.some(f => f._id.toString() === userId.toString()) || false;
  const friendsCount = user.friends?.length || 0;

  // Friend request flags
  const friendRequestPendingIncoming = user.friendRequests?.some(
    fr => fr.from._id.toString() === userId.toString() && fr.status === "pending"
  ) || false;

  const friendRequestPendingOutgoing = user.friendRequests?.some(
    fr => fr.from._id.toString() !== userId.toString() &&
          fr.status === "pending" &&
          // Need to find if *this user* has a pending request from the viewer
          fr.from._id.toString() === id.toString()
  ) || false;

  // If self → return all details
  if (isSelf) {
    return {
      ...user,
      isSelf,
      isFriend,
      friendRequestPendingIncoming,
      friendRequestPendingOutgoing,
      friendsCount
    };
  }

  const visibility = user.accountSettings?.privacy?.profileVisibility || "public";

  if (visibility === "private" && !isFriend) {
    return {
      _id: user._id,
      name: user.name,
      userName: user.userName,
      profilePicture: user.profilePicture,
      isSelf,
      isFriend,
      friendRequestPendingIncoming,
      friendRequestPendingOutgoing,
      friendsCount
    };
  }

  if (visibility === "friends" && !isFriend) {
    return {
      _id: user._id,
      name: user.name,
      userName: user.userName,
      profilePicture: user.profilePicture,
      city: user.city,
      country: user.country,
      isSelf,
      isFriend,
      friendRequestPendingIncoming,
      friendRequestPendingOutgoing,
      friendsCount
    };
  }

  // Public or friend → more details
  return {
    _id: user._id,
    name: user.name,
    userName: user.userName,
    profilePicture: user.profilePicture,
    city: user.city,
    state: user.state,
    country: user.country,
    friends: user.friends,
    stagePosts: user.stagePosts,
    isSelf,
    isFriend,
    friendRequestPendingIncoming,
    friendRequestPendingOutgoing,
    friendsCount
  };
}


 async getCurrentUser(id) {
  if (!id) throw new Error('User ID is required');

  const user = await User.findById(id).populate('notifications'); // returns resolved document

  if (!user) throw new Error('User not found');

  return mapToFullDto(user);
}


  async getUserByEmail(email) {
    if (!email) {
      throw new Error('User email is required');
    }
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }
    return mapToDto(user);
  }

  async updateUserById(id, updateData, isSetup) {
    if (!id) {
      throw new Error('User ID is required');
    }
    if (!updateData || Object.keys(updateData).length === 0) {
      throw new Error('Update data is required');
    }
    const data = mapToDomainUpdateReq(updateData);
    const isValid = this.validateUserData(data);
    if(!isValid) throw new Error('User data is not valid / missing required information');
    if(isSetup) data.isProfileSetup = true;
    const updatedUser = await this.userRepository.findByIdAndUpdate(id, data);
    if (!updatedUser) {
      throw new Error('User not found');
    }
    return mapToDto(updatedUser);
  }

  validateUserData = (user) => {
    if(user && user.userType){
      if(user.userType === UserType.FREE_TIER) return true;

      if(user.userType === UserType.VERIFIED_TIER || user.userType === UserType.PREMIUM_TIER){
        console.log(user.userType, user.identificationNumber, user.identificationRecord)
        return user.identificationNumber != null && user.identificationRecord != null;
      }

      if(user.userType === UserType.COMPANY_ACCOUNT){
        return user.identificationNumber != null && user.identificationRecord != null
            && user.companyName !== null && user.companyRegistrationNumber !== null;
      }
    }
    return true;
  }


async updateProfilePicture(userId, file) {
  const user = await this.getUserById(userId);
  if (user?.profilePicture) {
    await FileUploadService.deleteFromS3(user.profilePicture);
  }

  const uniqueFileName = `images/users/${uuidv4()}_${file.originalname}`;
  const uploadResult = await FileUploadService.uploadToS3(file.buffer, uniqueFileName, file.mimetype);

  await this.updateUserById(userId, { profilePicture: uploadResult.Location });
  return uploadResult;
}


 

}

export default new UserManagementService;
