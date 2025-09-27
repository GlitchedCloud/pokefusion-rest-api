const { POKEMON_SPLIT_NAMES, POKEMON_NAMES } = require('../data/pokemon-names');
const { POKEMON_TYPES } = require('../data/pokemon-types');
const logger = require('../utils/logger');

/**
 * Pokemon service for handling Pokemon-related business logic
 */
class PokemonService {
  /**
   * Check if a Pokemon name is valid
   */
  static isValidPokemon(name) {
    if (!name || typeof name !== 'string') return false;
    return POKEMON_NAMES.some(
      pokemon => pokemon.toLowerCase() === name.toLowerCase()
    );
  }

  /**
   * Get a random Pokemon name
   */
  static getRandomPokemonName() {
    return POKEMON_NAMES[Math.floor(Math.random() * POKEMON_NAMES.length)];
  }

  /**
   * Normalize Pokemon name (find correct casing)
   */
  static normalizePokemonName(name) {
    if (!name || typeof name !== 'string') return null;
    const found = POKEMON_NAMES.find(
      pokemon => pokemon.toLowerCase() === name.toLowerCase()
    );
    return found || null;
  }

  /**
   * Get Pokemon index from name
   */
  static getPokemonIndex(name) {
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

  /**
   * Get all Pokemon names
   */
  static getAllPokemonNames() {
    return POKEMON_NAMES;
  }

  /**
   * Get Pokemon types by ID
   */
  static getPokemonTypes() {
    return POKEMON_TYPES;
  }
}

module.exports = PokemonService;
