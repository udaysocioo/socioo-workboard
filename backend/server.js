require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
// const mongoose = require('mongoose'); // Removed Mongoose
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const path = require('path');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');

// Connect to Database (Prisma connects lazily, so no explicit connectDB call needed here)
// const connectDB = require('./config/db');
// connectDB(); 
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const commentRoutes = require('./routes/comments');
const activityRoutes = require('./routes/activities');
const dashboardRoutes = require('./routes/dashboard');
const notificationRoutes = require('./routes/notifications');
const uploadRoutes = require('./routes/upload');

const app = express();

// Trust proxy for Render/Vercel/Heroku
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow frontend to load resources
  contentSecurityPolicy: false // Disable CSP for now to avoid breaking scripts
}));

// Prevent NoSQL injection
app.use(mongoSanitize());

// Prevent XSS attacks
app.use(xss());

// Prevent HTTP Param Pollution
app.use(hpp());

// Global rate limiter: 200 requests per minute
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.', code: 'RATE_LIMIT_EXCEEDED', status: 429 },
});
app.use(globalLimiter);

// Auth rate limiter: 10 requests per minute
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, please try again later.', code: 'AUTH_RATE_LIMIT', status: 429 },
});

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10kb' })); // Body limit is bad practice to be too large
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Socioo Workboard API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Centralized error handler (must be after routes)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Socioo Workboard API running on port ${PORT}`);
});
