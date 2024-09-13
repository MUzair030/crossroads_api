import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../../config/config.js';
import emailService from './EmailService.js';

class AuthService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async signUp({ name, email, password }) {
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const verificationToken = jwt.sign({ email }, config.jwtSecret, { expiresIn: '1h' });
    const user = { name, email, password: hashedPassword, verificationToken };

    const savedUser = await this.userRepository.save(user);
    await emailService.sendVerificationEmail(savedUser, verificationToken);
    return { message: 'Verification email sent. Please check your email.' };
  }

  async verifyEmail(token) {
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      const user = await this.userRepository.findByEmail(decoded.email);

      if (!user || user.isVerified) {
        throw new Error('Invalid or already verified token');
      }

      user.isVerified = true;
      user.verificationToken = undefined;
      await this.userRepository.update(user);
      return { message: 'Email verified successfully!' };
    } catch (err) {
      throw new Error('Invalid token');
    }
  }

  async signIn({ email, password }) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.isVerified) {
      throw new Error('Please verify your email first');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    const accessToken = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user.id }, config.refreshTokenSecret, { expiresIn: '7d' });

    return { accessToken, refreshToken };
  }

  async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, config.refreshTokenSecret);
      const accessToken = jwt.sign({ userId: decoded.userId }, config.jwtSecret, { expiresIn: '15m' });
      return { accessToken };
    } catch (err) {
      throw new Error('Invalid refresh token');
    }
  }
}

export default AuthService;
