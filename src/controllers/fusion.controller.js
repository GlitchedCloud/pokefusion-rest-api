const FusionService = require('../services/fusion.service');
const PokemonService = require('../services/pokemon.service');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Controller for fusion-related API endpoints
 */
class FusionController {
  /**
   * GET /api/fusion - Get a fusion with all data
   */
  static async getFusion(req, res) {
    try {
      logger.apiRequest('complete fusion data');
      const startTime = Date.now();

      // Extract query parameters for specific Pokemon
      const { head, body } = req.query;

      // Validate Pokemon names if provided
      let headPokemon = null,
        bodyPokemon = null;

      if (head) {
        headPokemon = PokemonService.normalizePokemonName(head);
        if (!headPokemon) {
          return res.status(400).json({
            success: false,
            error: `Invalid head Pokemon: ${head}. Use GET /api/pokemon to see available Pokemon.`,
          });
        }
      }

      if (body) {
        bodyPokemon = PokemonService.normalizePokemonName(body);
        if (!bodyPokemon) {
          return res.status(400).json({
            success: false,
            error: `Invalid body Pokemon: ${body}. Use GET /api/pokemon to see available Pokemon.`,
          });
        }
      }

      const fusion = await FusionService.generateFusion({
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
        ...(config.server.environment !== 'production' && {
          details: error.message,
        }),
      });
    }
  }

  /**
   * GET /api/fusion/names - Get only Pokémon names
   */
  static async getFusionNames(req, res) {
    try {
      logger.apiRequest('Pokémon names');
      const startTime = Date.now();

      // Extract and validate query parameters
      const { head, body } = req.query;
      let headPokemon = null,
        bodyPokemon = null;

      if (head) {
        headPokemon = PokemonService.normalizePokemonName(head);
        if (!headPokemon) {
          return res.status(400).json({
            success: false,
            error: `Invalid head Pokemon: ${head}`,
          });
        }
      }

      if (body) {
        bodyPokemon = PokemonService.normalizePokemonName(body);
        if (!bodyPokemon) {
          return res.status(400).json({
            success: false,
            error: `Invalid body Pokemon: ${body}`,
          });
        }
      }

      const names = await FusionService.getFusionNames({
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
        ...(config.server.environment !== 'production' && {
          details: error.message,
        }),
      });
    }
  }

  /**
   * GET /api/fusion/types - Get only type information
   */
  static async getFusionTypes(req, res) {
    try {
      const { head, body } = req.query;
      let headPokemon = null,
        bodyPokemon = null;

      if (head) {
        const normalizedHead = PokemonService.normalizePokemonName(head);
        if (!normalizedHead) {
          return res.status(400).json({
            success: false,
            error: `Invalid head Pokemon: ${head}`,
          });
        }
        headPokemon = normalizedHead;
      }

      if (body) {
        const normalizedBody = PokemonService.normalizePokemonName(body);
        if (!normalizedBody) {
          return res.status(400).json({
            success: false,
            error: `Invalid body Pokemon: ${body}`,
          });
        }
        bodyPokemon = normalizedBody;
      }

      const headStr = headPokemon ? ` - Head: ${headPokemon}` : '';
      const bodyStr = bodyPokemon ? ` - Body: ${bodyPokemon}` : '';
      logger.apiRequest(`type information${headStr}${bodyStr}`);
      const startTime = Date.now();

      const types = await FusionService.getFusionTypes({
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
        ...(config.server.environment !== 'production' && {
          details: error.message,
        }),
      });
    }
  }
}

module.exports = FusionController;
