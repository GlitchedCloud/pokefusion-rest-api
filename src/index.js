const express = require('express');
const cors = require('cors');
const path = require('path');

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

    console.log(
      `[PokéFusion API] Generating fusion: ${headPokemon} (#${headIndex}) + ${bodyPokemon} (#${bodyIndex})`
    );

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

    console.log('[PokéFusion API] Fusion generation complete (local data)');
    return {
      ...fusionData,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[PokéFusion API] Error generating fusion:', error.message);
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
    console.error('[PokéFusion API] Error getting names:', error.message);
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
    console.error('[PokéFusion API] Error getting types:', error.message);
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
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.path} - ${req.ip}`
  );
  next();
});

// Optimized Pokemon data using split names approach for minimal external resources
// Index = Pokemon ID, join("") = full name
const POKEMON_SPLIT_NAMES = [
  ['', ''],
  ['Bulba', 'saur'],
  ['Ivy', 'saur'],
  ['Venu', 'saur'],
  ['Char', 'mander'],
  ['Char', 'meleon'],
  ['Char', 'izard'],
  ['Squirt', 'tle'],
  ['War', 'tortle'],
  ['Blast', 'toise'],
  ['Cater', 'pie'],
  ['Meta', 'pod'],
  ['Butter', 'free'],
  ['Wee', 'dle'],
  ['Kak', 'una'],
  ['Bee', 'drill'],
  ['Pid', 'gey'],
  ['Pidge', 'otto'],
  ['Pid', 'geot'],
  ['Rat', 'tata'],
  ['Rat', 'icate'],
  ['Spear', 'row'],
  ['Fear', 'row'],
  ['Ek', 'ans'],
  ['Ar', 'bok'],
  ['Pika', 'chu'],
  ['Rai', 'chu'],
  ['Sand', 'shrew'],
  ['Sand', 'slash'],
  ['Nido', 'ran'],
  ['Nido', 'rina'],
  ['Nido', 'queen'],
  ['Nido', 'ran'],
  ['Nido', 'rino'],
  ['Nido', 'king'],
  ['Clef', 'fairy'],
  ['Clef', 'fable'],
  ['Vul', 'pix'],
  ['Nine', 'tales'],
  ['Jiggly', 'puff'],
  ['Wiggly', 'tuff'],
  ['Zu', 'bat'],
  ['Gol', 'bat'],
  ['Odd', 'ish'],
  ['Gloo', 'oom'],
  ['Vile', 'plume'],
  ['Pa', 'ras'],
  ['Para', 'sect'],
  ['Veno', 'nat'],
  ['Veno', 'moth'],
  ['Dig', 'lett'],
  ['Dug', 'trio'],
  ['Meow', 'th'],
  ['Per', 'sian'],
  ['Psy', 'duck'],
  ['Gol', 'duck'],
  ['Man', 'key'],
  ['Prime', 'ape'],
  ['Growl', 'lithe'],
  ['Arca', 'nine'],
  ['Poli', 'wag'],
  ['Poli', 'whirl'],
  ['Poli', 'wrath'],
  ['Ab', 'ra'],
  ['Kada', 'bra'],
  ['Ala', 'kazam'],
  ['Ma', 'chop'],
  ['Ma', 'choke'],
  ['Ma', 'champ'],
  ['Bell', 'sprout'],
  ['Weepin', 'bell'],
  ['Victree', 'bell'],
  ['Tenta', 'cool'],
  ['Tenta', 'cruel'],
  ['Geo', 'dude'],
  ['Grave', 'ler'],
  ['Go', 'lem'],
  ['Pony', 'ta'],
  ['Rapi', 'dash'],
  ['Slow', 'poke'],
  ['Slow', 'bro'],
  ['Magne', 'mite'],
  ['Magne', 'ton'],
  ['Far', 'fetchd'],
  ['Do', 'duo'],
  ['Do', 'drio'],
  ['See', 'eel'],
  ['Dew', 'gong'],
  ['Gri', 'mer'],
  ['Mu', 'uk'],
  ['Shell', 'der'],
  ['Cloy', 'ster'],
  ['Gas', 'tly'],
  ['Haun', 'ter'],
  ['Gen', 'gar'],
  ['On', 'ix'],
  ['Drow', 'zee'],
  ['Hyp', 'no'],
  ['Krab', 'by'],
  ['King', 'ler'],
  ['Volt', 'orb'],
  ['Electr', 'ode'],
  ['Exegg', 'cute'],
  ['Exeggu', 'tor'],
  ['Cu', 'bone'],
  ['Maro', 'wak'],
  ['Hitmon', 'lee'],
  ['Hitmon', 'chan'],
  ['Licki', 'tung'],
  ['Koff', 'fing'],
  ['Wee', 'zing'],
  ['Rhy', 'horn'],
  ['Rhy', 'don'],
  ['Chan', 'sey'],
  ['Tan', 'gela'],
  ['Kangas', 'khan'],
  ['Hor', 'sea'],
  ['Sea', 'dra'],
  ['Gol', 'deen'],
  ['Sea', 'king'],
  ['Star', 'yu'],
  ['Star', 'mie'],
  ['Mr. ', 'mime'],
  ['Scy', 'ther'],
  ['Jyn', 'nx'],
  ['Electa', 'buzz'],
  ['Mag', 'mar'],
  ['Pin', 'sir'],
  ['Tau', 'ros'],
  ['Magi', 'karp'],
  ['Gyara', 'dos'],
  ['Lap', 'ras'],
  ['Dit', 'to'],
  ['Ee', 'vee'],
  ['Vapor', 'eon'],
  ['Jolt', 'eon'],
  ['Fla', 'reon'],
  ['Pory', 'gon'],
  ['Oma', 'nyte'],
  ['Oma', 'star'],
  ['Kabu', 'to'],
  ['Kabu', 'tops'],
  ['Aero', 'dactyl'],
  ['Snor', 'lax'],
  ['Arti', 'cuno'],
  ['Zap', 'dos'],
  ['Mol', 'tres'],
  ['Dra', 'tini'],
  ['Drago', 'nair'],
  ['Drago', 'nite'],
  ['Mew', 'two'],
  ['Mew', 'ew'],
  ['Chiko', 'rita'],
  ['Bay', 'leef'],
  ['Mega', 'nium'],
  ['Cynda', 'quil'],
  ['Qui', 'lava'],
  ['Typh', 'losion'],
  ['Toto', 'dile'],
  ['Croco', 'naw'],
  ['Fera', 'ligatr'],
  ['Sen', 'tret'],
  ['Fur', 'ret'],
  ['Hoot', 'hoot'],
  ['Noct', 'owl'],
  ['Ledy', 'ba'],
  ['Led', 'ian'],
  ['Spina', 'rak'],
  ['Aria', 'dos'],
  ['Cro', 'bat'],
  ['Chin', 'chou'],
  ['Lan', 'turn'],
  ['Pi', 'chu'],
  ['Clef', 'fa'],
  ['Iggly', 'buff'],
  ['Toge', 'pi'],
  ['Toge', 'tic'],
  ['Na', 'tu'],
  ['Xa', 'tu'],
  ['Ma', 'reep'],
  ['Flaa', 'ffy'],
  ['Ampha', 'ros'],
  ['Bell', 'ossom'],
  ['Ma', 'rill'],
  ['Azuma', 'rill'],
  ['Sudo', 'woodo'],
  ['Poli', 'toed'],
  ['Hop', 'pip'],
  ['Skip', 'loom'],
  ['Jump', 'luff'],
  ['Ai', 'pom'],
  ['Sun', 'kern'],
  ['Sun', 'flora'],
  ['Yan', 'ma'],
  ['Woo', 'per'],
  ['Quag', 'sire'],
  ['Esp', 'eon'],
  ['Umb', 'reon'],
  ['Mur', 'krow'],
  ['Slow', 'king'],
  ['Mis', 'dreavus'],
  ['Un', 'own'],
  ['Wob', 'buffet'],
  ['Gira', 'farig'],
  ['Pine', 'co'],
  ['Forre', 'tress'],
  ['Dun', 'sparce'],
  ['Gli', 'gar'],
  ['Stee', 'lix'],
  ['Snub', 'bull'],
  ['Gran', 'bull'],
  ['Qwil', 'fish'],
  ['Sci', 'zor'],
  ['Shu', 'ckle'],
  ['Hera', 'cross'],
  ['Snea', 'sel'],
  ['Teddi', 'ursa'],
  ['Ursa', 'ring'],
  ['Slug', 'gma'],
  ['Mag', 'cargo'],
  ['Swi', 'nub'],
  ['Pilo', 'swine'],
  ['Cor', 'sola'],
  ['Remo', 'raid'],
  ['Octi', 'llery'],
  ['Deli', 'bird'],
  ['Man', 'tine'],
  ['Skar', 'mory'],
  ['Houn', 'dour'],
  ['Houn', 'doom'],
  ['King', 'dra'],
  ['Phan', 'py'],
  ['Don', 'phan'],
  ['Pory', 'gon2'],
  ['Stan', 'tler'],
  ['Smear', 'gle'],
  ['Ty', 'rogue'],
  ['Hitmon', 'top'],
  ['Smoo', 'chum'],
  ['Ele', 'kid'],
  ['Mag', 'by'],
  ['Mil', 'tank'],
  ['Blis', 'sey'],
  ['Rai', 'kou'],
  ['En', 'tei'],
  ['Sui', 'cune'],
  ['Larvi', 'tar'],
  ['Pupi', 'tar'],
  ['Tyran', 'itar'],
  ['Lu', 'gia'],
  ['Ho-', 'oh'],
  ['Cele', 'bi'],
  ['Azu', 'rill'],
  ['Wy', 'naut'],
  ['Ambi', 'pom'],
  ['Mis', 'magius'],
  ['Honch', 'krow'],
  ['Bon', 'sly'],
  ['Mime', ' Jr.'],
  ['Happi', 'piny'],
  ['Munch', 'lax'],
  ['Man', 'tyke'],
  ['Weav', 'vile'],
  ['Magne', 'zone'],
  ['Licki', 'licky'],
  ['Rhy', 'perior'],
  ['Tan', 'growth'],
  ['Electi', 'vire'],
  ['Magmor', 'mortar'],
  ['Toge', 'kiss'],
  ['Yan', 'mega'],
  ['Leaf', 'feon'],
  ['Glace', 'ceon'],
  ['Glis', 'cor'],
  ['Mamo', 'swine'],
  ['Pory', 'gon-Z'],
  ['Tree', 'cko'],
  ['Gro', 'vyle'],
  ['Scep', 'tile'],
  ['Torch', 'chic'],
  ['Com', 'busken'],
  ['Bla', 'ziken'],
  ['Mud', 'kip'],
  ['Marsh', 'tomp'],
  ['Swamp', 'pert'],
  ['Ral', 'ts'],
  ['Kir', 'lia'],
  ['Garde', 'voir'],
  ['Gall', 'lade'],
  ['Shed', 'inja'],
  ['Kec', 'eon'],
  ['Bel', 'dum'],
  ['Met', 'tang'],
  ['Meta', 'gross'],
  ['Bi', 'doof'],
  ['Spiri', 'tomb'],
  ['Luca', 'cario'],
  ['Gib', 'ble'],
  ['Gab', 'bite'],
  ['Gar', 'chomp'],
  ['Maw', 'wile'],
  ['Lil', 'leep'],
  ['Crad', 'dily'],
  ['Ano', 'rith'],
  ['Arm', 'aldo'],
  ['Cran', 'idos'],
  ['Ram', 'pardos'],
  ['Shiel', 'don'],
  ['Bastio', 'don'],
  ['Sla', 'king'],
  ['Ab', 'sol'],
  ['Dus', 'skull'],
  ['Dusc', 'clops'],
  ['Dusk', 'noir'],
  ['Wail', 'lord'],
  ['Arc', 'ceus'],
  ['Tur', 'wig'],
  ['Gro', 'tle'],
  ['Tor', 'terra'],
  ['Chim', 'char'],
  ['Mon', 'ferno'],
  ['Infer', 'nape'],
  ['Pip', 'lup'],
  ['Prin', 'plup'],
  ['Empo', 'leon'],
  ['Nose', 'pass'],
  ['Probo', 'pass'],
  ['Hon', 'edge'],
  ['Doub', 'blade'],
  ['Aegi', 'slash'],
  ['Pawn', 'iard'],
  ['Bi', 'sharp'],
  ['Lux', 'ray'],
  ['Agg', 'gron'],
  ['Fly', 'gon'],
  ['Milo', 'tic'],
  ['Sala', 'mence'],
  ['Klink', 'klang'],
  ['Zoro', 'ark'],
  ['Syl', 'veon'],
  ['Kyo', 'ogre'],
  ['Grou', 'don'],
  ['Ray', 'quaza'],
  ['Dial', 'alga'],
  ['Palk', 'kia'],
  ['Gira', 'tina'],
  ['Regi', 'gigas'],
  ['Dark', 'rai'],
  ['Gene', 'esect'],
  ['Reshi', 'ram'],
  ['Zek', 'rom'],
  ['Kyu', 'rem'],
  ['Rose', 'rade'],
  ['Drifb', 'blim'],
  ['Lop', 'punny'],
  ['Bre', 'loom'],
  ['Nin', 'jask'],
  ['Ban', 'nette'],
  ['Ro', 'tom'],
  ['Reuni', 'niclus'],
  ['Whimsi', 'cott'],
  ['Krooko', 'dile'],
  ['Cofa', 'grigus'],
  ['Galvan', 'tula'],
  ['Ferro', 'thorn'],
  ['Lit', 'wick'],
  ['Lamp', 'pent'],
  ['Chandel', 'lure'],
  ['Hax', 'xorus'],
  ['Golu', 'lurk'],
  ['Pyuku', 'muku'],
  ['Klef', 'ki'],
  ['Talon', 'flame'],
  ['Mimi', 'kyu'],
  ['Volca', 'rona'],
  ['Dei', 'no'],
  ['Zwei', 'lous'],
  ['Hy', 'dreigon'],
  ['La', 'tias'],
  ['La', 'tios'],
  ['Deo', 'xys'],
  ['Ji', 'rachi'],
  ['Nin', 'cada'],
  ['Bi', 'barel'],
  ['Rio', 'olu'],
  ['Sla', 'koth'],
  ['Vigo', 'roth'],
  ['Wail', 'mer'],
  ['Shi', 'nx'],
  ['Lu', 'xio'],
  ['Ar', 'on'],
  ['Lair', 'ron'],
  ['Trap', 'inch'],
  ['Vibra', 'va'],
  ['Fee', 'bas'],
  ['Ba', 'agon'],
  ['Shel', 'elgon'],
  ['Kli', 'ink'],
  ['Kla', 'ang'],
  ['Zo', 'rua'],
  ['Bu', 'dew'],
  ['Rose', 'elia'],
  ['Drifl', 'loon'],
  ['Bun', 'eary'],
  ['Shroom', 'ish'],
  ['Shup', 'pet'],
  ['Solo', 'sis'],
  ['Duo', 'sion'],
  ['Cotton', 'onee'],
  ['Sandi', 'ile'],
  ['Kroko', 'rok'],
  ['Ya', 'mask'],
  ['Jol', 'tik'],
  ['Ferro', 'seed'],
  ['Axe', 'xew'],
  ['Frax', 'xure'],
  ['Gole', 'olett'],
  ['Fletch', 'ling'],
  ['Fletch', 'inder'],
  ['Larv', 'esta'],
  ['Stun', 'fisk'],
  ['Sabl', 'eye'],
  ['Veni', 'pede'],
  ['Whirli', 'pede'],
  ['Scoli', 'pede'],
  ['Ty', 'runt'],
  ['Tyran', 'trum'],
  ['Sno', 'runt'],
  ['Gla', 'lie'],
  ['Fros', 'lass'],
  ['Ori', 'corio'],
  ['Trub', 'bish'],
  ['Garb', 'odor'],
  ['Car', 'vanha'],
  ['Sharp', 'edo'],
  ['Phant', 'tump'],
  ['Tre', 'venant'],
  ['Noi', 'bat'],
  ['Noi', 'vern'],
  ['Swab', 'lu'],
  ['Alta', 'ria'],
  ['Goo', 'my'],
  ['Sli', 'goo'],
  ['Goo', 'dra'],
  ['Regi', 'rock'],
  ['Regi', 'ice'],
  ['Regi', 'steel'],
  ['Necro', 'zma'],
  ['Stuff', 'ful'],
  ['Be', 'wear'],
  ['Dhel', 'mise'],
  ['Mar', 'eanie'],
  ['Tox', 'apex'],
  ['Hawl', 'lucha'],
  ['Cac', 'nea'],
  ['Cact', 'turne'],
  ['Sandy', 'gast'],
  ['Palo', 'sand'],
  ['Ama', 'aura'],
  ['Auro', 'rorus'],
  ['Rock', 'ruff'],
  ['Lycan', 'roc'],
  ['Melo', 'etta'],
  ['Cress', 'selia'],
  ['Brux', 'ish'],
  ['Jang', 'mo-o'],
  ['Haka', 'mo-o'],
  ['Kom', 'mo-o'],
  ['Wim', 'pod'],
  ['Goli', 'sopod'],
  ['Fo', 'mantis'],
  ['Lu', 'rantis'],
  ['Car', 'bink'],
  ['Ches', 'pin'],
  ['Quil', 'ladin'],
  ['Ches', 'naught'],
  ['Fenne', 'kin'],
  ['Brai', 'xen'],
  ['Del', 'phox'],
  ['Froa', 'kie'],
  ['Frog', 'adier'],
  ['Gre', 'ninja'],
  ['Tor', 'koal'],
  ['Pump', 'kaboo'],
  ['Gour', 'geist'],
  ['Swir', 'lix'],
  ['Slur', 'puff'],
  ['Scra', 'ggy'],
  ['Scraf', 'ty'],
  ['Lo', 'tad'],
  ['Lom', 'bre'],
  ['Ludi', 'colo'],
  ['Mini', 'or'],
  ['Dian', 'cie'],
  ['Luv', 'disc'],
];

// Pokemon type data by ID for local type information
const POKEMON_TYPES = {
  1: ['GRASS', 'POISON'],
  2: ['GRASS', 'POISON'],
  3: ['GRASS', 'POISON'],
  4: ['FIRE'],
  5: ['FIRE'],
  6: ['FIRE', 'FLYING'],
  7: ['WATER'],
  8: ['WATER'],
  9: ['WATER'],
  10: ['BUG'],
  11: ['BUG'],
  12: ['BUG', 'FLYING'],
  13: ['BUG', 'POISON'],
  14: ['BUG', 'POISON'],
  15: ['BUG', 'POISON'],
  16: ['NORMAL', 'FLYING'],
  17: ['NORMAL', 'FLYING'],
  18: ['NORMAL', 'FLYING'],
  19: ['NORMAL'],
  20: ['NORMAL'],
  21: ['NORMAL', 'FLYING'],
  22: ['NORMAL', 'FLYING'],
  23: ['POISON'],
  24: ['POISON'],
  25: ['ELECTRIC'],
  26: ['ELECTRIC'],
  27: ['GROUND'],
  28: ['GROUND'],
  29: ['POISON'],
  30: ['POISON'],
  31: ['POISON', 'GROUND'],
  32: ['POISON'],
  33: ['POISON'],
  34: ['POISON', 'GROUND'],
  35: ['FAIRY'],
  36: ['FAIRY'],
  37: ['FIRE'],
  38: ['FIRE'],
  39: ['NORMAL', 'FAIRY'],
  40: ['NORMAL', 'FAIRY'],
  41: ['POISON', 'FLYING'],
  42: ['POISON', 'FLYING'],
  43: ['GRASS', 'POISON'],
  44: ['GRASS', 'POISON'],
  45: ['GRASS', 'POISON'],
  46: ['BUG', 'GRASS'],
  47: ['BUG', 'GRASS'],
  48: ['BUG', 'POISON'],
  49: ['BUG', 'POISON'],
  50: ['GROUND'],
  51: ['GROUND'],
  52: ['NORMAL'],
  53: ['NORMAL'],
  54: ['WATER'],
  55: ['WATER'],
  56: ['FIGHTING'],
  57: ['FIGHTING'],
  58: ['FIRE'],
  59: ['FIRE'],
  60: ['WATER'],
  61: ['WATER'],
  62: ['WATER', 'FIGHTING'],
  63: ['PSYCHIC'],
  64: ['PSYCHIC'],
  65: ['PSYCHIC'],
  66: ['FIGHTING'],
  67: ['FIGHTING'],
  68: ['FIGHTING'],
  69: ['GRASS', 'POISON'],
  70: ['GRASS', 'POISON'],
  71: ['GRASS', 'POISON'],
  72: ['WATER', 'POISON'],
  73: ['WATER', 'POISON'],
  74: ['ROCK', 'GROUND'],
  75: ['ROCK', 'GROUND'],
  76: ['ROCK', 'GROUND'],
  77: ['FIRE'],
  78: ['FIRE'],
  79: ['WATER', 'PSYCHIC'],
  80: ['WATER', 'PSYCHIC'],
  81: ['STEEL', 'ELECTRIC'],
  82: ['STEEL', 'ELECTRIC'],
  83: ['NORMAL', 'FLYING'],
  84: ['NORMAL', 'FLYING'],
  85: ['NORMAL', 'FLYING'],
  86: ['WATER'],
  87: ['WATER', 'ICE'],
  88: ['POISON'],
  89: ['POISON'],
  90: ['WATER'],
  91: ['WATER', 'ICE'],
  92: ['GHOST', 'POISON'],
  93: ['GHOST', 'POISON'],
  94: ['GHOST', 'POISON'],
  95: ['ROCK', 'GROUND'],
  96: ['PSYCHIC'],
  97: ['PSYCHIC'],
  98: ['WATER'],
  99: ['WATER'],
  100: ['ELECTRIC'],
  101: ['ELECTRIC'],
  102: ['GRASS', 'PSYCHIC'],
  103: ['GRASS', 'PSYCHIC'],
  104: ['GROUND'],
  105: ['GROUND'],
  106: ['FIGHTING'],
  107: ['FIGHTING'],
  108: ['NORMAL'],
  109: ['POISON'],
  110: ['POISON'],
  111: ['GROUND', 'ROCK'],
  112: ['GROUND', 'ROCK'],
  113: ['NORMAL'],
  114: ['GRASS'],
  115: ['NORMAL'],
  116: ['WATER'],
  117: ['WATER'],
  118: ['WATER'],
  119: ['WATER'],
  120: ['WATER'],
  121: ['WATER', 'PSYCHIC'],
  122: ['PSYCHIC', 'FAIRY'],
  123: ['BUG', 'FLYING'],
  124: ['ICE', 'PSYCHIC'],
  125: ['ELECTRIC'],
  126: ['FIRE'],
  127: ['BUG'],
  128: ['NORMAL'],
  129: ['WATER'],
  130: ['WATER', 'FLYING'],
  131: ['WATER', 'ICE'],
  132: ['NORMAL'],
  133: ['NORMAL'],
  134: ['WATER'],
  135: ['ELECTRIC'],
  136: ['FIRE'],
  137: ['NORMAL'],
  138: ['ROCK', 'WATER'],
  139: ['ROCK', 'WATER'],
  140: ['ROCK', 'WATER'],
  141: ['ROCK', 'WATER'],
  142: ['ROCK', 'FLYING'],
  143: ['NORMAL'],
  144: ['ICE', 'FLYING'],
  145: ['ELECTRIC', 'FLYING'],
  146: ['FIRE', 'FLYING'],
  147: ['DRAGON'],
  148: ['DRAGON'],
  149: ['DRAGON', 'FLYING'],
  150: ['PSYCHIC'],
  151: ['PSYCHIC'],
  152: ['GRASS'],
  153: ['GRASS'],
  154: ['GRASS'],
  155: ['FIRE'],
  156: ['FIRE'],
  157: ['FIRE'],
  158: ['WATER'],
  159: ['WATER'],
  160: ['WATER'],
  161: ['NORMAL'],
  162: ['NORMAL'],
  163: ['NORMAL', 'FLYING'],
  164: ['NORMAL', 'FLYING'],
  165: ['BUG', 'FLYING'],
  166: ['BUG', 'FLYING'],
  167: ['BUG', 'POISON'],
  168: ['BUG', 'POISON'],
  169: ['POISON', 'FLYING'],
  170: ['WATER', 'ELECTRIC'],
  171: ['WATER', 'ELECTRIC'],
  172: ['ELECTRIC'],
  173: ['FAIRY'],
  174: ['NORMAL', 'FAIRY'],
  175: ['FAIRY'],
  176: ['FAIRY', 'FLYING'],
  177: ['PSYCHIC', 'FLYING'],
  178: ['PSYCHIC', 'FLYING'],
  179: ['ELECTRIC'],
  180: ['ELECTRIC'],
  181: ['ELECTRIC'],
  182: ['GRASS'],
  183: ['WATER', 'FAIRY'],
  184: ['WATER', 'FAIRY'],
  185: ['ROCK'],
  186: ['WATER'],
  187: ['GRASS', 'FLYING'],
  188: ['GRASS', 'FLYING'],
  189: ['GRASS', 'FLYING'],
  190: ['NORMAL'],
  191: ['GRASS'],
  192: ['GRASS'],
  193: ['BUG', 'FLYING'],
  194: ['WATER', 'GROUND'],
  195: ['WATER', 'GROUND'],
  196: ['PSYCHIC'],
  197: ['DARK'],
  198: ['DARK', 'FLYING'],
  199: ['WATER', 'PSYCHIC'],
  200: ['GHOST'],
  201: ['PSYCHIC'],
  202: ['PSYCHIC'],
  203: ['NORMAL', 'PSYCHIC'],
  204: ['BUG'],
  205: ['BUG', 'STEEL'],
  206: ['NORMAL'],
  207: ['GROUND', 'FLYING'],
  208: ['STEEL', 'GROUND'],
  209: ['FAIRY'],
  210: ['FAIRY'],
  211: ['WATER', 'POISON'],
  212: ['BUG', 'STEEL'],
  213: ['BUG', 'ROCK'],
  214: ['BUG', 'FIGHTING'],
  215: ['DARK', 'ICE'],
  216: ['NORMAL'],
  217: ['NORMAL'],
  218: ['FIRE'],
  219: ['FIRE', 'ROCK'],
  220: ['ICE', 'GROUND'],
  221: ['ICE', 'GROUND'],
  222: ['WATER', 'ROCK'],
  223: ['WATER'],
  224: ['WATER'],
  225: ['ICE', 'FLYING'],
  226: ['WATER', 'FLYING'],
  227: ['STEEL', 'FLYING'],
  228: ['DARK', 'FIRE'],
  229: ['DARK', 'FIRE'],
  230: ['WATER', 'DRAGON'],
  231: ['GROUND'],
  232: ['GROUND'],
  233: ['NORMAL'],
  234: ['NORMAL'],
  235: ['NORMAL'],
  236: ['FIGHTING'],
  237: ['FIGHTING'],
  238: ['ICE', 'PSYCHIC'],
  239: ['ELECTRIC'],
  240: ['FIRE'],
  241: ['NORMAL'],
  242: ['NORMAL'],
  243: ['ELECTRIC'],
  244: ['FIRE'],
  245: ['WATER'],
  246: ['ROCK', 'GROUND'],
  247: ['ROCK', 'GROUND'],
  248: ['ROCK', 'DARK'],
  249: ['PSYCHIC', 'FLYING'],
  250: ['FIRE', 'FLYING'],
  251: ['PSYCHIC', 'GRASS'],
  252: ['NORMAL', 'FAIRY'],
  253: ['PSYCHIC'],
  254: ['NORMAL'],
  255: ['GHOST'],
  256: ['DARK', 'FLYING'],
  257: ['ROCK'],
  258: ['PSYCHIC', 'FAIRY'],
  259: ['NORMAL'],
  260: ['NORMAL'],
  261: ['WATER', 'FLYING'],
  262: ['DARK', 'ICE'],
  263: ['STEEL', 'ELECTRIC'],
  264: ['NORMAL'],
  265: ['GROUND', 'ROCK'],
  266: ['GRASS'],
  267: ['ELECTRIC'],
  268: ['FIRE'],
  269: ['FAIRY', 'FLYING'],
  270: ['BUG', 'FLYING'],
  271: ['GRASS'],
  272: ['ICE'],
  273: ['GROUND', 'FLYING'],
  274: ['ICE', 'GROUND'],
  275: ['NORMAL'],
  276: ['GRASS'],
  277: ['GRASS'],
  278: ['GRASS'],
  279: ['FIRE'],
  280: ['FIRE', 'FIGHTING'],
  281: ['FIRE', 'FIGHTING'],
  282: ['WATER'],
  283: ['WATER', 'GROUND'],
  284: ['WATER', 'GROUND'],
  285: ['PSYCHIC', 'FAIRY'],
  286: ['PSYCHIC', 'FAIRY'],
  287: ['PSYCHIC', 'FAIRY'],
  288: ['PSYCHIC', 'FIGHTING'],
  289: ['BUG', 'GHOST'],
  290: ['NORMAL'],
  291: ['STEEL', 'PSYCHIC'],
  292: ['STEEL', 'PSYCHIC'],
  293: ['STEEL', 'PSYCHIC'],
  294: ['NORMAL'],
  295: ['DARK', 'GHOST'],
  296: ['FIGHTING', 'STEEL'],
  297: ['DRAGON', 'GROUND'],
  298: ['DRAGON', 'GROUND'],
  299: ['DRAGON', 'GROUND'],
  300: ['STEEL', 'FAIRY'],
  301: ['ROCK', 'GRASS'],
  302: ['ROCK', 'GRASS'],
  303: ['ROCK', 'BUG'],
  304: ['ROCK', 'BUG'],
  305: ['ROCK'],
  306: ['ROCK'],
  307: ['ROCK', 'STEEL'],
  308: ['ROCK', 'STEEL'],
  309: ['NORMAL'],
  310: ['DARK'],
  311: ['GHOST'],
  312: ['GHOST'],
  313: ['GHOST'],
  314: ['WATER'],
  315: ['NORMAL'],
  316: ['GRASS'],
  317: ['GRASS'],
  318: ['GRASS', 'GROUND'],
  319: ['FIRE'],
  320: ['FIRE', 'FIGHTING'],
  321: ['FIRE', 'FIGHTING'],
  322: ['WATER'],
  323: ['WATER'],
  324: ['WATER', 'STEEL'],
  325: ['ROCK'],
  326: ['ROCK', 'STEEL'],
  327: ['STEEL', 'GHOST'],
  328: ['STEEL', 'GHOST'],
  329: ['STEEL', 'GHOST'],
  330: ['DARK', 'STEEL'],
  331: ['DARK', 'STEEL'],
  332: ['ELECTRIC'],
  333: ['STEEL', 'ROCK'],
  334: ['GROUND', 'DRAGON'],
  335: ['WATER'],
  336: ['DRAGON', 'FLYING'],
  337: ['STEEL'],
  338: ['DARK'],
  339: ['FAIRY'],
  340: ['WATER'],
  341: ['GROUND'],
  342: ['DRAGON', 'FLYING'],
  343: ['STEEL', 'DRAGON'],
  344: ['WATER', 'DRAGON'],
  345: ['GHOST', 'DRAGON'],
  346: ['NORMAL'],
  347: ['DARK'],
  348: ['BUG', 'STEEL'],
  349: ['DRAGON', 'FIRE'],
  350: ['DRAGON', 'ELECTRIC'],
  351: ['DRAGON', 'ICE'],
  352: ['GRASS', 'POISON'],
  353: ['GHOST', 'FLYING'],
  354: ['NORMAL'],
  355: ['GRASS', 'FIGHTING'],
  356: ['BUG', 'FLYING'],
  357: ['GHOST'],
  358: ['ELECTRIC', 'GHOST'],
  359: ['PSYCHIC'],
  360: ['GRASS', 'FAIRY'],
  361: ['GROUND', 'DARK'],
  362: ['GHOST'],
  363: ['BUG', 'ELECTRIC'],
  364: ['STEEL', 'GRASS'],
  365: ['GHOST', 'FIRE'],
  366: ['GHOST', 'FIRE'],
  367: ['GHOST', 'FIRE'],
  368: ['DRAGON'],
  369: ['GROUND', 'GHOST'],
  370: ['WATER'],
  371: ['STEEL', 'FAIRY'],
  372: ['FIRE', 'FLYING'],
  373: ['GHOST', 'FAIRY'],
  374: ['BUG', 'FIRE'],
  375: ['DARK', 'DRAGON'],
  376: ['DARK', 'DRAGON'],
  377: ['DARK', 'DRAGON'],
  378: ['DRAGON', 'PSYCHIC'],
  379: ['DRAGON', 'PSYCHIC'],
  380: ['PSYCHIC'],
  381: ['STEEL', 'PSYCHIC'],
  382: ['BUG', 'GROUND'],
  383: ['NORMAL', 'WATER'],
  384: ['FIGHTING'],
  385: ['NORMAL'],
  386: ['NORMAL'],
  387: ['WATER'],
  388: ['ELECTRIC'],
  389: ['ELECTRIC'],
  390: ['STEEL', 'ROCK'],
  391: ['STEEL', 'ROCK'],
  392: ['GROUND'],
  393: ['GROUND', 'DRAGON'],
  394: ['WATER'],
  395: ['DRAGON'],
  396: ['DRAGON'],
  397: ['STEEL'],
  398: ['STEEL'],
  399: ['DARK'],
  400: ['GRASS', 'POISON'],
  401: ['GRASS', 'POISON'],
  402: ['GHOST', 'FLYING'],
  403: ['NORMAL'],
  404: ['GRASS'],
  405: ['GHOST'],
  406: ['PSYCHIC'],
  407: ['PSYCHIC'],
  408: ['GRASS', 'FAIRY'],
  409: ['GROUND', 'DARK'],
  410: ['GROUND', 'DARK'],
  411: ['GHOST'],
  412: ['BUG', 'ELECTRIC'],
  413: ['STEEL', 'GRASS'],
  414: ['DRAGON'],
  415: ['DRAGON'],
  416: ['GROUND', 'GHOST'],
  417: ['NORMAL', 'FLYING'],
  418: ['FIRE', 'FLYING'],
  419: ['BUG', 'FIRE'],
  420: ['GROUND', 'ELECTRIC'],
  421: ['DARK', 'GHOST'],
  422: ['BUG', 'POISON'],
  423: ['BUG', 'POISON'],
  424: ['BUG', 'POISON'],
  425: ['ROCK', 'DRAGON'],
  426: ['ROCK', 'DRAGON'],
  427: ['ICE'],
  428: ['ICE'],
  429: ['ICE', 'GHOST'],
  430: ['FIRE', 'FLYING'],
  431: ['POISON'],
  432: ['POISON'],
  433: ['WATER', 'DARK'],
  434: ['WATER', 'DARK'],
  435: ['GRASS', 'GHOST'],
  436: ['GRASS', 'GHOST'],
  437: ['FLYING', 'DRAGON'],
  438: ['FLYING', 'DRAGON'],
  439: ['NORMAL', 'FLYING'],
  440: ['DRAGON', 'FLYING'],
  441: ['DRAGON'],
  442: ['DRAGON'],
  443: ['DRAGON'],
  444: ['ROCK'],
  445: ['ICE'],
  446: ['STEEL'],
  447: ['PSYCHIC'],
  448: ['NORMAL', 'FIGHTING'],
  449: ['NORMAL', 'FIGHTING'],
  450: ['GHOST', 'GRASS'],
  451: ['POISON', 'WATER'],
  452: ['POISON', 'WATER'],
  453: ['FIGHTING', 'FLYING'],
  454: ['GRASS'],
  455: ['GRASS', 'DARK'],
  456: ['GROUND', 'GHOST'],
  457: ['GROUND', 'GHOST'],
  458: ['ROCK', 'ICE'],
  459: ['ROCK', 'ICE'],
  460: ['ROCK'],
  461: ['ROCK'],
  462: ['ROCK'],
  463: ['NORMAL', 'PSYCHIC'],
  464: ['NORMAL', 'FIGHTING'],
  465: ['PSYCHIC'],
  466: ['WATER', 'PSYCHIC'],
  467: ['PSYCHIC', 'DRAGON'],
  468: ['DRAGON'],
  469: ['DRAGON', 'FIGHTING'],
  470: ['DRAGON', 'FIGHTING'],
  471: ['BUG', 'WATER'],
  472: ['BUG', 'WATER'],
  473: ['GRASS'],
  474: ['GRASS'],
  475: ['ROCK', 'FAIRY'],
  476: ['GRASS'],
  477: ['GRASS'],
  478: ['GRASS', 'FIGHTING'],
  479: ['FIRE'],
  480: ['FIRE'],
  481: ['FIRE', 'PSYCHIC'],
  482: ['WATER'],
  483: ['WATER'],
  484: ['WATER', 'DARK'],
  485: ['FIRE'],
  486: ['GHOST', 'GRASS'],
  487: ['GHOST', 'GRASS'],
  488: ['FAIRY'],
  489: ['FAIRY'],
  490: ['DARK', 'FIGHTING'],
  491: ['DARK', 'FIGHTING'],
  492: ['WATER', 'GRASS'],
  493: ['WATER', 'GRASS'],
  494: ['WATER', 'GRASS'],
  495: ['ROCK', 'FLYING'],
  496: ['ROCK', 'FLYING'],
  497: ['ROCK', 'FAIRY'],
  498: ['WATER'],
  499: ['WATER'],
  500: ['WATER'],
  501: ['WATER'],
};

// Generate full Pokemon names list from split names for compatibility
const POKEMON_NAMES = POKEMON_SPLIT_NAMES.slice(1).map(parts => parts.join(''));

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

    const fusion = await getFusion({
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
    console.error('[REST API] Error getting types:', error.message);
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
    console.log('[REST API] Request for Pokemon list');
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
    console.error('[REST API] Error getting Pokemon list:', error.message);
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
    console.log('[REST API] Request for Pokemon type data');
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
    console.error('[REST API] Error getting Pokemon types:', error.message);
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
    features: {
      'Local Data':
        'Uses optimized split-name approach with embedded Pokemon data',
      'Fast Generation': 'Minimal web scraping, most data generated locally',
      'Type Information': 'Complete type data included for all 501 Pokemon',
      'CDN Images': 'Direct links to fusion images via CDN',
    },
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
    performance: {
      'Pokemon Count': POKEMON_NAMES.length,
      'Data Source': 'Local split-name array with type mappings',
      'External Dependencies': 'Minimal - only for base64 image conversion',
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
};
