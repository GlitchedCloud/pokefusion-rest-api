const express = require('express');
const cors = require('cors');
const path = require('path');

// Import Pokemon data
const { POKEMON_SPLIT_NAMES, POKEMON_NAMES } = require('./data/pokemon-names');
const { POKEMON_TYPES } = require('./data/pokemon-types');

// Import utilities
const logger = require('./utils/logger');

// Constants
const PORT = process.env.PORT || 3000;

// Rate limiting storage (in production, use Redis)
const requestCounts = new Map();

// Rate limiting middleware
const rateLimit = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 60000; // 1 minute window
  const maxRequests = 10; // Maximum 10 requests per minute

  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
    return next();
  }

  const userData = requestCounts.get(ip);
  if (now > userData.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (userData.count >= maxRequests) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
    });
  }

  userData.count++;
  next();
};

// Generate fusion data using local Pokemon data - no external resources needed
async function getFusion(options = {}) {
  try {
    // Get Pokemon names (specific or random)
    let headPokemon, bodyPokemon;

    if (options.headPokemon && isValidPokemon(options.headPokemon)) {
      headPokemon = options.headPokemon;
    } else {
      headPokemon = getRandomPokemonName();
    }

    if (options.bodyPokemon && isValidPokemon(options.bodyPokemon)) {
      bodyPokemon = options.bodyPokemon;
    } else {
      bodyPokemon = getRandomPokemonName();
    }

    // Get Pokemon indices for fusion generation
    const headIndex = getPokemonIndex(headPokemon);
    const bodyIndex = getPokemonIndex(bodyPokemon);

    logger.fusion(headPokemon, headIndex, bodyPokemon, bodyIndex);

    // Generate fusion name using split names approach
    const headParts = POKEMON_SPLIT_NAMES[headIndex];
    const bodyParts = POKEMON_SPLIT_NAMES[bodyIndex];
    const fusionName = `${headParts[0]}${bodyParts[1]}`;

    // Generate fusion image URL using CDN pattern
    const fusionImageUrl = `https://cdn.jsdelivr.net/gh/fusiondex-org/infinite-fusion-graphics/autogen/${headIndex}/${headIndex}.${bodyIndex}.png`;

    // Get Pokemon types from local data (limit to 2 types max)
    const headTypes = POKEMON_TYPES[headIndex.toString()] || [];
    const bodyTypes = POKEMON_TYPES[bodyIndex.toString()] || [];
    const allTypes = [...headTypes, ...bodyTypes].slice(0, 2);

    // Convert types to the expected format with local server URLs
    const types = allTypes.map(type => ({
      name: type,
      imageUrl: `${process.env.SERVER_URL || 'https://pokefusion.armondcastor.com'}/types/${type.toLowerCase()}.png`,
    }));

    // Create base fusion data
    const fusionData = {
      leftPkmnIndex: headIndex,
      rightPkmnIndex: bodyIndex,
      fusionName: fusionName,
      fusionImageUrl: fusionImageUrl,
      leftPokemonName: headPokemon,
      rightPokemonName: bodyPokemon,
      types: types,
    };

    logger.fusionComplete();
    return {
      ...fusionData,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('FUSION', 'Error generating fusion:', error.message);
    throw new Error(`Failed to generate fusion: ${error.message}`);
  }
}

async function getPokemonNames(options = {}) {
  try {
    const fusion = await getFusion({
      headPokemon: options.headPokemon,
      bodyPokemon: options.bodyPokemon,
    });
    return {
      fusionName: fusion.fusionName,
      leftPokemonName: fusion.leftPokemonName,
      rightPokemonName: fusion.rightPokemonName,
    };
  } catch (error) {
    logger.error('FUSION', 'Error getting names:', error.message);
    throw error;
  }
}

async function getPokemonTypes(options = {}) {
  try {
    const fusion = await getFusion({
      headPokemon: options.headPokemon,
      bodyPokemon: options.bodyPokemon,
    });
    return {
      types: fusion.types,
      fusion: {
        firstType: fusion.types[0]?.imageUrl || '',
        secondType: fusion.types[1]?.imageUrl || '',
      },
    };
  } catch (error) {
    logger.error('FUSION', 'Error getting types:', error.message);
    throw error;
  }
}

// Initialize Express app
const app = express();

// Security middleware
app.disable('x-powered-by'); // Hide Express server information
app.use(express.json({ limit: '1mb' })); // Limit request size
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : '*',
    credentials: false,
  })
);

// Serve static assets BEFORE rate limiting (no rate limits on static files)
app.use('/types', express.static(path.join(__dirname, 'assets', 'type')));

// Apply rate limiting to API routes only (after static assets)
app.use(rateLimit);

// Request logging middleware
app.use((req, res, next) => {
  logger.request(req.method, req.path, req.ip);
  next();
});

// Constants
// Constants
const SITE_URL = 'https://fusiongenerato.com/';

// Pokemon helper functions
function isValidPokemon(name) {
  if (!name || typeof name !== 'string') return false;
  return POKEMON_NAMES.some(
    pokemon => pokemon.toLowerCase() === name.toLowerCase()
  );
}

function getRandomPokemonName() {
  return POKEMON_NAMES[Math.floor(Math.random() * POKEMON_NAMES.length)];
}

function normalizePokemonName(name) {
  if (!name || typeof name !== 'string') return null;
  const found = POKEMON_NAMES.find(
    pokemon => pokemon.toLowerCase() === name.toLowerCase()
  );
  return found || null;
}

function getPokemonIndex(name) {
  if (!name || typeof name !== 'string') return 0;

  // Find the index in the split names array (starting from 1)
  for (let i = 1; i < POKEMON_SPLIT_NAMES.length; i++) {
    const fullName = POKEMON_SPLIT_NAMES[i].join('');
    if (fullName.toLowerCase() === name.toLowerCase()) {
      return i;
    }
  }
  return 0;
}

// GET /api/fusion - Get a fusion with all data (supports query parameters)
app.get('/api/fusion', async (req, res) => {
  try {
    logger.apiRequest('complete fusion data');
    const startTime = Date.now();

    // Extract query parameters for specific Pokemon
    const { head, body } = req.query;

    // Validate Pokemon names if provided
    let headPokemon = null,
      bodyPokemon = null;

    if (head) {
      headPokemon = normalizePokemonName(head);
      if (!headPokemon) {
        return res.status(400).json({
          success: false,
          error: `Invalid head Pokemon: ${head}. Use GET /api/pokemon to see available Pokemon.`,
        });
      }
    }

    if (body) {
      bodyPokemon = normalizePokemonName(body);
      if (!bodyPokemon) {
        return res.status(400).json({
          success: false,
          error: `Invalid body Pokemon: ${body}. Use GET /api/pokemon to see available Pokemon.`,
        });
      }
    }

    const fusion = await getFusion({
      headPokemon,
      bodyPokemon,
    });

    const duration = Date.now() - startTime;
    logger.apiResponse('fusion generation', duration);

    if (!fusion) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate fusion',
      });
    }

    res.json({
      success: true,
      data: fusion,
      processingTime: `${duration}ms`,
    });
  } catch (error) {
    logger.error('API', 'Error in /api/fusion:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to generate fusion',
      // Don't expose internal error details in production
      ...(process.env.NODE_ENV !== 'production' && { details: error.message }),
    });
  }
});

// GET /api/fusion/names - Get only Pokémon names (supports query parameters)
app.get('/api/fusion/names', async (req, res) => {
  try {
    logger.apiRequest('Pokémon names');
    const startTime = Date.now();

    // Extract and validate query parameters
    const { head, body } = req.query;
    let headPokemon = null,
      bodyPokemon = null;

    if (head) {
      headPokemon = normalizePokemonName(head);
      if (!headPokemon) {
        return res.status(400).json({
          success: false,
          error: `Invalid head Pokemon: ${head}`,
        });
      }
    }

    if (body) {
      bodyPokemon = normalizePokemonName(body);
      if (!bodyPokemon) {
        return res.status(400).json({
          success: false,
          error: `Invalid body Pokemon: ${body}`,
        });
      }
    }

    const names = await getPokemonNames({
      headPokemon,
      bodyPokemon,
    });

    const duration = Date.now() - startTime;

    if (!names) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get names',
      });
    }

    res.json({
      success: true,
      data: names,
      processingTime: `${duration}ms`,
    });
  } catch (error) {
    logger.error('API', 'Error getting names:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get names',
      ...(process.env.NODE_ENV !== 'production' && { details: error.message }),
    });
  }
});

// GET /api/fusion/types - Get only type information (supports query parameters)
app.get('/api/fusion/types', async (req, res) => {
  try {
    const { head, body } = req.query;

    // Validate Pokemon names if provided
    let headPokemon = null;
    let bodyPokemon = null;

    if (head) {
      const normalizedHead = normalizePokemonName(head);
      if (!isValidPokemon(normalizedHead)) {
        return res.status(400).json({
          success: false,
          error: `Invalid head Pokemon: ${head}. Use /api/pokemon to see available options.`,
        });
      }
      headPokemon = normalizedHead;
    }

    if (body) {
      const normalizedBody = normalizePokemonName(body);
      if (!isValidPokemon(normalizedBody)) {
        return res.status(400).json({
          success: false,
          error: `Invalid body Pokemon: ${body}. Use /api/pokemon to see available options.`,
        });
      }
      bodyPokemon = normalizedBody;
    }

    const headStr = headPokemon ? ` - Head: ${headPokemon}` : '';
    const bodyStr = bodyPokemon ? ` - Body: ${bodyPokemon}` : '';
    logger.apiRequest(`type information${headStr}${bodyStr}`);
    const startTime = Date.now();

    const types = await getPokemonTypes({
      headPokemon,
      bodyPokemon,
    });

    const duration = Date.now() - startTime;

    if (!types) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get types',
      });
    }

    res.json({
      success: true,
      data: types,
      processingTime: `${duration}ms`,
    });
  } catch (error) {
    logger.error('API', 'Error getting types:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get types',
      ...(process.env.NODE_ENV !== 'production' && { details: error.message }),
    });
  }
});

// GET /api/pokemon - Get list of available Pokemon
app.get('/api/pokemon', (req, res) => {
  try {
    logger.apiRequest('Pokemon list');
    const startTime = Date.now();

    // Return the complete Pokemon list with types
    const pokemonList = POKEMON_NAMES.map((name, index) => {
      const id = index + 1;
      return {
        id: id,
        name: name,
        types: POKEMON_TYPES[id.toString()] || [],
      };
    });

    const duration = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        count: pokemonList.length,
        pokemon: pokemonList,
      },
      processingTime: `${duration}ms`,
    });
  } catch (error) {
    logger.error('API', 'Error getting Pokemon list:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get Pokemon list',
      ...(process.env.NODE_ENV !== 'production' && { details: error.message }),
    });
  }
});

// GET /api/pokemon/types - Get all Pokemon type data
app.get('/api/pokemon/types', (req, res) => {
  try {
    logger.apiRequest('Pokemon type data');
    const startTime = Date.now();

    // Return all type mappings
    res.json({
      success: true,
      data: {
        count: Object.keys(POKEMON_TYPES).length,
        types: POKEMON_TYPES,
      },
      processingTime: `${Date.now() - startTime}ms`,
    });
  } catch (error) {
    logger.error('API', 'Error getting Pokemon types:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get Pokemon types',
      ...(process.env.NODE_ENV !== 'production' && { details: error.message }),
    });
  }
});

// GET /api/health - Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'PokéFusion REST API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || process.env.VERSION || '1.0.0',
  });
});

// GET / - API documentation
app.get('/', (req, res) => {
  res.json({
    name: 'PokéFusion REST API',
    version: process.env.npm_package_version || process.env.VERSION || '1.0.0',
    description:
      'Clean, efficient API for generating Pokémon fusions using minimal external resources',
    endpoints: {
      'GET /api/fusion': 'Get complete fusion data (all information)',
      'GET /api/fusion/names': 'Get only Pokémon names',
      'GET /api/fusion/types': 'Get only type information',
      'GET /api/fusion/image': 'Get only fusion image base64',
      'GET /api/pokemon': 'Get list of all available Pokémon with types',
      'GET /api/pokemon/types': 'Get complete Pokemon type mapping data',
      'GET /api/health': 'Health check endpoint',
    },
    parameters: {
      head: 'Specify the head Pokémon (optional) - example: ?head=pikachu',
      body: 'Specify the body Pokémon (optional) - example: ?body=charizard',
      combined: 'Use both parameters - example: ?head=pikachu&body=charizard',
      fallback: 'If no parameters provided, random Pokémon will be selected',
    },
    examples: {
      'Random fusion': 'GET /api/fusion',
      'Specific fusion': 'GET /api/fusion?head=pikachu&body=charizard',
      'Head only': 'GET /api/fusion?head=pikachu',
      'Body only': 'GET /api/fusion?body=charizard',
      'Available Pokemon': 'GET /api/pokemon',
    },
  });
});

// Handle 404 errors
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: 'Please check the API documentation at the root path "/"',
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  logger.error('API', 'Unhandled error:', err.message);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { details: err.message }),
  });
});

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
const server = app.listen(PORT, () => {
  logger.serverStart(PORT);
  logger.info(
    'SERVER',
    `Environment: ${process.env.NODE_ENV || 'development'}`
  );
});

// Export for testing and module use
module.exports = {
  app,
  server,
  getFusion,
  getPokemonNames,
  getPokemonTypes,
};
