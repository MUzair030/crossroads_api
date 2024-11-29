import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  googleId: { type: String, required: false },
  name: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: false },
  dob: { type: Date, required: true },
  city: { type: String, required: false },
  state: { type: String, required: false },
  country: { type: String, required: false },
  password: { type: String, required: true },
  profilePicture: { type: String, required: false },
  isVerified: { type: Boolean, default: false },
  isProfileSetup: { type: Boolean, default: false },
  verificationToken: String,
  resetOtpExpiry: { type: Date, default: null },
  isDeleted: { type: Boolean, default: false },
});

const User = mongoose.model('User', UserSchema);

export default User;
