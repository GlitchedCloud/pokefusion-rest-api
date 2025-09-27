const config = require('../config');
const PokemonService = require('../services/pokemon.service');
const logger = require('../utils/logger');

/**
 * Controller for Pokemon-related API endpoints
 */
class PokemonController {
  /**
   * GET /api/pokemon - Get all Pokemon names
   */
  static async getAllPokemon(req, res) {
    try {
      logger.apiRequest('Pokemon list');
      const startTime = Date.now();

      const pokemonList = PokemonService.getAllPokemonNames();
      const duration = Date.now() - startTime;

      res.json({
        success: true,
        data: {
          pokemon: pokemonList,
          count: pokemonList.length,
        },
        processingTime: `${duration}ms`,
      });
    } catch (error) {
      logger.error('API', 'Error getting Pokemon list:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to get Pokemon list',
        ...(config.server.environment !== 'production' && {
          details: error.message,
        }),
      });
    }
  }

  /**
   * GET /api/pokemon/types - Get all Pokemon type data
   */
  static async getPokemonTypes(req, res) {
    try {
      logger.apiRequest('Pokemon type data');
      const startTime = Date.now();

      const typesData = PokemonService.getPokemonTypes();
      const duration = Date.now() - startTime;

      res.json({
        success: true,
        data: typesData,
        processingTime: `${duration}ms`,
      });
    } catch (error) {
      logger.error('API', 'Error getting Pokemon types:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to get Pokemon types',
        ...(config.server.environment !== 'production' && {
          details: error.message,
        }),
      });
    }
  }
}

module.exports = PokemonController;
