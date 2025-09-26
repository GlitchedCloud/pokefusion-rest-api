const puppeteer = require('puppeteer');
const express = require('express');
const cors = require('cors');

// Constants
const SITE_URL = 'https://fusiongenerato.com/';
const PORT = process.env.PORT || 3000;
const INITIAL_LOAD_DELAY = 2000; // 2 seconds for site
const FUSION_GENERATION_DELAY = 3000; // 3 seconds for fusion generation
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

// Centralized page setup and navigation for fusiongenerato.com
async function setupPage(browser) {
  const page = await browser.newPage();

  // Set timeout for all operations
  page.setDefaultTimeout(BROWSER_TIMEOUT);

  // Block unnecessary resources to speed up loading (but allow site images)
  await page.setRequestInterception(true);
  page.on('request', req => {
    const resourceType = req.resourceType();
    const url = req.url();

    // Allow essential resources for fusiongenerato.com
    if (
      ['font'].includes(resourceType) ||
      (resourceType === 'image' &&
        !url.includes('fusiongenerato.com') &&
        !url.includes('jsdelivr.net'))
    ) {
      req.abort();
    } else {
      req.continue();
    }
  });

  console.log('[PokéFusion API] Navigating to', SITE_URL);
  await page.goto(SITE_URL, { waitUntil: 'networkidle0' });

  // Wait for initial page load and scripts to initialize
  await sleep(INITIAL_LOAD_DELAY);

  return page;
}

// Main fusion data extraction function for fusiongenerato.com
async function getFusion(browserPath, options = {}) {
  let browser;
  let page;

  try {
    console.log('[PokéFusion API] Starting browser session');
    browser = await launchBrowser(browserPath);
    page = await setupPage(browser);

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

    console.log(
      `[PokéFusion API] Generating fusion: ${headPokemon} + ${bodyPokemon}`
    );

    // Fill in the form and generate fusion
    await page.evaluate(
      (head, body) => {
        // Fill the input fields
        const headInput = document.getElementById('HeadPokemon');
        const bodyInput = document.getElementById('BodyPokemon');

        if (headInput && bodyInput) {
          headInput.value = head;
          bodyInput.value = body;

          // Trigger the generate button
          const generateButton = document.getElementById('generateButton');
          if (generateButton) {
            generateButton.click();
          }
        }
      },
      headPokemon,
      bodyPokemon
    );

    // Wait for fusion to generate
    await sleep(FUSION_GENERATION_DELAY);

    console.log('[PokéFusion API] Extracting fusion data');

    // Extract fusion data from the generated result
    const fusionData = await page.evaluate(() => {
      const safeGetElement = id => {
        const element = document.getElementById(id);
        return element || { innerHTML: '', textContent: '', src: '', alt: '' };
      };

      const safeQuerySelector = selector => {
        const element = document.querySelector(selector);
        return element || { innerHTML: '', textContent: '', src: '', alt: '' };
      };

      try {
        // Extract fusion name from the result
        const fusionNameElement = safeGetElement('fusionName');
        let fusionName =
          fusionNameElement.textContent || fusionNameElement.innerHTML || '';

        // Clean up the fusion name (remove IDs and extra info)
        fusionName = fusionName
          .replace(/\s*\(.*?\)\s*/g, '')
          .replace(/\s*#.*$/g, '')
          .trim();

        // Extract fusion image
        const fusionImage = safeGetElement('fusionImage');
        const fusionImageUrl = fusionImage.src || '';

        // Extract type information
        const typeImages = document.querySelectorAll('#typesElm .typeImage');
        const types = Array.from(typeImages).map(img => ({
          name: img.alt || '',
          imageUrl: img.src || '',
        }));

        // Extract Pokemon details from table
        const headDetails =
          safeGetElement('headPokemonDetails').textContent || '';
        const bodyDetails =
          safeGetElement('bodyPokemonDetails').textContent || '';

        // Parse fusion IDs if available
        const idsSpan = document.querySelector('.fusion-ids');
        let leftIndex = 0,
          rightIndex = 0;
        if (idsSpan) {
          const idsText = idsSpan.textContent || '';
          const matches = idsText.match(/#(\d+)\s*×\s*#(\d+)/);
          if (matches) {
            leftIndex = parseInt(matches[1]) || 0;
            rightIndex = parseInt(matches[2]) || 0;
          }
        }

        return {
          leftPkmnIndex: leftIndex,
          rightPkmnIndex: rightIndex,
          fusionName: fusionName || 'Unknown Fusion',
          fusionImageUrl: fusionImageUrl,
          leftPokemonName: headDetails || 'Unknown',
          rightPokemonName: bodyDetails || 'Unknown',
          types: types,
        };
      } catch (error) {
        console.error('Error extracting fusion data:', error);
        return null;
      }
    });

    if (!fusionData) {
      throw new Error('Failed to extract fusion data from page');
    }

    // Get base64 of fusion image if requested
    if (options.includeBase64 !== false && fusionData.fusionImageUrl) {
      try {
        const imageBase64 = await page.evaluate(async imageUrl => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function () {
              try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = this.naturalWidth;
                canvas.height = this.naturalHeight;
                ctx.drawImage(this, 0, 0);
                resolve(canvas.toDataURL());
              } catch (e) {
                reject(e);
              }
            };
            img.onerror = reject;
            img.src = imageUrl;
          });
        }, fusionData.fusionImageUrl);

        fusionData.fusionBase64 = imageBase64;
      } catch (imageError) {
        console.warn(
          '[PokéFusion API] Failed to get base64 image:',
          imageError.message
        );
      }
    }

    console.log('[PokéFusion API] Fusion generation complete');
    return {
      ...fusionData,
      timestamp: new Date().toISOString(),
      sourceUrl: SITE_URL,
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

async function getPokemonNames(browserPath, options = {}) {
  try {
    const fusion = await getFusion(browserPath, {
      includeBase64: false,
      headPokemon: options.headPokemon,
      bodyPokemon: options.bodyPokemon,
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

async function getPokemonTypes(browserPath, options = {}) {
  try {
    const fusion = await getFusion(browserPath, {
      includeBase64: false,
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
    console.error('[PokéFusion API] Error getting types:', error.message);
    throw error;
  }
}

async function getFusionImage(browserPath, options = {}) {
  try {
    const fusion = await getFusion(browserPath, {
      includeBase64: true,
      headPokemon: options.headPokemon,
      bodyPokemon: options.bodyPokemon,
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

const BROWSER_PATH = process.env.BROWSER_PATH || null;

// Complete Pokemon list from fusiongenerato.com datalist - 501 Pokemon
// This matches exactly with the site's datalist for maximum compatibility
const POKEMON_NAMES = [
  'Bulbasaur',
  'Ivysaur',
  'Venusaur',
  'Charmander',
  'Charmeleon',
  'Charizard',
  'Squirtle',
  'Wartortle',
  'Blastoise',
  'Caterpie',
  'Metapod',
  'Butterfree',
  'Weedle',
  'Kakuna',
  'Beedrill',
  'Pidgey',
  'Pidgeotto',
  'Pidgeot',
  'Rattata',
  'Raticate',
  'Spearrow',
  'Fearrow',
  'Ekans',
  'Arbok',
  'Pikachu',
  'Raichu',
  'Sandshrew',
  'Sandslash',
  'Nidoran',
  'Nidorina',
  'Nidoqueen',
  'Nidoran',
  'Nidorino',
  'Nidoking',
  'Cleffairy',
  'Cleffable',
  'Vulpix',
  'Ninetales',
  'Jigglypuff',
  'Wigglytuff',
  'Zubat',
  'Golbat',
  'Oddish',
  'Gloooom',
  'Vileplume',
  'Paras',
  'Parasect',
  'Venonat',
  'Venomoth',
  'Diglett',
  'Dugtrio',
  'Meowth',
  'Persian',
  'Psyduck',
  'Golduck',
  'Mankey',
  'Primeape',
  'Growllithe',
  'Arcanine',
  'Poliwag',
  'Poliwhirl',
  'Poliwrath',
  'Abra',
  'Kadabra',
  'Alakazam',
  'Machop',
  'Machoke',
  'Machamp',
  'Bellsprout',
  'Weepinbell',
  'Victreebell',
  'Tentacool',
  'Tentacruel',
  'Geodude',
  'Graveler',
  'Golem',
  'Ponyta',
  'Rapidash',
  'Slowpoke',
  'Slowbro',
  'Magnemite',
  'Magneton',
  'Farfetchd',
  'Doduo',
  'Dodrio',
  'Seeeel',
  'Dewgong',
  'Grimer',
  'Muuk',
  'Shellder',
  'Cloyster',
  'Gastly',
  'Haunter',
  'Gengar',
  'Onix',
  'Drowzee',
  'Hypno',
  'Krabby',
  'Kingler',
  'Voltorb',
  'Electrode',
  'Exeggcute',
  'Exeggutor',
  'Cubone',
  'Marowak',
  'Hitmonlee',
  'Hitmonchan',
  'Lickitung',
  'Kofffing',
  'Weezing',
  'Rhyhorn',
  'Rhydon',
  'Chansey',
  'Tangela',
  'Kangaskhan',
  'Horsea',
  'Seadra',
  'Goldeen',
  'Seaking',
  'Staryu',
  'Starmie',
  'Mr. mime',
  'Scyther',
  'Jynnx',
  'Electabuzz',
  'Magmar',
  'Pinsir',
  'Tauros',
  'Magikarp',
  'Gyarados',
  'Lapras',
  'Ditto',
  'Eevee',
  'Vaporeon',
  'Jolteon',
  'Flareon',
  'Porygon',
  'Omanyte',
  'Omastar',
  'Kabuto',
  'Kabutops',
  'Aerodactyl',
  'Snorlax',
  'Articuno',
  'Zapdos',
  'Moltres',
  'Dratini',
  'Dragonair',
  'Dragonite',
  'Mewtwo',
  'Mewew',
  'Chikorita',
  'Bayleef',
  'Meganium',
  'Cyndaquil',
  'Quilava',
  'Typhlosion',
  'Totodile',
  'Croconaw',
  'Feraligatr',
  'Sentret',
  'Furret',
  'Hoothoot',
  'Noctowl',
  'Ledyba',
  'Ledian',
  'Spinarak',
  'Ariados',
  'Crobat',
  'Chinchou',
  'Lanturn',
  'Pichu',
  'Cleffa',
  'Igglybuff',
  'Togepi',
  'Togetic',
  'Natu',
  'Xatu',
  'Mareep',
  'Flaaffy',
  'Ampharos',
  'Bellossom',
  'Marill',
  'Azumarill',
  'Sudowoodo',
  'Politoed',
  'Hoppip',
  'Skiploom',
  'Jumpluff',
  'Aipom',
  'Sunkern',
  'Sunflora',
  'Yanma',
  'Wooper',
  'Quagsire',
  'Espeon',
  'Umbreon',
  'Murkrow',
  'Slowking',
  'Misdreavus',
  'Unown',
  'Wobbuffet',
  'Girafarig',
  'Pineco',
  'Forretress',
  'Dunsparce',
  'Gligar',
  'Steelix',
  'Snubbull',
  'Granbull',
  'Qwilfish',
  'Scizor',
  'Shuckle',
  'Heracross',
  'Sneasel',
  'Teddiursa',
  'Ursaring',
  'Sluggma',
  'Magcargo',
  'Swinub',
  'Piloswine',
  'Corsola',
  'Remoraid',
  'Octillery',
  'Delibird',
  'Mantine',
  'Skarmory',
  'Houndour',
  'Houndoom',
  'Kingdra',
  'Phanpy',
  'Donphan',
  'Porygon2',
  'Stantler',
  'Smeargle',
  'Tyrogue',
  'Hitmontop',
  'Smoochum',
  'Elekid',
  'Magby',
  'Miltank',
  'Blissey',
  'Raikou',
  'Entei',
  'Suicune',
  'Larvitar',
  'Pupitar',
  'Tyranitar',
  'Lugia',
  'Ho-oh',
  'Celebi',
  'Azurill',
  'Wynaut',
  'Ambipom',
  'Mismagius',
  'Honchkrow',
  'Bonsly',
  'Mime Jr.',
  'Happipiny',
  'Munchlax',
  'Mantyke',
  'Weavvile',
  'Magnezone',
  'Lickilicky',
  'Rhyperior',
  'Tangrowth',
  'Electivire',
  'Magmormortar',
  'Togekiss',
  'Yanmega',
  'Leaffeon',
  'Glaceceon',
  'Gliscor',
  'Mamoswine',
  'Porygon-Z',
  'Treecko',
  'Grovyle',
  'Sceptile',
  'Torchchic',
  'Combusken',
  'Blaziken',
  'Mudkip',
  'Marshtomp',
  'Swamppert',
  'Ralts',
  'Kirlia',
  'Gardevoir',
  'Galllade',
  'Shedinja',
  'Keceon',
  'Beldum',
  'Mettang',
  'Metagross',
  'Bidoof',
  'Spiritomb',
  'Lucacario',
  'Gibble',
  'Gabbite',
  'Garchomp',
  'Mawwile',
  'Lilleep',
  'Craddily',
  'Anorith',
  'Armaldo',
  'Cranidos',
  'Rampardos',
  'Shieldon',
  'Bastiodon',
  'Slaking',
  'Absol',
  'Dusskull',
  'Duscclops',
  'Dusknoir',
  'Waillord',
  'Arcceus',
  'Turwig',
  'Grotle',
  'Torterra',
  'Chimchar',
  'Monferno',
  'Infernape',
  'Piplup',
  'Prinplup',
  'Empoleon',
  'Nosepass',
  'Probopass',
  'Honedge',
  'Doubblade',
  'Aegislash',
  'Pawniard',
  'Bisharp',
  'Luxray',
  'Agggron',
  'Flygon',
  'Milotic',
  'Salamence',
  'Klinkklang',
  'Zoroark',
  'Sylveon',
  'Kyoogre',
  'Groudon',
  'Rayquaza',
  'Dialalga',
  'Palkkia',
  'Giratina',
  'Regigigas',
  'Darkrai',
  'Geneesect',
  'Reshiram',
  'Zekrom',
  'Kyurem',
  'Roserade',
  'Drifbblim',
  'Loppunny',
  'Breloom',
  'Ninjask',
  'Bannette',
  'Rotom',
  'Reuniniclus',
  'Whimsicott',
  'Krookodile',
  'Cofagrigus',
  'Galvantula',
  'Ferrothorn',
  'Litwick',
  'Lamppent',
  'Chandellure',
  'Haxxorus',
  'Golulurk',
  'Pyukumuku',
  'Klefki',
  'Talonflame',
  'Mimikyu',
  'Volcarona',
  'Deino',
  'Zweilous',
  'Hydreigon',
  'Latias',
  'Latios',
  'Deoxys',
  'Jirachi',
  'Nincada',
  'Bibarel',
  'Rioolu',
  'Slakoth',
  'Vigoroth',
  'Wailmer',
  'Shinx',
  'Luxio',
  'Aron',
  'Lairron',
  'Trapinch',
  'Vibrava',
  'Feebas',
  'Baagon',
  'Shelelgon',
  'Kliink',
  'Klaang',
  'Zorua',
  'Budew',
  'Roseelia',
  'Driflloon',
  'Buneary',
  'Shroomish',
  'Shuppet',
  'Solosis',
  'Duosion',
  'Cottononee',
  'Sandiile',
  'Krokorok',
  'Yamask',
  'Joltik',
  'Ferroseed',
  'Axexew',
  'Fraxxure',
  'Goleolett',
  'Fletchling',
  'Fletchinder',
  'Larvesta',
  'Stunfisk',
  'Sableye',
  'Venipede',
  'Whirlipede',
  'Scolipede',
  'Tyrunt',
  'Tyrantrum',
  'Snorunt',
  'Glalie',
  'Froslass',
  'Oricorio',
  'Trubbish',
  'Garbodor',
  'Carvanha',
  'Sharpedo',
  'Phanttump',
  'Trevenant',
  'Noibat',
  'Noivern',
  'Swablu',
  'Altaria',
  'Goomy',
  'Sligoo',
  'Goodra',
  'Regirock',
  'Regiice',
  'Registeel',
  'Necrozma',
  'Stufful',
  'Bewear',
  'Dhelmise',
  'Mareanie',
  'Toxapex',
  'Hawllucha',
  'Cacnea',
  'Cactturne',
  'Sandygast',
  'Palosand',
  'Amaaura',
  'Aurororus',
  'Rockruff',
  'Lycanroc',
  'Meloetta',
  'Cressselia',
  'Bruxish',
  'Jangmo-o',
  'Hakamo-o',
  'Kommo-o',
  'Wimpod',
  'Golisopod',
  'Fomantis',
  'Lurantis',
  'Carbink',
  'Chespin',
  'Quilladin',
  'Chesnaught',
  'Fennekin',
  'Braixen',
  'Delphox',
  'Froakie',
  'Frogadier',
  'Greninja',
  'Torkoal',
  'Pumpkaboo',
  'Gourgeist',
  'Swirlix',
  'Slurpuff',
  'Scraggy',
  'Scrafty',
  'Lotad',
  'Lombre',
  'Ludicolo',
  'Minior',
  'Diancie',
  'Luvdisc',
];

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

// GET /api/fusion - Get a fusion with all data (supports query parameters)
app.get('/api/fusion', async (req, res) => {
  try {
    console.log('[REST API] Request for complete fusion data');
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

    const fusion = await getFusion(BROWSER_PATH, {
      headPokemon,
      bodyPokemon,
    });

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

// GET /api/fusion/names - Get only Pokémon names (supports query parameters)
app.get('/api/fusion/names', async (req, res) => {
  try {
    console.log('[REST API] Request for Pokémon names');
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

    const names = await getPokemonNames(BROWSER_PATH, {
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
    console.error('[REST API] Error getting names:', error.message);
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

    console.log(
      '[REST API] Request for type information',
      headPokemon ? ` - Head: ${headPokemon}` : '',
      bodyPokemon ? ` - Body: ${bodyPokemon}` : ''
    );
    const startTime = Date.now();

    const types = await getPokemonTypes(BROWSER_PATH, {
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
    console.error('[REST API] Error getting types:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get types',
      ...(process.env.NODE_ENV !== 'production' && { details: error.message }),
    });
  }
});

// GET /api/fusion/image - Get only fusion image base64 (supports query parameters)
app.get('/api/fusion/image', async (req, res) => {
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

    console.log(
      '[REST API] Request for fusion image',
      headPokemon ? ` - Head: ${headPokemon}` : '',
      bodyPokemon ? ` - Body: ${bodyPokemon}` : ''
    );
    const startTime = Date.now();

    const imageBase64 = await getFusionImage(BROWSER_PATH, {
      headPokemon,
      bodyPokemon,
    });

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

// GET /api/pokemon - Get list of available Pokemon
app.get('/api/pokemon', (req, res) => {
  try {
    console.log('[REST API] Request for Pokemon list');
    const startTime = Date.now();

    // Return the complete Pokemon list
    const pokemonList = POKEMON_NAMES.map((name, index) => ({
      id: index + 1,
      name: name,
    }));

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
    console.error('[REST API] Error getting Pokemon list:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get Pokemon list',
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
    description: 'Clean, efficient API for generating Pokémon fusions',
    endpoints: {
      'GET /api/fusion': 'Get complete fusion data (all information)',
      'GET /api/fusion/names': 'Get only Pokémon names',
      'GET /api/fusion/types': 'Get only type information',
      'GET /api/fusion/image': 'Get only fusion image base64',
      'GET /api/pokemon': 'Get list of all available Pokémon',
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
  getFusion,
  getPokemonNames,
  getPokemonTypes,
  getFusionImage,
};
