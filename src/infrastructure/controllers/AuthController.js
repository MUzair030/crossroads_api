import express from 'express';
import UserRepositoryImpl from '../repositories/UserRepositoryImpl.js';
import AuthService from '../../application/services/AuthService.js';

const router = express.Router();
const userRepository = new UserRepositoryImpl();
const authService = new AuthService(userRepository);

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = await authService.signUp({ name, email, password });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { accessToken, refreshToken } = await authService.signIn({ email, password });
    res.json({ accessToken, refreshToken });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const { accessToken } = await authService.refreshAccessToken(refreshToken);
    res.json({ accessToken });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
