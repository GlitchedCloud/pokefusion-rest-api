const rateLimit = require('express-rate-limit');
const config = require('../config');
const logger = require('./logger');

/**
 * Rate limiting middleware
 */
const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('API', `Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many requests',
      message: `Maximum ${config.rateLimit.maxRequests} requests per ${config.rateLimit.windowMs / 1000} seconds`,
      retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
    });
  },
});

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  logger.request(req.method, req.path, req.ip);
  next();
};

/**
 * URL size limit middleware - prevents excessively long URLs and query parameters
 */
const urlSizeLimit = maxSize => {
  return (req, res, next) => {
    const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    const urlLength = fullUrl.length;

    console.log(fullUrl);
    console.log(`URL length: ${urlLength} bytes (limit: ${maxSize})`);

    if (urlLength > maxSize) {
      logger.warn(
        'API',
        `URL size limit exceeded: ${urlLength} bytes (max: ${maxSize})`
      );
      return res.status(414).json({
        success: false,
        error: 'URL too long',
        message: `URL length (${urlLength} bytes) exceeds maximum allowed size (${maxSize} bytes)`,
        limit: `${maxSize} bytes`,
      });
    }

    next();
  };
};

/**
 * Error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  logger.error('API', 'Unhandled error:', err.message);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    ...(config.server.environment !== 'production' && { details: err.message }),
  });
};

module.exports = {
  rateLimit: rateLimiter,
  requestLogger,
  errorHandler,
  urlSizeLimit,
};
