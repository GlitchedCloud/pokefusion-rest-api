const express = require('express');
const config = require('../config');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

const router = express.Router();

/**
 * Ultra-fast redirect for fusion images (minimal server resource usage)
 * GET /api/images/fusion/:headId/:bodyId
 *
 * This validates parameters and redirects to the external CDN
 * Provides URL obfuscation with minimal server load
 */
router.get('/fusion/:headId/:bodyId', (req, res) => {
  try {
    const { headId, bodyId } = req.params;

    // Fast parameter validation
    const headNum = parseInt(headId, 10);
    const bodyNum = parseInt(bodyId, 10);

    // Validate parameters are positive integers
    if (!headNum || !bodyNum || headNum < 1 || bodyNum < 1) {
      logger.warn(
        'IMAGES',
        `Invalid parameters: head=${headId}, body=${bodyId}`
      );
      return res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        message: 'headId and bodyId must be positive numbers',
        provided: { headId, bodyId },
      });
    }

    // Build external CDN URL
    const externalUrl = `${config.externalUrls.fusionImageCdn}/${headNum}/${headNum}.${bodyNum}.png`;

    // Log the redirect for monitoring
    logger.info('IMAGES', `Redirecting to fusion image: ${headNum}.${bodyNum}`);

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
});

/**
 * Type icons endpoint - serves actual type icon files
 * GET /api/images/types/:typeName
 */
router.get('/types/:typeName', (req, res) => {
  try {
    const { typeName } = req.params;

    // Validate type name (only letters, 3-15 characters)
    if (!/^[a-zA-Z]{3,15}$/.test(typeName)) {
      logger.warn('IMAGES', `Invalid type name: ${typeName}`);
      return res.status(400).json({
        success: false,
        error: 'Invalid type name',
        message: 'Type name must be 3-15 letters only',
        provided: { typeName },
      });
    }

    const normalizedType = typeName.toLowerCase();

    // Check if type file exists in assets/types directory

    const typeIconPath = path.join(
      __dirname,
      '../assets/types',
      `${normalizedType}.png`
    );

    if (!fs.existsSync(typeIconPath)) {
      logger.warn('IMAGES', `Type icon not found: ${normalizedType}`);
      return res.status(404).json({
        success: false,
        error: 'Type not found',
        message: `Type '${normalizedType}' does not exist`,
        provided: { typeName: normalizedType },
      });
    }

    logger.info('IMAGES', `Serving type icon: ${normalizedType}`);

    // Set appropriate headers for image serving
    res.set({
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
    });

    // Serve the file
    res.sendFile(typeIconPath);
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
});

module.exports = router;
