const { POKEMON_SPLIT_NAMES } = require('../data/pokemon-names');
const { POKEMON_TYPES } = require('../data/pokemon-types');
const PokemonService = require('./pokemon.service');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Fusion service for handling Pokemon fusion logic
 */
class FusionService {
  /**
   * Generate a complete fusion with all data
   */
  static async generateFusion(options = {}) {
    try {
      // Get Pokemon names (specific or random)
      let headPokemon, bodyPokemon;

      if (
        options.headPokemon &&
        PokemonService.isValidPokemon(options.headPokemon)
      ) {
        headPokemon = options.headPokemon;
      } else {
        headPokemon = PokemonService.getRandomPokemonName();
      }

      if (
        options.bodyPokemon &&
        PokemonService.isValidPokemon(options.bodyPokemon)
      ) {
        bodyPokemon = options.bodyPokemon;
      } else {
        bodyPokemon = PokemonService.getRandomPokemonName();
      }

      // Get Pokemon indices for fusion generation
      const headIndex = PokemonService.getPokemonIndex(headPokemon);
      const bodyIndex = PokemonService.getPokemonIndex(bodyPokemon);

      logger.fusion(headPokemon, headIndex, bodyPokemon, bodyIndex);

      // Generate fusion name using split names approach
      const headParts = POKEMON_SPLIT_NAMES[headIndex];
      const bodyParts = POKEMON_SPLIT_NAMES[bodyIndex];
      const fusionName = `${headParts[0]}${bodyParts[1]}`;

      // Generate fusion image URL using CDN pattern
      const fusionImageUrl = `${config.externalUrls.fusionImageCdn}/${headIndex}/${headIndex}.${bodyIndex}.png`;

      // Get Pokemon types from local data (limit to 2 types max)
      const headTypes = POKEMON_TYPES[headIndex.toString()] || [];
      const bodyTypes = POKEMON_TYPES[bodyIndex.toString()] || [];
      const allTypes = [...headTypes, ...bodyTypes].slice(0, 2);

      // Convert types to the expected format with local server URLs
      const types = allTypes.map(type => ({
        name: type,
        imageUrl: `${config.server.url}/types/${type.toLowerCase()}.png`,
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

  /**
   * Get only Pokemon names from a fusion
   */
  static async getFusionNames(options = {}) {
    try {
      const fusion = await this.generateFusion({
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

  /**
   * Get only type information from a fusion
   */
  static async getFusionTypes(options = {}) {
    try {
      const fusion = await this.generateFusion({
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
}

module.exports = FusionService;
