import {v4 as uuidv4} from 'uuid';
import FileUploadService from "./FileUploadService.js";
import UserRepositoryImpl from "../../infrastructure/repositories/UserRepositoryImpl.js";

class UserManagementService {
  constructor() {
    this.userRepository = new UserRepositoryImpl();
  }

  async getAllUsers() {
    const users = await this.userRepository.findAll();
    if (!users || users.length === 0) {
      throw new Error('Users not found');
    }
    return users;
  }

  async getUserById(id) {
    if (!id) {
      throw new Error('User ID is required');
    }
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async getUserByEmail(email) {
    if (!email) {
      throw new Error('User email is required');
    }
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async updateUserById(id, updateData) {
    if (!id) {
      throw new Error('User ID is required');
    }
    if (!updateData || Object.keys(updateData).length === 0) {
      throw new Error('Update data is required');
    }

    const updatedUser = await this.userRepository.findByIdAndUpdate(id, updateData);
    if (!updatedUser) {
      throw new Error('User not found');
    }
    return updatedUser;
  }

  async uploadUserProfilePicture(file, user) {
    console.log("uploadUserProfilePicture:::::::: ", user);
    const uniqueFileName = `Users/${uuidv4()}_${file.originalname}`;
    const uploadResult = await FileUploadService.uploadToS3(file.buffer, uniqueFileName, file.mimetype);
    console.log("uploadResult:::::::: ", uploadResult);
    await this.updateUserById(user.id, {profilePicture: uploadResult?.Location});
    return uploadResult;

  }
}

export default UserManagementService;
