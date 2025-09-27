const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');
const GameData = require('../data/GameData');

/**
 * Pokemon service for handling Pokemon-related business logic
 */
class PokemonService {
  static pokemonData = new Map(); // name -> pokemon object
  static pokemonById = new Map(); // id -> pokemon object
  static pokemonNames = []; // array of all names
  static pokemonTypes = new Map(); // id -> types array
  static splitNames = new Map(); // id -> split name array
  static isInitialized = false;

  // File path
  static FUSIONDEX_DATA_PATH = path.join(
    __dirname,
    '../data/infinite-fusion-graphics/fusiondex_data.json'
  );

  /**
   * Initialize Pokemon data cache on application startup
   * Should be called once during app initialization
   */
  static async initialize() {
    if (this.isInitialized) {
      logger.info('POKEMON_SERVICE', 'Already initialized');
      return;
    }

    logger.info('POKEMON_SERVICE', 'Initializing data cache...');
    const startTime = Date.now();

    try {
      // Load and parse the FusionDex JSON data
      const jsonData = await fs.readFile(this.FUSIONDEX_DATA_PATH, 'utf8');
      const fusionDexData = JSON.parse(jsonData);

      // Process each Pokemon entry
      for (const [name, data] of Object.entries(fusionDexData)) {
        const pokemonId = parseInt(data.id, 10);

        // Store in maps for fast lookup
        this.pokemonData.set(name.toLowerCase(), data);
        this.pokemonById.set(pokemonId, data);

        // Build names array
        this.pokemonNames.push(data.fullName);

        // Store types
        this.pokemonTypes.set(pokemonId, data.types);

        // Store split names from GameData
        if (pokemonId < GameData.SPLIT_NAMES.length) {
          this.splitNames.set(pokemonId, GameData.SPLIT_NAMES[pokemonId]);
        } else {
          // Fallback for Pokemon beyond the split names array
          this.splitNames.set(pokemonId, [data.fullName, '']);
        }
      }

      // Sort names for consistency
      this.pokemonNames.sort();

      this.isInitialized = true;
      const duration = Date.now() - startTime;
      logger.info(
        'POKEMON_SERVICE',
        `Initialized successfully in ${duration}ms`
      );
      logger.info(
        'POKEMON_SERVICE',
        `Loaded ${this.pokemonData.size} Pokemon entries`
      );
    } catch (error) {
      logger.error('Failed to initialize Pokemon service:', error);
      throw error;
    }
  }

  /**
   * Refresh Pokemon data cache (call this when data changes)
   */
  static async refreshCache() {
    logger.info('POKEMON_SERVICE', 'Refreshing data cache...');
    this.pokemonData.clear();
    this.pokemonById.clear();
    this.pokemonNames.length = 0;
    this.pokemonTypes.clear();
    this.splitNames.clear();
    this.isInitialized = false;
    await this.initialize();
  }

  /**
   * Check if a Pokemon name is valid
   */
  static isValidPokemon(name) {
    if (!name || typeof name !== 'string') return false;
    if (!this.isInitialized) return false;
    return this.pokemonData.has(name.toLowerCase());
  }

  /**
   * Get a random Pokemon name
   */
  static getRandomPokemonName() {
    if (!this.isInitialized || this.pokemonNames.length === 0) return null;
    return this.pokemonNames[
      Math.floor(Math.random() * this.pokemonNames.length)
    ];
  }

  /**
   * Normalize Pokemon name (find correct casing)
   */
  static normalizePokemonName(name) {
    if (!name || typeof name !== 'string') return null;
    if (!this.isInitialized) return null;

    const pokemonData = this.pokemonData.get(name.toLowerCase());
    return pokemonData ? pokemonData.fullName : null;
  }

  /**
   * Get Pokemon index from name
   */
  static getPokemonIndex(name) {
    if (!name || typeof name !== 'string') return 0;
    if (!this.isInitialized) return 0;

    const pokemonData = this.pokemonData.get(name.toLowerCase());
    return pokemonData ? parseInt(pokemonData.id, 10) : 0;
  }

  /**
   * Get all Pokemon names
   */
  static getAllPokemonNames() {
    if (!this.isInitialized) return [];
    return [...this.pokemonNames]; // Return copy to prevent modification
  }

  /**
   * Get Pokemon types by ID
   */
  static getPokemonTypes(pokemonId) {
    if (!this.isInitialized) return [];
    return this.pokemonTypes.get(pokemonId) || [];
  }

  /**
   * Get all Pokemon types mapping
   */
  static getAllPokemonTypes() {
    if (!this.isInitialized) return new Map();
    return new Map(this.pokemonTypes); // Return copy to prevent modification
  }

  /**
   * Get Pokemon data by name
   */
  static getPokemonByName(name) {
    if (!name || typeof name !== 'string' || !this.isInitialized) return null;
    return this.pokemonData.get(name.toLowerCase()) || null;
  }

  /**
   * Get Pokemon data by ID
   */
  static getPokemonById(id) {
    if (!id || !this.isInitialized) return null;
    const pokemonId = typeof id === 'string' ? parseInt(id, 10) : id;
    return this.pokemonById.get(pokemonId) || null;
  }

  /**
   * Get Pokemon split names for fusion logic
   */
  static getPokemonSplitNames(pokemonId) {
    if (!pokemonId || !this.isInitialized) return [];
    return this.splitNames.get(pokemonId) || [];
  }
}

module.exports = PokemonService;
