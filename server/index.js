const express = require('express');
const cors = require('cors');
const compression = require('compression');
const dotenv = require('dotenv');
const path = require('path');
const passport = require('./config/passport');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();

// Trust proxy - required for rate limiting behind nginx/reverse proxy
app.set('trust proxy', 1);

// HTTPS Enforcement (Production)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// Security Headers
app.use((_req, res, next) => {
  // Content Security Policy - prevents XSS attacks
  // Note: style-src still requires 'unsafe-inline' for React inline styles
  // Consider using CSS-in-JS with nonce for stricter policy in future
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https://cdn.discordapp.com; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https://discord.com; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'; " +
    "upgrade-insecure-requests"
  );

  // X-Content-Type-Options - prevents MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // X-Frame-Options - prevents clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // X-XSS-Protection - enables browser XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer-Policy - controls referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions-Policy - controls browser features
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
});

// CORS Configuration (Use environment variables)
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : process.env.NODE_ENV === 'production'
    ? ['https://memeticnote.kr', 'https://www.memeticnote.kr']
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:80'];

console.log('Allowed CORS origins:', allowedOrigins);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests without origin header (same-origin requests, server-to-server, etc.)
    // These are typically safe as they're either:
    // 1. Same-origin requests from the frontend (served from same domain)
    // 2. Server-to-server API calls
    // 3. Requests through reverse proxy that strips origin
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from the specified origin: ${origin}`;
      if (process.env.NODE_ENV === 'development') {
        console.error('CORS blocked:', origin);
      }
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Security: Limit request body size
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per windowMs (increased for admin panel)
  message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for admin users and auth endpoints
  skip: (req) => {
    // Skip Discord OAuth endpoints
    if (req.path.startsWith('/auth/discord')) {
      return true;
    }

    // Check if user is admin (from JWT token)
    const authHeader = req.headers.authorization;
    if (!authHeader) return false;

    try {
      const token = authHeader.split(' ')[1];
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded.isAdmin === true; // Skip rate limit for admins
    } catch (err) {
      return false;
    }
  }
});

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs (increased for development)
  message: '로그인 시도가 너무 많습니다. 15분 후 다시 시도해주세요.',
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Enable gzip compression for all responses
app.use(compression());

app.use(passport.initialize());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require('./routes/auth');
const characterRoutes = require('./routes/characters');
const clanRoutes = require('./routes/clans');
const memeticRoutes = require('./routes/memetics');
const tradeRoutes = require('./routes/trades');
const reviewRoutes = require('./routes/reviews');
const reportRoutes = require('./routes/reports');
const chatRoutes = require('./routes/chat');
const squadRecruitmentsRoutes = require('./routes/squadRecruitments');
const adminRoutes = require('./routes/admin');
const bugReportRoutes = require('./routes/bugReports');
const notificationRoutes = require('./routes/notifications');

// Register auth routes BEFORE rate limiter (Discord OAuth needs to be exempt)
app.use('/api/auth', authRoutes);

// Apply rate limiters AFTER auth routes
app.use('/api/', apiLimiter);
app.use('/api/characters', characterRoutes);
app.use('/api/clans', clanRoutes);
app.use('/api/memetics', memeticRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/squad-recruitments', squadRecruitmentsRoutes);
app.use('/api/admin', adminRoutes);
// 버그 제보 라우트 (POST에만 별도 Rate Limiting 적용)
app.use('/api/bug-reports', bugReportRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Serve React app (must be after API routes)
const clientPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientPath));

// Handle React routing, return all requests to React app
app.use((_req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
