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
const imageRoutes = require('./routes/images.routes');

// Import services
const ImageService = require('./services/image.service');
const PokemonService = require('./services/pokemon.service');
const FusionService = require('./services/fusion.service');

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
app.use('/api/images', imageRoutes);

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

// Initialize services and start server
const PORT = config.server.port;

async function startServer() {
  try {
    // Initialize services before starting server
    await ImageService.initialize();
    await PokemonService.initialize();
    await FusionService.initialize();

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.serverStart(PORT);
      logger.info('SERVER', `Environment: ${config.server.environment}`);
      logger.info('CORS', `Allowed origins: ${JSON.stringify(config.cors.origin)}`);
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
const server = startServer();

// Export for testing and module use
module.exports = {
  app,
  server: server.then ? server : Promise.resolve(server),
};
