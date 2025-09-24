const puppeteer = require('puppeteer');
const express = require('express');
const cors = require('cors');

// Constants
const SITE_URL = 'https://www.japeal.com/pkm';
const PORT = process.env.PORT || 3000;
const INITIAL_LOAD_DELAY = 1000; // 1 second
const FUSION_GENERATION_DELAY = 5000; // 5 seconds
const BROWSER_TIMEOUT = 30000; // 30 seconds

// Utility function for delays
const sleep = milliseconds =>
  new Promise(resolve => setTimeout(resolve, milliseconds));

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

// Centralized browser launcher with proper configuration
async function launchBrowser(browserPath) {
  return await puppeteer.launch({
    ...(browserPath ? { executablePath: browserPath } : {}),
    args: [
      '--disable-dev-shm-usage',
      '--disable-setuid-sandbox',
      '--no-sandbox',
      '--disable-web-security',
      '--window-size=1040,780',
    ],
    timeout: BROWSER_TIMEOUT,
    headless: true,
  });
}

// Centralized page setup and navigation
async function setupPage(browser) {
  const page = await browser.newPage();

  // Set timeout for all operations
  page.setDefaultTimeout(BROWSER_TIMEOUT);

  // Block unnecessary resources to speed up loading
  await page.setRequestInterception(true);
  page.on('request', req => {
    const resourceType = req.resourceType();
    if (
      ['font', 'image'].includes(resourceType) &&
      !req.url().includes('japeal.com')
    ) {
      req.abort();
    } else {
      req.continue();
    }
  });

  console.log('[PokéFusion API] Navigating to', SITE_URL);
  await page.goto(SITE_URL, { waitUntil: 'networkidle0' });

  // Wait for initial page load
  await sleep(INITIAL_LOAD_DELAY);

  // Trigger fusion generation
  await page.evaluate(() => {
    if (typeof ShowUnlock === 'function') ShowUnlock();
    const button = document.getElementById('fbutton');
    if (button && button.onclick) button.onclick();
  });

  // Wait for fusion to generate
  await sleep(FUSION_GENERATION_DELAY);

  return page;
}

// Main fusion data extraction function
async function getRandomFusion(browserPath, options = {}) {
  let browser;
  let page;

  try {
    console.log('[PokéFusion API] Starting browser session');
    browser = await launchBrowser(browserPath);
    page = await setupPage(browser);

    console.log('[PokéFusion API] Extracting fusion data');

    // Extract all fusion data in a single evaluate call
    const fusionData = await page.evaluate(() => {
      const safeGetElement = id => {
        const element = document.getElementById(id);
        return (
          element || {
            innerHTML: '',
            src: '',
            value: '',
            style: { backgroundImage: '' },
          }
        );
      };

      const safeQuerySelector = selector => {
        const element = document.querySelector(selector);
        return element || { src: '' };
      };

      try {
        // Parse fusion indexes from button onclick
        const button = safeGetElement('fbutton');
        const onclickStr = button.onclick ? button.onclick.toString() : '';
        const fusionIndexes = onclickStr
          .replace(
            /function onclick\(event\) \{|\}|LoadNewFusionDelay\(|\)/g,
            ''
          )
          .trim()
          .split(',')
          .map(idx => parseInt(idx.trim()) || 0);

        return {
          leftPkmnIndex: fusionIndexes[0] || 0,
          rightPkmnIndex: fusionIndexes[1] || 0,
          fusionBase64: safeGetElement('combinedNEW').toDataURL?.() || '',
          fusionName: safeGetElement('fnametxt').innerHTML.trim(),
          leftPokemonName: safeGetElement('Ltxt').innerHTML.trim(),
          rightPokemonName: safeGetElement('Rtxt').innerHTML.trim(),
          leftPokemonSprite: safeGetElement(
            'Limagediv'
          ).style.backgroundImage.replace(/url\(["']?|["']?\)/g, ''),
          rightPokemonSprite: safeGetElement(
            'Rimagediv'
          ).style.backgroundImage.replace(/url\(["']?|["']?\)/g, ''),
          types: {
            leftPokemon: {
              firstType: safeGetElement('L1Type').src || '',
              secondType: safeGetElement('L2Type').src || '',
            },
            rightPokemon: {
              firstType: safeGetElement('R1Type').src || '',
              secondType: safeGetElement('R2Type').src || '',
            },
            fusion: {
              firstType: safeGetElement('FusedTypeL').src || '',
              secondType: safeGetElement('FusedTypeR').src || '',
            },
          },
          cries: {
            leftPokemonCry: safeQuerySelector('#audio1 #wav').src || '',
            rightPokemonCry: safeQuerySelector('#audio2 #wav').src || '',
          },
          shareUrl: safeGetElement('permalink').value || '',
        };
      } catch (error) {
        console.error('Error extracting fusion data:', error);
        return null;
      }
    });

    if (!fusionData) {
      throw new Error('Failed to extract fusion data from page');
    }

    // Take Pokédex screenshot if requested
    let pokedexBase64 = null;
    if (options.includePokedex !== false) {
      try {
        console.log('[PokéFusion API] Taking Pokédex screenshot');
        await page.evaluate(() => {
          if (typeof changeBG9 === 'function') changeBG9();
        });

        pokedexBase64 = await page.screenshot({
          clip: { x: 222, y: 545, width: 596, height: 410 },
          encoding: 'base64',
        });
      } catch (screenshotError) {
        console.warn(
          '[PokéFusion API] Screenshot failed:',
          screenshotError.message
        );
      }
    }

    console.log('[PokéFusion API] Fusion generation complete');
    return {
      ...fusionData,
      ...(pokedexBase64 && { pokedexBase64 }),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[PokéFusion API] Error generating fusion:', error.message);
    throw new Error(`Failed to generate fusion: ${error.message}`);
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (closeError) {
        console.warn(
          '[PokéFusion API] Error closing page:',
          closeError.message
        );
      }
    }
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.warn(
          '[PokéFusion API] Error closing browser:',
          closeError.message
        );
      }
    }
  }
}

// Efficient data extraction functions that reuse the main fusion function
async function getPokemonSprites(browserPath) {
  try {
    const fusion = await getRandomFusion(browserPath, {
      includePokedex: false,
    });
    return {
      leftPokemonSprite: fusion.leftPokemonSprite,
      rightPokemonSprite: fusion.rightPokemonSprite,
    };
  } catch (error) {
    console.error('[PokéFusion API] Error getting sprites:', error.message);
    throw error;
  }
}

async function getPokemonNames(browserPath) {
  try {
    const fusion = await getRandomFusion(browserPath, {
      includePokedex: false,
    });
    return {
      fusionName: fusion.fusionName,
      leftPokemonName: fusion.leftPokemonName,
      rightPokemonName: fusion.rightPokemonName,
    };
  } catch (error) {
    console.error('[PokéFusion API] Error getting names:', error.message);
    throw error;
  }
}

async function getPokemonTypes(browserPath) {
  try {
    const fusion = await getRandomFusion(browserPath, {
      includePokedex: false,
    });
    return fusion.types;
  } catch (error) {
    console.error('[PokéFusion API] Error getting types:', error.message);
    throw error;
  }
}

async function getPokemonCries(browserPath) {
  try {
    const fusion = await getRandomFusion(browserPath, {
      includePokedex: false,
    });
    return fusion.cries;
  } catch (error) {
    console.error('[PokéFusion API] Error getting cries:', error.message);
    throw error;
  }
}

async function getShareUrl(browserPath) {
  try {
    const fusion = await getRandomFusion(browserPath, {
      includePokedex: false,
    });
    return fusion.shareUrl;
  } catch (error) {
    console.error('[PokéFusion API] Error getting share URL:', error.message);
    throw error;
  }
}

async function getFusionImage(browserPath) {
  try {
    const fusion = await getRandomFusion(browserPath, {
      includePokedex: false,
    });
    return fusion.fusionBase64;
  } catch (error) {
    console.error(
      '[PokéFusion API] Error getting fusion image:',
      error.message
    );
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

// Apply rate limiting to all routes
app.use(rateLimit);

// Request logging middleware
app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.path} - ${req.ip}`
  );
  next();
});

// Get browser path from environment variable only (secure)
const BROWSER_PATH = process.env.BROWSER_PATH || null;

// API Routes

// API Routes

// GET /api/fusion - Get a complete random fusion with all data
app.get('/api/fusion', async (req, res) => {
  try {
    console.log('[REST API] Request for complete fusion data');
    const startTime = Date.now();

    const fusion = await getRandomFusion(BROWSER_PATH);

    const duration = Date.now() - startTime;
    console.log(`[REST API] Fusion generation completed in ${duration}ms`);

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
    console.error('[REST API] Error in /api/fusion:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to generate fusion',
      // Don't expose internal error details in production
      ...(process.env.NODE_ENV !== 'production' && { details: error.message }),
    });
  }
});

// GET /api/fusion/sprites - Get only sprite URLs
app.get('/api/fusion/sprites', async (req, res) => {
  try {
    console.log('[REST API] Request for sprite URLs');
    const startTime = Date.now();

    const sprites = await getPokemonSprites(BROWSER_PATH);

    const duration = Date.now() - startTime;

    if (!sprites) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get sprites',
      });
    }

    res.json({
      success: true,
      data: sprites,
      processingTime: `${duration}ms`,
    });
  } catch (error) {
    console.error('[REST API] Error getting sprites:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get sprites',
      ...(process.env.NODE_ENV !== 'production' && { details: error.message }),
    });
  }
});

// GET /api/fusion/names - Get only Pokémon names
app.get('/api/fusion/names', async (req, res) => {
  try {
    console.log('[REST API] Request for Pokémon names');
    const startTime = Date.now();

    const names = await getPokemonNames(BROWSER_PATH);

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
    console.error('[REST API] Error getting names:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get names',
      ...(process.env.NODE_ENV !== 'production' && { details: error.message }),
    });
  }
});

// GET /api/fusion/types - Get only type information
app.get('/api/fusion/types', async (req, res) => {
  try {
    console.log('[REST API] Request for type information');
    const startTime = Date.now();

    const types = await getPokemonTypes(BROWSER_PATH);

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
    console.error('[REST API] Error getting types:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get types',
      ...(process.env.NODE_ENV !== 'production' && { details: error.message }),
    });
  }
});

// GET /api/fusion/cries - Get only cry audio URLs
app.get('/api/fusion/cries', async (req, res) => {
  try {
    console.log('[REST API] Request for cry URLs');
    const startTime = Date.now();

    const cries = await getPokemonCries(BROWSER_PATH);

    const duration = Date.now() - startTime;

    if (!cries) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get cries',
      });
    }

    res.json({
      success: true,
      data: cries,
      processingTime: `${duration}ms`,
    });
  } catch (error) {
    console.error('[REST API] Error getting cries:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get cries',
      ...(process.env.NODE_ENV !== 'production' && { details: error.message }),
    });
  }
});

app.get('/api/fusion/share', async (req, res) => {
  try {
    console.log('[REST API] Request for share URL');
    const startTime = Date.now();

    const shareUrl = await getShareUrl(BROWSER_PATH);

    const duration = Date.now() - startTime;

    if (!shareUrl) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get share URL',
      });
    }

    res.json({
      success: true,
      data: { shareUrl },
      processingTime: `${duration}ms`,
    });
  } catch (error) {
    console.error('[REST API] Error getting share URL:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get share URL',
      ...(process.env.NODE_ENV !== 'production' && { details: error.message }),
    });
  }
});

app.get('/api/fusion/image', async (req, res) => {
  try {
    console.log('[REST API] Request for fusion image');
    const startTime = Date.now();

    const imageBase64 = await getFusionImage(BROWSER_PATH);

    const duration = Date.now() - startTime;

    if (!imageBase64) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get fusion image',
      });
    }

    res.json({
      success: true,
      data: { fusionBase64: imageBase64 },
      processingTime: `${duration}ms`,
    });
  } catch (error) {
    console.error('[REST API] Error getting fusion image:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get fusion image',
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
    version: '2.0.0',
  });
});

// GET / - API documentation
app.get('/', (req, res) => {
  res.json({
    name: 'PokéFusion REST API',
    version: '2.0.0',
    description: 'Clean, efficient API for generating Pokémon fusions',
    endpoints: {
      'GET /api/fusion': 'Get complete fusion data (all information)',
      'GET /api/fusion/sprites': 'Get only Pokémon sprite URLs',
      'GET /api/fusion/names': 'Get only Pokémon names',
      'GET /api/fusion/types': 'Get only type information',
      'GET /api/fusion/cries': 'Get only cry audio URLs',
      'GET /api/fusion/share': 'Get only share URL',
      'GET /api/fusion/image': 'Get only fusion image base64',
      'GET /api/health': 'Health check endpoint',
    },
    example: 'GET /api/fusion',
  });
});

// Handle 404 errors
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: 'Please check the API documentation at the root path "/"',
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('[REST API] Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { details: err.message }),
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('[REST API] Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[REST API] Received SIGINT, shutting down gracefully');
  process.exit(0);
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`[PokéFusion REST API] 🚀 Server running on port ${PORT}`);
  console.log(`[PokéFusion REST API] 📚 API docs: http://localhost:${PORT}`);
  console.log(
    `[PokéFusion REST API] 🔧 Environment: ${process.env.NODE_ENV || 'development'}`
  );
});

// Export for testing and module use
module.exports = {
  app,
  server,
  getRandomFusion,
  getPokemonSprites,
  getPokemonNames,
  getPokemonTypes,
  getPokemonCries,
  getShareUrl,
  getFusionImage,
};
