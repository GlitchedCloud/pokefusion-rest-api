require('dotenv').config();

/**
 * Application configuration
 */
const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    url: process.env.SERVER_URL || 'https://pokefusion.armondcastor.com',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: process.env.RATE_LIMIT_WINDOW_MS || 60000, // 1 minute window
    maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS || 10 // Maximum 10 requests per minute
  },

  // CORS configuration
  cors: {
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : '*',
    credentials: false
  },

  // API configuration
  api: {
    limit: process.env.REQUEST_SIZE_LIMIT || '512b' // Request body size limit
  }
};

module.exports = config;
