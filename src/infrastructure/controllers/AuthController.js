import express from 'express';
import passport from '../../application/services/GoogleAuthService.js';
import UserRepositoryImpl from '../repositories/UserRepositoryImpl.js';
import AuthService from '../../application/services/AuthService.js';
import CommonResponse from '../../application/common/CommonResponse.js';

const router = express.Router();
const userRepository = new UserRepositoryImpl();
const authService = new AuthService(userRepository);

router.post('/signup', async (req, res) => {
  try {
    const { name, userName, email, password } = req.body;
    const user = await authService.signUp({ name, userName, email, password });
    CommonResponse.success(res, { user });
  } catch (err) {
    CommonResponse.error(res, err);
  }
});

router.post('/resend-verification-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return CommonResponse.error(res, 'Email is required', 400);
    }
    const response = await authService.sendVerificationEmail({ email });
    CommonResponse.success(res, response);
  } catch (err) {
    CommonResponse.error(res, err);
  }
});


router.post('/signin', async (req, res) => {
  try {
    const { email, userName, password } = req.body;
    const { accessToken, refreshToken, userId, isProfileSetup, isEmailVerified } = await authService.signIn({ email, userName, password });
    CommonResponse.success(res, { accessToken, refreshToken, userId, isProfileSetup, isEmailVerified});
  } catch (err) {
    CommonResponse.error(res, err.message, 400);
  }
});

router.post('/refresh-token', async (req, res) => {
  try {    CommonResponse.success(res, { accessToken, refreshToken }, null, 200);
    const { refreshToken } = req.body;
    const { accessToken } = await authService.refreshAccessToken(refreshToken);
    CommonResponse.success(res, { accessToken });
  } catch (err) {
    CommonResponse.error(res, err.message, 400);
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
      return CommonResponse.error(res, 'Authentication failed');
      // return res.status(500).send('Authentication failed');
    }
    if (!user) {
      return res.redirect('/login');
    }
    req.logIn(user, (err) => {
      if (err) {
        console.error('Login error:', err);
        return CommonResponse.error(res, 'Login failed');
        // return res.status(500).send('Login failed');
      }
      CommonResponse.success(res, null, "Login Successful!");
      // return res.status(200).send("Login Successful!");
    });
  })(req, res, next);
});

// Handle Logout
router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
});


export default router;
