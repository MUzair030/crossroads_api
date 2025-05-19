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

  async getUserById(id) {
    if (!id) {
      throw new Error('User ID is required');
    }
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return mapToDto(user);
  }

 async getCurrentUser(id) {
  if (!id) throw new Error('User ID is required');

  const user = await this.userRepository.findById(id); // returns resolved document

  if (!user) throw new Error('User not found');

  await user.populate([
    {
      path: 'friends',
      select: '_id name email userName profilePicture',
      options: { limit: 10 }
    },
    {
      path: 'friendRequests.from',
      select: '_id name email userName profilePicture',
      options: { limit: 10 }
    },
    {
      path: 'notifications',
      options: { sort: { createdAt: -1 }, limit: 10 }
    }
  ]).exec();

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

  async uploadUserProfilePicture(file, user) {
    const uniqueFileName = `images/users/${uuidv4()}_${file.originalname}`;
    const uploadResult = await FileUploadService.uploadToS3(file.buffer, uniqueFileName, file.mimetype);
    console.log("uploadResult:::::::: ", uploadResult);
    await this.updateUserById(user.id, {profilePicture: uploadResult?.Location});
    return uploadResult;
  }

}

export default UserManagementService;
