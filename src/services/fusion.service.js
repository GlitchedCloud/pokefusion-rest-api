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
  static async generateFusion (options = {}) {
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

      // Generate fusion name using GameData split names
      const headParts = PokemonService.getPokemonSplitNames(headIndex) || [
        headPokemon,
        ''
      ];
      const bodyParts = PokemonService.getPokemonSplitNames(bodyIndex) || [
        '',
        bodyPokemon
      ];

      // Take head from first part of head Pokemon, body from second part of body Pokemon
      const fusionName = `${headParts[0]}${bodyParts[1] || bodyParts[0]}`;

      // Generate fusion image URL
      const fusionImageUrl = `${config.server.url}/api/images/fusion/${headIndex}/${bodyIndex}`;

      // Get Pokemon types from service (limit to 2 types max)
      const headTypes = PokemonService.getPokemonTypes(headIndex) || [];
      const bodyTypes = PokemonService.getPokemonTypes(bodyIndex) || [];
      const allTypes = [...headTypes, ...bodyTypes].slice(0, 2);

      // Convert types to the expected format with internal proxy URLs
      const types = allTypes.map(type => ({
        name: type,
        imageUrl: `${config.server.url}/api/images/types/${type.toLowerCase()}`
      }));

      // Create base fusion data
      const fusionData = {
        leftPkmnIndex: headIndex,
        rightPkmnIndex: bodyIndex,
        fusionName,
        fusionImageUrl,
        leftPokemonName: headPokemon,
        rightPokemonName: bodyPokemon,
        types
      };

      logger.fusionComplete();
      return {
        ...fusionData,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('FUSION', 'Error generating fusion:', error.message);
      throw new Error(`Failed to generate fusion: ${error.message}`);
    }
  }

  /**
   * Get only Pokemon names from a fusion
   */
  static async getFusionNames (options = {}) {
    try {
      const fusion = await this.generateFusion({
        headPokemon: options.headPokemon,
        bodyPokemon: options.bodyPokemon
      });
      return {
        fusionName: fusion.fusionName,
        leftPokemonName: fusion.leftPokemonName,
        rightPokemonName: fusion.rightPokemonName
      };
    } catch (error) {
      logger.error('FUSION', 'Error getting names:', error.message);
      throw error;
    }
  }

  /**
   * Get only type information from a fusion
   */
  static async getFusionTypes (options = {}) {
    try {
      const fusion = await this.generateFusion({
        headPokemon: options.headPokemon,
        bodyPokemon: options.bodyPokemon
      });
      return {
        types: fusion.types,
        fusion: {
          firstType: fusion.types[0]?.imageUrl || '',
          secondType: fusion.types[1]?.imageUrl || ''
        }
      };
    } catch (error) {
      logger.error('FUSION', 'Error getting types:', error.message);
      throw error;
    }
  }
}

module.exports = FusionService;
