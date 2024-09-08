import dotenv from 'dotenv';
dotenv.config();


const config = {
    jwtSecret: process.env.JWT_SECRET,
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
  };
  
  export default config;
  