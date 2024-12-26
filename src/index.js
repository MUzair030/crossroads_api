import express from 'express';
import cors from 'cors';
import session from 'express-session';
import connectDB from './infrastructure/database/MongoDB.js';
import bodyParser from 'body-parser';
import passport from './application/services/GoogleAuthService.js';
import CommonResponse from "./application/common/CommonResponse.js";
import authController from './infrastructure/controllers/AuthController.js';
import profileController from './infrastructure/controllers/ProfileController.js';
import friendController from './infrastructure/controllers/FriendController.js';

const app = express();
const corsOptions = {
    origin: process.env.ALLOWED_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
};

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());

app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: true,
  }));
  app.use(passport.initialize());
  app.use(passport.session());

  

// Routes
app.use('/api/auth', authController);
app.use('/api/account', profileController);
app.use('/api/users', profileController);
app.use('/api/posts', profileController);
// app.use('/api/chat', profileController);
app.use('/api/friend', friendController);

app.use((err, req, res, next) => {
  console.error(err);
  CommonResponse.error(res, err);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

