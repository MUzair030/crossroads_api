import User from '../../domain/models/User.js';
import UserRepository from '../../domain/repositories/UserRepository.js';

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
      return await User.findByIdAndUpdate(id, {$set: updatedData}, {new: true, runValidators: true});
    } catch (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  async pushToField(userId, field, value) {
    return User.findByIdAndUpdate(userId, { $push: { [field]: value } }, { new: true });
  }

  async pullFromField(userId, field, value) {
    return User.findByIdAndUpdate(userId, { $pull: { [field]: value } }, { new: true });
  }

  async findFriendRequests(userId) {
    const user = await User.findOne({_id: userId}).populate('friendRequests.from', 'name email');
    return user ? user.friendRequests : [];
  }

  async findFriends(userId) {
    const user = await User.findOne({_id: userId}).populate('friends', 'name email');
    return user ? user.friends : [];
  }
}

export default UserRepositoryImpl;
