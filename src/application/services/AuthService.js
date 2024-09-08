import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../../config/config.js'; // Update as needed

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

    const user = { name, email, password: hashedPassword };

    return this.userRepository.save(user);
  }

  async signIn({ email, password }) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
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





// import bcrypt from 'bcryptjs';
// import jwt from 'jsonwebtoken';
// import config from '../../config/config.js';

// class AuthService {
//   constructor(userRepository) {
//     this.userRepository = userRepository;
//   }

//   async signUp({ name, email, password }) {
//     const existingUser = await this.userRepository.findByEmail(email);
//     if (existingUser) {
//       throw new Error('User already exists');
//     }

//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(password, salt);

//     const user = { name, email, password: hashedPassword };

//     return this.userRepository.save(user);
//   }

//   async signIn({ email, password }) {
//     const user = await this.userRepository.findByEmail(email);
//     if (!user) {
//       throw new Error('Invalid credentials');
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       throw new Error('Invalid credentials');
//     }

//     const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '1h' });
//     return token;
//   }
// }

// export default AuthService;
