import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  googleId: { type: String, required: false },
  name: { type: String, required: false },
  firstName: { type: String, required: false },
  lastName: { type: String, required: false },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: false },
  dob: { type: Date, required: false },
  city: { type: String, required: false },
  state: { type: String, required: false },
  country: { type: String, required: false },
  password: { type: String, required: true },
  profilePicture: { type: String, required: false },
  isVerified: { type: Boolean, default: false },
  isProfileSetup: { type: Boolean, default: false },
  userType: { type: String, required: false },
  identificationNumber: { type: String, required: false },
  identificationRecord: { type: String, required: false },
  isCompany: { type: Boolean, default: false, required:true },
  companyName: { type: String, required: false },
  companyRegistrationNumber: { type: String, required: false },
  verificationToken: String,
  resetOtpExpiry: { type: Date, default: null },
  isDeleted: { type: Boolean, default: false },

  friendRequests: [
    {
      from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    },
  ],
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],


});

const User = mongoose.model('User', UserSchema);

export default User;
