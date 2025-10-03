import User from '../../domain/models/User.js';
import UserRepository from '../../domain/repositories/UserRepository.js';
import {v4 as uuidv4} from 'uuid';
import FileUploadService from "../../application/services/FileUploadService.js";

class UserRepositoryImpl extends UserRepository {
  async findById(id) {
    return User.findOne({ _id: id });
  }

  async findByEmail(email) {
    return User.findOne({ email });
  }

  async findByUserName(userName) {
    return User.findOne({ userName });
  }

  async findByGoogleId(googleId) {
    return User.findOne({ googleId });
  }

  async findAll() {
    return User.find();
  }

 async searchUsers(query, page = 1, limit = 20) {
  if (!query || query.trim() === '') {
    throw new Error('Search query is required');
  }

  const regex = new RegExp('^' + query, 'i'); // starts with query
  const skip = (page - 1) * limit;

  const projection = '_id name email userName profilePicture';

  const [users, total] = await Promise.all([
    User.find({
      $or: [
        { name: { $regex: regex } },
        { userName: { $regex: regex } },
        { email: { $regex: regex } }
      ]
    })
    .select(projection)  // ⬅️ Only return these fields
    .skip(skip)
    .limit(limit),

    User.countDocuments({
      $or: [
        { name: { $regex: regex } },
        { userName: { $regex: regex } },
        { email: { $regex: regex } }
      ]
    })
  ]);

  return { users, total };
}



  async save(user) {
    const newUser = new User(user);
    return newUser.save();
  }

  async update(user) {
    try {
      const updatedUser = await User.findByIdAndUpdate(user._id, user, { new: true, runValidators: true });
      return updatedUser;
    } catch (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  async findByIdAndUpdate(id, updatedData) {
  try {
    const flattenedData = this.flattenUpdateObject(updatedData);
    return await User.findByIdAndUpdate(id, { $set: flattenedData }, { new: true, runValidators: true });
  } catch (error) {
    throw new Error(`Failed to update user: ${error.message}`);
  }
}

// helper to flatten nested objects
 flattenUpdateObject(obj, parent = '', res = {}) {
  for (let key in obj) {
    if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      this.flattenUpdateObject(obj[key], parent ? `${parent}.${key}` : key, res);
    } else {
      res[parent ? `${parent}.${key}` : key] = obj[key];
    }
  }
  return res;
}


  async pushToField(userId, field, value) {
    return User.findByIdAndUpdate(userId, { $push: { [field]: value } }, { new: true });
  }

  async pullFromField(userId, field, value) {
    return User.findByIdAndUpdate(userId, { $pull: { [field]: value } }, { new: true });
  }

  async findFriendRequests(userId) {
    const user = await User.findOne({_id: userId}).populate('friendRequests.from', 'name email username _id');
    return user ? user.friendRequests : [];
  }

  async findFriends(userId) {
    const user = await User.findOne({_id: userId}).populate('friends', 'name email username _id');
    return user ? user.friends : [];
  }

  
  async updateProfilePicture(userId, file) {
    const user = await this.findById(userId);
    if (user?.profilePicture) {
      //await FileUploadService.deleteFromS3(user.profilePicture);
    }
  
    const uniqueFileName = `images/users/${uuidv4()}_${file.originalname}`;
    const uploadResult = await FileUploadService.uploadToS3(file.buffer, uniqueFileName, file.mimetype);
  
    await this.findByIdAndUpdate(userId,{profilePicture: uploadResult.Location} );
    return uploadResult;
  }
}

export default UserRepositoryImpl;
