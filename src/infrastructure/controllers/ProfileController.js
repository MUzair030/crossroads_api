import express from 'express';
import passport from '../../application/services/GoogleAuthService.js';
import UserRepositoryImpl from '../repositories/UserRepositoryImpl.js';
import AuthService from '../../application/services/AuthService.js';
import CommonResponse from '../../application/common/CommonResponse.js';

const router = express.Router();
const userRepository = new UserRepositoryImpl();
const authService = new AuthService(userRepository);



router.get('/verify-email', async (req, res) => {
  const { email, code } = req.query;
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
    // res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    CommonResponse.error(res, err.message, 400);
  }
});


router.post('/reset-password', async (req, res) => {
  try {
    await authService.resetPassword(req.body.email);
    CommonResponse.success(res, true);
    // res.status(200).json(true);
  } catch (error) {
    CommonResponse.error(res, err.message, 400);
  }
});

router.get('/delete', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const userId = req.user.id;
    await authService.markAccountAsDeleted(userId);
    CommonResponse.success(res, null,  'Account deleted successfully');
    // res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    CommonResponse.error(res, err.message, 400);
  }
});



export default router;
