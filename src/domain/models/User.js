import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  googleId: { type: String, required: false },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  isProfileSetup: { type: Boolean, default: false },
  verificationToken: String,
  isDeleted: { type: Boolean, default: false },
});

const User = mongoose.model('User', UserSchema);

export default User;
