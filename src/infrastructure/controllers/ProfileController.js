import express from 'express';
import multer from 'multer';
import passport from '../../application/services/GoogleAuthService.js';
import UserRepositoryImpl from '../repositories/UserRepositoryImpl.js';
import AuthService from '../../application/services/AuthService.js';
import CommonResponse from '../../application/common/CommonResponse.js';
import UserManagementService from "../../application/services/UserManagementService.js";

const router = express.Router();
const userRepository = new UserRepositoryImpl();
const authService = new AuthService(userRepository);
const userService = new UserManagementService();

const upload = multer({ storage: multer.memoryStorage() });

router.get('/', async (req, res) => {
  try {
    const result = await userService.getAllUsers();
    CommonResponse.success(res, result);
  } catch (error) {
    CommonResponse.error(res, error.message, 400);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await userService.getUserById(id);
    CommonResponse.success(res, result);
  } catch (error) {
    CommonResponse.error(res, error.message, 404);
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const updatedUser = await userService.updateUserById(id, updateData);
    CommonResponse.success(res, updatedUser);
  } catch (error) {
    CommonResponse.error(res, error.message, 404);
  }
});

router.post('/:id/setup', async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const updatedUser = await userService.updateUserById(id, updateData, true);
    CommonResponse.success(res, updatedUser);
  } catch (error) {
    CommonResponse.error(res, error.message, 404);
  }
});

router.post('/:id/profile-picture', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return CommonResponse.error(res, 'No file uploaded', 400);
    }
    const user = await userService.getUserById(id);
    if(user){
      const uploadResult = await userService.uploadUserProfilePicture(file, user);
      CommonResponse.success(res, uploadResult);
    }
  } catch (error) {
    CommonResponse.error(res, error.message, 500);
  }
});

router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    if (!query || query.trim() === '') {
      return CommonResponse.error(res, 'Search query is required', 400);
    }

    const results = await userService.searchUsers(query, page, limit);
    CommonResponse.success(res, results);
  } catch (error) {
    CommonResponse.error(res, error.message, 500);
  }
});


router.post('/verify-email', async (req, res) => {
  const { email, code } = req.body;
  try {
    if (!email || !code) {
      return CommonResponse.error(res, 'Email and verification code are required', 400);
    }
    const result = await authService.verifyEmail(email, code);
    CommonResponse.success(res, result);
  } catch (error) {
    CommonResponse.error(res, error.message, 400);
  }
});

router.put('/change-password', passport.authenticate('jwt', { session: false }), async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const userId = req.user.id;
    await authService.changePassword(userId, currentPassword, newPassword);
    CommonResponse.success(res, null, 'Password changed successfully');
  } catch (error) {
    CommonResponse.error(res, error.message, 400);
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    await authService.sendForgotPasswordOTP(email);
    CommonResponse.success(res, null, 'OTP sent successfully');
  } catch (error) {
    CommonResponse.error(res, error.message, 400);
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    await authService.verifyOtp(email, otp);
    CommonResponse.success(res, null, 'OTP verified successfully');
  } catch (error) {
    CommonResponse.error(res, error.message, 400);
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const result = await authService.resetPasswordWithOtp(email, newPassword);
    CommonResponse.success(res, true);
  } catch (error) {
    CommonResponse.error(res, error.message, 400);
  }
});

router.delete('/', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const userId = req.user.id;
    await authService.markAccountAsDeleted(userId);
    CommonResponse.success(res, null,  'Account deleted successfully');
  } catch (error) {
    CommonResponse.error(res, error.message, 400);
  }
});



export default router;
