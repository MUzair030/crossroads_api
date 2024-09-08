import express from 'express';
import passport from '../../application/services/GoogleAuthService.js';
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


// Initiate Google Authentication
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
}));

// Route to handle Google authentication callback
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: true }, (err, user, info) => {
    if (err) {
      console.error('Authentication error:', err);
      return res.status(500).send('Authentication failed');
    }
    if (!user) {
      return res.redirect('/login');
    }
    req.logIn(user, (err) => {
      if (err) {
        console.error('Login error:', err);
        return res.status(500).send('Login failed');
      }
      return res.status(200).send("Login Successful!");
    });
  })(req, res, next);
});




// Handle Logout
router.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

export default router;
