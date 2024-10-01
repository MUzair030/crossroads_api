import express from 'express';
import passport from '../../application/services/GoogleAuthService.js';
import UserRepositoryImpl from '../repositories/UserRepositoryImpl.js';
import AuthService from '../../application/services/AuthService.js';

const router = express.Router();
const userRepository = new UserRepositoryImpl();
const authService = new AuthService(userRepository);



router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  try {
    console.log(token);
    const result = await authService.verifyEmail(token);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


router.put('/change-password', passport.authenticate('jwt', { session: false }), async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const userId = req.user.id;
    await authService.changePassword(userId, currentPassword, newPassword);
    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


router.post('/reset-password', async (req, res) => {
  try {
    await authService.resetPassword(req.body.email);
    res.status(200).json(true);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/delete', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const userId = req.user.id;
    await authService.markAccountAsDeleted(userId);
    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});



export default router;
