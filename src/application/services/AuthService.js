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

    const verificationToken = Math.floor(10000 + Math.random() * 90000);

    const user = { name, email, password: hashedPassword, verificationToken };
    const savedUser = await this.userRepository.save(user);
    await emailService.sendVerificationEmail(savedUser, verificationToken);
    return { message: 'Verification email sent. Please check your email.' };
  }

  async sendVerificationEmail({ email }) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
        throw new Error('User does not exist');
    }

    const verificationToken = Math.floor(10000 + Math.random() * 90000);
    user.verificationToken = verificationToken;
    await this.userRepository.update(user);

    await emailService.sendVerificationEmail(user, verificationToken);
    return { message: 'Verification email sent successfully.' };
}

  async verifyEmail(email, code) {
    try {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        throw new Error('User not found');
      }
      if (user.isVerified) {
        throw new Error('User is already verified');
      }

      if (user.verificationCode !== parseInt(code, 10)) {
        throw new Error('Invalid verification code');
      }

      user.isVerified = true;
      user.verificationCode = null;
      await this.userRepository.update(user);
      return { message: 'Email verified successfully!' };
    } catch (err) {
      throw new Error(err.message || 'Verification failed');
    }
  }


  // async verifyEmail(token) {
  //   try {
  //     const decoded = jwt.verify(token, config.jwtSecret);
  //     const user = await this.userRepository.findByEmail(decoded.email);
  //
  //     if (!user || user.isVerified) {
  //       throw new Error('Invalid or already verified token');
  //     }
  //
  //     user.isVerified = true;
  //     user.verificationToken = undefined;
  //     await this.userRepository.update(user);
  //     return { message: 'Email verified successfully!' };
  //   } catch (err) {
  //     throw new Error('Invalid token');
  //   }
  // }

  async signIn({ email, password }) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (user.isDeleted) {
      throw new Error('Account marked as Deleted.');
    }

    // if (!user.isVerified) {
    //   throw new Error('Please verify your email first');
    // }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    const accessToken = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user.id }, config.refreshTokenSecret, { expiresIn: '7d' });

    return { accessToken, refreshToken, isProfileSetup: user.isProfileSetup, isEmailVerified: user.isVerified};
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

  async changePassword(userId, currentPassword, newPassword) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new Error('Current password is incorrect');
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await this.userRepository.update(user);
  }

  async resetPassword(email) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }
    const temPass = "tempPassword@123";
    const hashedPassword = await bcrypt.hash(temPass, await bcrypt.genSalt(10));
    user.password = hashedPassword;
    let savedUser = await this.userRepository.update(user);
    await emailService.sendPasswordResetEmail(savedUser, temPass);
  }


  async markAccountAsDeleted(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    user.isDeleted = true;
    await this.userRepository.update(user);
  }


}

export default AuthService;
