require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const app = express();

const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
);

[
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:3000',
  'https://sdc.psgitech.ac.in',
  'https://sdc2.psgitech.ac.in',
].forEach(origin => allowedOrigins.add(origin));

// Connect to MongoDB
connectDB();

// Middleware
// Allow configured origins plus common local dev hosts for CORS.
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    try {
      const parsedOrigin = new URL(origin);
      if (parsedOrigin.hostname === 'localhost' || parsedOrigin.hostname === '127.0.0.1') {
        return callback(null, true);
      }
    } catch (_error) {
      // Fall through to rejection below.
    }

    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create uploads directory if not exists
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Routes
const authRoutes = require('./routes/auth');
const otpRoutes = require('./routes/otp');
const registrationRoutes = require('./routes/registration');
const paymentRoutes = require('./routes/payment');
const adminRoutes = require('./routes/admin');
const suggestionRoutes = require('./routes/suggestions');

[
  '/api',
  '/transport/api',
].forEach(basePath => {
  app.use(`${basePath}/auth`, authRoutes);
  app.use(`${basePath}/otp`, otpRoutes);
  app.use(`${basePath}/register`, registrationRoutes);
  app.use(`${basePath}/payment`, paymentRoutes);
  app.use(`${basePath}/admin`, adminRoutes);
  app.use(`${basePath}/suggestions`, suggestionRoutes);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve client static build (if present) and provide SPA fallback


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 2886;
app.listen(PORT, () => {
  console.log(`\n🚌 Transport Server running on port ${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});
