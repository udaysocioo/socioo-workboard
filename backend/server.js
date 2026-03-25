require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const path = require('path');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');
const prisma = require('./config/database');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const commentRoutes = require('./routes/comments');
const activityRoutes = require('./routes/activities');
const dashboardRoutes = require('./routes/dashboard');
const notificationRoutes = require('./routes/notifications');
const uploadRoutes = require('./routes/upload');
const searchRoutes = require('./routes/search');

const app = express();
const server = http.createServer(app);

// ── Socket.io setup ───────────────────────────────────────────
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
const io = new Server(server, {
  cors: { origin: corsOrigin, credentials: true },
});

// JWT auth middleware for sockets
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, isActive: true, memberProjects: { select: { id: true } } },
    });
    if (!user || !user.isActive) return next(new Error('User not found'));
    socket.userId = user.id;
    socket.userName = user.name;
    socket.userProjects = user.memberProjects.map((p) => p.id);
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  // Join personal room
  socket.join(`user:${socket.userId}`);
  // Join project rooms
  socket.userProjects.forEach((pid) => socket.join(`project:${pid}`));

  socket.on('disconnect', () => {});
});

// Make io accessible to routes
app.set('io', io);

// Trust proxy
app.set('trust proxy', 1);

// CORS
app.use(cors({ origin: corsOrigin, credentials: true }));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" }, contentSecurityPolicy: false }));
app.use(mongoSanitize());
app.use(hpp());

// Rate limiters
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many requests.', code: 'RATE_LIMIT_EXCEEDED', status: 429 },
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts.', code: 'AUTH_RATE_LIMIT', status: 429 },
});

// Logging
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

// Static files
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
app.use('/api/search', searchRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Socioo Workboard API', version: '3.0.0', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Start server (use http server for Socket.io)
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Socioo Workboard API running on port ${PORT} (with Socket.io)`);
});
