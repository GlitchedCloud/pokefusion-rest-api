const config = require('../config');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

/**
 * Image service for handling image URL generation and validation
 */
class ImageService {
  /**
   * Validate Pokemon ID parameters
   * @param {string|number} headId - Head Pokemon ID
   * @param {string|number} bodyId - Body Pokemon ID
   * @returns {Object} Validation result with parsed numbers or error
   */
  static validateFusionParams(headId, bodyId) {
    const headNum = parseInt(headId, 10);
    const bodyNum = parseInt(bodyId, 10);

    if (!headNum || !bodyNum || headNum < 1 || bodyNum < 1) {
      return {
        valid: false,
        error: {
          message: 'headId and bodyId must be positive numbers',
          provided: { headId, bodyId },
        },
      };
    }

    return {
      valid: true,
      headId: headNum,
      bodyId: bodyNum,
    };
  }

  /**
   * Generate fusion image URL
   * @param {number} headId - Head Pokemon ID
   * @param {number} bodyId - Body Pokemon ID
   * @returns {string} External CDN URL
   */
  static generateFusionImageUrl(headId, bodyId) {
    return `${config.externalUrls.fusionImageCdn}/autogen/${headId}/${headId}.${bodyId}.png`;
  }

  /**
   * Validate type name and check if file exists
   * @param {string} typeName - Pokemon type name
   * @returns {Object} Validation result with file path
   */
  static validateTypeName(typeName) {
    if (!/^[a-zA-Z]{3,15}$/.test(typeName)) {
      return {
        valid: false,
        error: {
          message: 'Type name must be 3-15 letters only',
          provided: { typeName },
        },
      };
    }

    const normalizedType = typeName.toLowerCase();
    const typeIconPath = path.join(
      __dirname,
      '../assets/types',
      `${normalizedType}.png`
    );

    if (!fs.existsSync(typeIconPath)) {
      return {
        valid: false,
        error: {
          message: `Type '${normalizedType}' does not exist`,
          provided: { typeName: normalizedType },
        },
      };
    }

    return {
      valid: true,
      typeName: normalizedType,
      filePath: typeIconPath,
    };
  }
}

module.exports = ImageService;
