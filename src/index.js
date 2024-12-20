import express from 'express';
import session from 'express-session';
import connectDB from './infrastructure/database/MongoDB.js';
import authController from './infrastructure/controllers/AuthController.js';
import profileController from './infrastructure/controllers/ProfileController.js';
import bodyParser from 'body-parser';
import passport from './application/services/GoogleAuthService.js';

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(bodyParser.json());

// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

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

app.use((err, req, res, next) => {
  console.error(err);
  CommonResponse.error(res, err);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

