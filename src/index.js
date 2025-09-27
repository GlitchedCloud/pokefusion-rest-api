const express = require('express');
const cors = require('cors');
const bytes = require('bytes');

// Import configuration
const config = require('./config');

// Import utilities
const logger = require('./utils/logger');
const {
  rateLimit: rateLimiter,
  errorHandler,
  urlSizeLimit,
} = require('./utils/middleware');

// Import routes
const fusionRoutes = require('./routes/fusion.routes');
const pokemonRoutes = require('./routes/pokemon.routes');

// Create Express app
const app = express();

// Configure middleware
app.disable('x-powered-by'); // Hide Express server information
app.use(cors(config.cors));
app.use(express.json(config.api)); // Limit request body size
app.use(urlSizeLimit(bytes(config.api.limit)));

// Apply rate limiting
app.use('/api/', rateLimiter);

// Request logging middleware
app.use((req, res, next) => {
  logger.apiRequest(`${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/fusion', fusionRoutes);
app.use('/api/pokemon', pokemonRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'PokéFusion REST API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: config.server.version,
    repository: 'https://github.com/GlitchedCloud/pokefusion-rest-api',
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message:
      'The requested endpoint does not exist. Visit / for API documentation.',
  });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.serverShutdown('SIGTERM');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.serverShutdown('SIGINT');
  process.exit(0);
});

// Start server
const PORT = config.server.port;
const server = app.listen(PORT, () => {
  logger.serverStart(PORT);
  logger.info('SERVER', `Environment: ${config.server.environment}`);
});

// Export for testing and module use
module.exports = {
  app,
  server,
};
