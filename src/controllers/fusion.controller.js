const FusionService = require('../services/fusion.service');
const PokemonService = require('../services/pokemon.service');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Controller for fusion-related API endpoints
 */
class FusionController {
  /**
   * Normalized method to handle query parameter validation and service calls
   */
  static async handleFusionRequest (req, res, serviceMethod, logContext) {
    try {
      logger.apiRequest(logContext);
      const startTime = Date.now();

      // Extract and validate query parameters
      const { head, body } = req.query;
      let headPokemon = null;
      let bodyPokemon = null;

      if (head) {
        headPokemon = PokemonService.normalizePokemonName(head);
        if (!headPokemon) {
          return res.status(400).json({
            success: false,
            error: `Invalid head Pokemon: ${head}. Use GET /api/pokemon to see available Pokemon.`
          });
        }
      }

      if (body) {
        bodyPokemon = PokemonService.normalizePokemonName(body);
        if (!bodyPokemon) {
          return res.status(400).json({
            success: false,
            error: `Invalid body Pokemon: ${body}. Use GET /api/pokemon to see available Pokemon.`
          });
        }
      }

      // Call the appropriate service method
      const result = await serviceMethod({ headPokemon, bodyPokemon });
      const duration = Date.now() - startTime;

      logger.apiResponse(logContext, duration);

      res.json({
        success: true,
        data: result,
        processingTime: `${duration}ms`
      });
    } catch (error) {
      logger.error('API', `Error in ${logContext}:`, error.message);
      res.status(500).json({
        success: false,
        error: `Failed to get ${logContext}`,
        ...(config.server.environment !== 'production' && {
          details: error.message
        })
      });
    }
  }

  /**
   * GET /api/fusion - Get a fusion with all data
   */
  static async getFusion (req, res) {
    return FusionController.handleFusionRequest(
      req,
      res,
      FusionService.generateFusion,
      'complete fusion data'
    );
  }

  /**
   * GET /api/fusion/names - Get only Pokémon names
   */
  static async getFusionNames (req, res) {
    return FusionController.handleFusionRequest(
      req,
      res,
      FusionService.getFusionNames,
      'fusion names'
    );
  }

  /**
   * GET /api/fusion/types - Get only type information
   */
  static async getFusionTypes (req, res) {
    return FusionController.handleFusionRequest(
      req,
      res,
      FusionService.getFusionTypes,
      'fusion types'
    );
  }

  /**
   * GET /api/fusion/stats - Get only fusion stats
   */
  static async getFusionStats (req, res) {
    return FusionController.handleFusionRequest(
      req,
      res,
      FusionService.getFusionStats,
      'fusion stats'
    );
  }

  /**
   * GET /api/fusion/pokedex - Get only Pokedex entry (supports query parameters)
   */
  static async getFusionPokedex (req, res) {
    return FusionController.handleFusionRequest(
      req,
      res,
      FusionService.getFusionPokedex,
      'fusion pokedex'
    );
  }
}

module.exports = FusionController;
