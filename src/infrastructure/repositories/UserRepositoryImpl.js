import User from '../../domain/models/User.js';
import UserRepository from '../../domain/repositories/UserRepository.js';

class UserRepositoryImpl extends UserRepository {
  async findByEmail(email) {
    return User.findOne({ email });
  }

  async save(user) {
    const newUser = new User(user);
    return newUser.save();
  }
}

export default UserRepositoryImpl;
