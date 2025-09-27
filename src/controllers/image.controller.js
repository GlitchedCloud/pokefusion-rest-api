const ImageService = require('../services/image.service');
const logger = require('../utils/logger');

/**
 * Controller for image-related API endpoints
 */
class ImageController {
  /**
   * GET /api/images/fusion/:headId/:bodyId - Redirect to fusion image
   */
  static redirectToFusionImage(req, res) {
    try {
      const { headId, bodyId } = req.params;

      // Validate parameters using service
      const validation = ImageService.validateFusionParams(headId, bodyId);

      if (!validation.valid) {
        logger.warn(
          'IMAGES',
          `Invalid parameters: head=${headId}, body=${bodyId}`
        );
        return res.status(400).json({
          success: false,
          error: 'Invalid parameters',
          message: validation.error.message,
          provided: validation.error.provided,
        });
      }

      // Generate external URL using service
      const externalUrl = ImageService.generateFusionImageUrl(
        validation.headId,
        validation.bodyId
      );

      // Log the redirect for monitoring
      logger.info(
        'IMAGES',
        `Redirecting to fusion image: ${validation.headId}.${validation.bodyId}`
      );

      // Set caching headers for the redirect itself
      res.set({
        'Cache-Control': 'public, max-age=3600', // Cache redirect for 1 hour
        'X-Redirect-To': 'External CDN',
      });

      // Temporary redirect to actual CDN (client fetches directly)
      res.redirect(302, externalUrl);
    } catch (error) {
      logger.error(
        'IMAGES',
        'Error processing fusion image redirect:',
        error.message
      );
      res.status(500).json({
        success: false,
        error: 'Server error',
        message: 'Failed to process image request',
      });
    }
  }

  /**
   * GET /api/images/types/:typeName - Serve actual type icon files
   */
  static getTypeIcon(req, res) {
    try {
      const { typeName } = req.params;

      // Validate type name and check if file exists using service
      const validation = ImageService.validateTypeName(typeName);

      if (!validation.valid) {
        logger.warn('IMAGES', `Type icon not found: ${typeName}`);
        return res.status(404).json({
          success: false,
          error: 'Type not found',
          message: validation.error.message,
          provided: validation.error.provided,
        });
      }

      logger.info('IMAGES', `Serving type icon: ${validation.typeName}`);

      // Set appropriate headers for image serving
      res.set({
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      });

      // Serve the file using the path from service
      res.sendFile(validation.filePath);
    } catch (error) {
      logger.error(
        'IMAGES',
        'Error processing type icon request:',
        error.message
      );
      res.status(500).json({
        success: false,
        error: 'Server error',
        message: 'Failed to process type icon request',
      });
    }
  }
}

module.exports = ImageController;
