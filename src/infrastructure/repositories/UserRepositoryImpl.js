import User from '../../domain/models/User.js';
import UserRepository from '../../domain/repositories/UserRepository.js';

class UserRepositoryImpl extends UserRepository {
  async findById(id) {
    return User.findOne({ id });
  }

  async findByEmail(email) {
    return User.findOne({ email });
  }

  async findByGoogleId(googleId) {
    return User.findOne({ googleId });
  }

  async save(user) {
    const newUser = new User(user);
    return newUser.save();
  }
}

export default UserRepositoryImpl;
