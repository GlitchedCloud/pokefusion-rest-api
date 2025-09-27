const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

/**
 * Image service for handling sprite and type image serving
 */
class ImageService {
  static customSprites = new Set();
  static autogenSprites = new Map(); // Maps headId to Set of available bodyIds
  static isInitialized = false;

  // File paths
  static CUSTOM_DIR = path.join(
    __dirname,
    '../data/infinite-fusion-graphics/custom'
  );

  static AUTOGEN_DIR = path.join(
    __dirname,
    '../data/infinite-fusion-graphics/autogen'
  );

  static NULL_SPRITE = '/assets/sprites/null.png';

  /**
   * Initialize file indexes on application startup
   * Should be called once during app initialization
   */
  static async initialize () {
    if (this.isInitialized) {
      logger.info('IMAGE_SERVICE', 'Already initialized');
      return;
    }

    logger.info('IMAGE_SERVICE', 'Initializing file indexes...');
    const startTime = Date.now();

    try {
      // Initialize custom sprites index
      await this._indexCustomSprites();

      // Initialize autogen sprites index
      await this._indexAutogenSprites();

      this.isInitialized = true;
      const duration = Date.now() - startTime;
      logger.info('IMAGE_SERVICE', `Initialized successfully in ${duration}ms`);
      logger.info(
        'IMAGE_SERVICE',
        `Indexed ${this.customSprites.size} custom sprites`
      );
      logger.info(
        'IMAGE_SERVICE',
        `Indexed ${this.autogenSprites.size} autogen directories`
      );
    } catch (error) {
      logger.error('Failed to initialize image service:', error);
      throw error;
    }
  }

  /**
   * Index all custom sprite files
   * @private
   */
  static async _indexCustomSprites () {
    try {
      const files = await fs.readdir(this.CUSTOM_DIR);

      for (const file of files) {
        if (file.endsWith('.png') && /^\d+\.\d+\.png$/.test(file)) {
          // Remove .png extension and store filename
          const spriteKey = file.slice(0, -4);
          this.customSprites.add(spriteKey);
        }
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.warn(`Custom sprites directory not found: ${this.CUSTOM_DIR}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Index all autogen sprite files
   * @private
   */
  static async _indexAutogenSprites () {
    try {
      const headDirs = await fs.readdir(this.AUTOGEN_DIR);

      for (const headDir of headDirs) {
        const headDirPath = path.join(this.AUTOGEN_DIR, headDir);
        const stat = await fs.stat(headDirPath);

        if (stat.isDirectory() && /^\d+$/.test(headDir)) {
          const headId = parseInt(headDir, 10);
          const files = await fs.readdir(headDirPath);
          const bodyIds = new Set();

          for (const file of files) {
            if (file.endsWith('.png')) {
              // Extract body ID from filename like "150.25.png"
              const match = file.match(/^\d+\.(\d+)\.png$/);
              if (match) {
                const bodyId = parseInt(match[1], 10);
                bodyIds.add(bodyId);
              }
            }
          }

          if (bodyIds.size > 0) {
            this.autogenSprites.set(headId, bodyIds);
          }
        }
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.warn(`Autogen sprites directory not found: ${this.AUTOGEN_DIR}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Refresh file indexes (call this periodically or when files change)
   * NOT CURRENTLY IMPLEMENTED -
   */
  static async refreshIndexes () {
    logger.info('IMAGE_SERVICE', 'Refreshing file indexes...');
    this.customSprites.clear();
    this.autogenSprites.clear();
    this.isInitialized = false;
    await this.initialize();
  }

  /**
   * Validate Pokemon ID parameters
   * @param {string|number} headId - Head Pokemon ID
   * @param {string|number} bodyId - Body Pokemon ID
   * @returns {Object} Validation result with parsed numbers or error
   */
  static validateFusionParams (headId, bodyId) {
    const headNum = parseInt(headId, 10);
    const bodyNum = parseInt(bodyId, 10);

    if (!headNum || !bodyNum || headNum < 1 || bodyNum < 1) {
      return {
        valid: false,
        error: {
          message: 'headId and bodyId must be positive numbers',
          provided: { headId, bodyId }
        }
      };
    }

    return {
      valid: true,
      headId: headNum,
      bodyId: bodyNum
    };
  }

  /**
   * Generate fusion image paths with custom/fallback logic
   * @param {number} headId - Head Pokemon ID
   * @param {number} bodyId - Body Pokemon ID
   * @returns {Object} Result with imageUrl and attribution
   */
  static generateFusionImagePath (headId, bodyId) {
    if (!this.isInitialized) {
      logger.warn('Image service not initialized, falling back to null sprite');
      return {
        imageUrl: this.NULL_SPRITE,
        attribution: 'Missing sprite.'
      };
    }

    const spriteKey = `${headId}.${bodyId}`;

    // Check custom sprites first (highest priority)
    if (this.customSprites.has(spriteKey)) {
      return {
        imageUrl: `/data/infinite-fusion-graphics/custom/${headId}.${bodyId}.png`,
        attribution: 'custom' // TODO: Attribution unknown for custom sprites - database not implemented
      };
    }

    // Check autogen sprites (medium priority)
    const headSprites = this.autogenSprites.get(headId);
    if (headSprites && headSprites.has(bodyId)) {
      return {
        imageUrl: `/data/infinite-fusion-graphics/autogen/${headId}/${headId}.${bodyId}.png`,
        attribution: 'japeal'
      };
    }

    // Fallback to null sprite (lowest priority)
    return {
      imageUrl: this.NULL_SPRITE,
      attribution: 'Missing sprite.'
    };
  }

  /**
   * Validate type name and check if file exists
   * @param {string} typeName - Pokemon type name
   * @returns {Object} Validation result with file path
   */
  static validateTypeName (typeName) {
    if (!/^[a-zA-Z]{3,15}$/.test(typeName)) {
      return {
        valid: false,
        error: {
          message: 'Type name must be 3-15 letters only',
          provided: { typeName }
        }
      };
    }

    const normalizedType = typeName.toLowerCase();
    const typeIconPath = path.join(
      __dirname,
      '../assets/types',
      `${normalizedType}.png`
    );

    if (!fsSync.existsSync(typeIconPath)) {
      return {
        valid: false,
        error: {
          message: `Type '${normalizedType}' does not exist`,
          provided: { typeName: normalizedType }
        }
      };
    }

    return {
      valid: true,
      typeName: normalizedType,
      filePath: typeIconPath
    };
  }
}

module.exports = ImageService;
