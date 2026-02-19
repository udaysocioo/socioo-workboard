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

// CORS - Moved to top to ensure OPTIONS pass
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Body parsing - Moved up
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Debug Middleware to log headers and body
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log(`[${req.method}] ${req.url}`);
    console.log('Headers:', JSON.stringify(req.headers['content-type']));
    console.log('Body:', JSON.stringify(req.body));
  }
  next();
});

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

// Prevent NoSQL injection (Optional for Postgres but safe)
app.use(mongoSanitize());

// Prevent XSS attacks - Commented out as it often interferes with JSON body
// app.use(xss());

// Prevent HTTP Param Pollution
app.use(hpp());

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests.', code: 'RATE_LIMIT_EXCEEDED', status: 429 },
});
app.use(globalLimiter);

// Auth rate limiter
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts.', code: 'AUTH_RATE_LIMIT', status: 429 },
});

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
