const PokemonService = require('./pokemon.service');
const logger = require('../utils/logger');
const config = require('../config');
const fs = require('fs').promises;
const path = require('path');

/**
 * Fusion service for handling Pokemon fusion logic
 */
class FusionService {
  static customPokedexEntries = new Map(); // fusionId -> array of entries
  static isPokedexLoaded = false;

  // File path for custom Pokedex entries
  static CUSTOM_POKEDEX_PATH = path.join(__dirname, '../data/pokedex/dex.json');

  // Regex to identify variants: (1-4 digits).(1-4 digits)[a-z]
  static VARIANT_REGEX = /^(\d{1,4}\.\d{1,4})[a-z]$/i;

  /**
   * Validates if a fusion ID matches the variant pattern.
   * @param {string} fusionId The fusion ID (e.g., "150.25a")
   * @returns {boolean} True if it is a variant, false otherwise.
   */
  static isVariant(fusionId) {
    return this.VARIANT_REGEX.test(fusionId);
  }

  /**
   * Initialize custom Pokedex entries on application startup
   * Should be called once during app initialization
   */
  static async initialize() {
    if (this.isPokedexLoaded) {
      logger.info('FUSION_SERVICE', 'Custom Pokedex already loaded');
      return;
    }

    logger.info('FUSION_SERVICE', 'Loading custom Pokedex entries...');
    const startTime = Date.now();

    try {
      const jsonData = await fs.readFile(this.CUSTOM_POKEDEX_PATH, 'utf8');
      const pokedexData = JSON.parse(jsonData);

      // Group entries by fusion sprite ID, filtering out variants
      let totalProcessed = 0;
      let variantsFiltered = 0;

      for (const entry of pokedexData) {
        if (!entry.sprite || !entry.entry || !entry.author) continue;

        // Extract fusion ID from sprite filename (e.g., "1.10.png" -> "1.10")
        const fusionId = entry.sprite.replace('.png', '');

        // Skip variant entries (e.g., "150.25a", "1.10b")
        if (this.isVariant(fusionId)) {
          variantsFiltered++;
          continue;
        }

        if (!this.customPokedexEntries.has(fusionId)) {
          this.customPokedexEntries.set(fusionId, []);
        }

        this.customPokedexEntries.get(fusionId).push({
          entry: entry.entry,
          author: entry.author,
        });

        totalProcessed++;
      }

      this.isPokedexLoaded = true;
      const duration = Date.now() - startTime;
      logger.info(
        'FUSION_SERVICE',
        `Loaded ${totalProcessed} custom Pokedex entries for ${this.customPokedexEntries.size} fusions in ${duration}ms`
      );

      if (variantsFiltered > 0) {
        logger.info(
          'FUSION_SERVICE',
          `Filtered out ${variantsFiltered} variant entries for optimized memory usage`
        );
      }
    } catch (error) {
      logger.error(
        'FUSION_SERVICE',
        'Failed to load custom Pokedex:',
        error.message
      );
      // Continue without custom entries - will fall back to auto-generated
    }
  }

  /**
   * Get a random custom Pokedex entry for a fusion, or null if none exists
   */
  static getCustomPokedexEntry(headIndex, bodyIndex) {
    if (!this.isPokedexLoaded) return null;

    const fusionId = `${headIndex}.${bodyIndex}`;
    const entries = this.customPokedexEntries.get(fusionId);

    if (!entries || entries.length === 0) return null;

    // Return a random entry if multiple exist
    const randomEntry = entries[Math.floor(Math.random() * entries.length)];
    return {
      entry: randomEntry.entry,
      author: randomEntry.author,
    };
  }

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

      // Get Pokemon data for fusion generation
      const headIndex = PokemonService.getPokemonIndex(headPokemon);
      const bodyIndex = PokemonService.getPokemonIndex(bodyPokemon);
      const headData = PokemonService.getPokemonById(headIndex);
      const bodyData = PokemonService.getPokemonById(bodyIndex);

      logger.fusion(headPokemon, headIndex, bodyPokemon, bodyIndex);

      // Calculate fusion name using authentic Pokemon Infinite Fusion logic
      const fusionName = FusionService.calculateName(
        headIndex,
        bodyIndex,
        headData,
        bodyData
      );

      // Generate fusion ID from indices of both Pokemon
      const fusionId = `#${headIndex}.${bodyIndex}`;

      // Generate fusion image URL
      const fusionImageUrl = `${config.server.url}/api/images/fusion/${headIndex}/${bodyIndex}`;

      // Calculate fusion types using authentic Pokemon Infinite Fusion logic
      const fusionTypes = FusionService.calculateTypes(headData, bodyData);

      // Convert types to the expected format with internal proxy URLs
      const types = fusionTypes.map(type => ({
        name: type,
        imageUrl: `${config.server.url}/api/images/types/${type.toLowerCase()}`,
      }));

      // Calculate fusion stats using authentic Pokemon Infinite Fusion formulas
      const fusionStats = FusionService.calculateBaseStats(headData, bodyData);

      // Calculate fusion Pokedex entry and category
      const fusionPokedexData = FusionService.calculateDexEntry(
        headData,
        bodyData,
        fusionName,
        headIndex,
        bodyIndex
      );
      const fusionCategory = FusionService.calculateCategory(
        bodyData,
        headData
      );

      // Calculate height and weight using authentic Pokemon Infinite Fusion averaging
      const fusionHeight = FusionService.calculateHeight(headData, bodyData);
      const fusionWeight = FusionService.calculateWeight(headData, bodyData);

      // Create base fusion data
      const fusionData = {
        leftPkmnIndex: headIndex,
        rightPkmnIndex: bodyIndex,
        fusionName,
        fusionId,
        fusionImageUrl,
        leftPokemonName: headPokemon,
        rightPokemonName: bodyPokemon,
        types,
        stats: fusionStats,
        pokedexEntry: fusionPokedexData.entry,
        pokedexAuthor: fusionPokedexData.author,
        category: fusionCategory,
        height: fusionHeight,
        weight: fusionWeight,
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
   * Get basic Pokemon data and prepare for fusion calculations
   */
  static prepareFusionData(options = {}) {
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

    // Get Pokemon data for fusion generation
    const headIndex = PokemonService.getPokemonIndex(headPokemon);
    const bodyIndex = PokemonService.getPokemonIndex(bodyPokemon);
    const headData = PokemonService.getPokemonById(headIndex);
    const bodyData = PokemonService.getPokemonById(bodyIndex);

    return {
      headPokemon,
      bodyPokemon,
      headIndex,
      bodyIndex,
      headData,
      bodyData,
    };
  }

  /**
   * Get only Pokemon names from a fusion
   */
  static async getFusionNames(options = {}) {
    try {
      const {
        headPokemon,
        bodyPokemon,
        headIndex,
        bodyIndex,
        headData,
        bodyData,
      } = FusionService.prepareFusionData(options);

      logger.fusion(headPokemon, headIndex, bodyPokemon, bodyIndex);

      const fusionName = FusionService.calculateName(
        headIndex,
        bodyIndex,
        headData,
        bodyData
      );
      const fusionId = `#${headIndex}.${bodyIndex}`;

      logger.fusionComplete();
      return {
        fusionName,
        fusionId,
        leftPokemonName: headPokemon,
        rightPokemonName: bodyPokemon,
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
      const {
        headPokemon,
        bodyPokemon,
        headIndex,
        bodyIndex,
        headData,
        bodyData,
      } = FusionService.prepareFusionData(options);

      logger.fusion(headPokemon, headIndex, bodyPokemon, bodyIndex);

      const fusionTypes = FusionService.calculateTypes(headData, bodyData);
      const types = fusionTypes.map(type => ({
        name: type,
        imageUrl: `${config.server.url}/api/images/types/${type.toLowerCase()}`,
      }));

      logger.fusionComplete();
      return { types };
    } catch (error) {
      logger.error('FUSION', 'Error getting types:', error.message);
      throw error;
    }
  }

  /**
   * Get only stats information from a fusion
   */
  static async getFusionStats(options = {}) {
    try {
      const {
        headPokemon,
        bodyPokemon,
        headIndex,
        bodyIndex,
        headData,
        bodyData,
      } = FusionService.prepareFusionData(options);

      logger.fusion(headPokemon, headIndex, bodyPokemon, bodyIndex);

      const stats = FusionService.calculateBaseStats(headData, bodyData);

      logger.fusionComplete();
      return { stats };
    } catch (error) {
      logger.error('FUSION', 'Error getting stats:', error.message);
      throw error;
    }
  }

  /**
   * Get only Pokedex entry from a fusion
   */
  static async getFusionPokedex(options = {}) {
    try {
      const {
        headPokemon,
        bodyPokemon,
        headIndex,
        bodyIndex,
        headData,
        bodyData,
      } = FusionService.prepareFusionData(options);

      logger.fusion(headPokemon, headIndex, bodyPokemon, bodyIndex);

      const fusionName = FusionService.calculateName(
        headIndex,
        bodyIndex,
        headData,
        bodyData
      );
      const pokedexData = FusionService.calculateDexEntry(
        headData,
        bodyData,
        fusionName,
        headIndex,
        bodyIndex
      );
      const category = FusionService.calculateCategory(bodyData, headData);
      const height = FusionService.calculateHeight(headData, bodyData);
      const weight = FusionService.calculateWeight(headData, bodyData);

      logger.fusionComplete();
      return {
        pokedexEntry: pokedexData.entry,
        pokedexAuthor: pokedexData.author,
        category,
        height,
        weight,
      };
    } catch (error) {
      logger.error('FUSION', 'Error getting Pokedex entry:', error.message);
      throw error;
    }
  }

  /**
   * Calculate Type1 using authentic Pokemon Infinite Fusion logic
   */
  static calculateType1(headPokemon) {
    const headTypes = headPokemon.types || [];
    // Return type2 if head is Normal/Flying, otherwise return type1
    if (headTypes[0] === 'NORMAL' && headTypes[1] === 'FLYING') {
      return headTypes[1]; // Return FLYING
    }
    return headTypes[0]; // Return first type
  }

  /**
   * Calculate Type2 using authentic Pokemon Infinite Fusion logic
   */
  static calculateType2(bodyPokemon, type1) {
    const bodyTypes = bodyPokemon.types || [];
    // Return body's type1 if body's type2 equals calculated type1, otherwise return body's type2
    if (bodyTypes[1] === type1) {
      return bodyTypes[0]; // Return body's first type
    }
    return bodyTypes[1]; // Return body's second type (may be undefined)
  }

  /**
   * Calculate fusion types
   */
  static calculateTypes(headPokemon, bodyPokemon) {
    const type1 = this.calculateType1(headPokemon);
    const type2 = this.calculateType2(bodyPokemon, type1);

    // Filter out undefined/null types and remove duplicates
    const types = [type1, type2].filter(type => type && type !== undefined);
    return [...new Set(types)]; // Remove duplicates
  }

  /**
   * Calculate fusion name using authentic Pokemon Infinite Fusion logic
   */
  static calculateName(headIndex, bodyIndex, headData, bodyData) {
    try {
      const GameData = require('../data/GameData');

      // Get mapped indices using NAT_DEX_MAPPING
      const bodyNatDex = GameData.NAT_DEX_MAPPING[bodyIndex] || bodyIndex;
      const headNatDex = GameData.NAT_DEX_MAPPING[headIndex] || headIndex;

      const headSplits = GameData.SPLIT_NAMES[headNatDex] || [
        headData.fullName,
        '',
      ];
      const bodySplits = GameData.SPLIT_NAMES[bodyNatDex] || [
        '',
        bodyData.fullName,
      ];

      let prefix = headSplits[0] || headData.fullName;
      const suffix = bodySplits[1] || bodySplits[0] || bodyData.fullName;

      // Handle overlapping characters (if prefix ends with same char as suffix starts)
      if (
        prefix.length > 0 &&
        suffix.length > 0 &&
        prefix[prefix.length - 1] === suffix[0]
      ) {
        prefix = prefix.slice(0, -1);
      }

      return prefix + suffix;
    } catch (error) {
      logger.error(
        'FUSION',
        `Name calculation error for ${headIndex}.${bodyIndex}:`,
        error.message
      );
      return `${headData.fullName}${bodyData.fullName}`;
    }
  }

  /**
   * Calculate base stats using authentic Pokemon Infinite Fusion formulas
   */
  static calculateBaseStats(headPokemon, bodyPokemon) {
    const headStats = {
      HP: headPokemon.hp || 0,
      SPECIAL_DEFENSE: headPokemon.specialDefense || 0,
      SPECIAL_ATTACK: headPokemon.specialAttack || 0,
      ATTACK: headPokemon.attack || 0,
      DEFENSE: headPokemon.defense || 0,
      SPEED: headPokemon.speed || 0,
    };

    const bodyStats = {
      HP: bodyPokemon.hp || 0,
      SPECIAL_DEFENSE: bodyPokemon.specialDefense || 0,
      SPECIAL_ATTACK: bodyPokemon.specialAttack || 0,
      ATTACK: bodyPokemon.attack || 0,
      DEFENSE: bodyPokemon.defense || 0,
      SPEED: bodyPokemon.speed || 0,
    };

    const fusedStats = {};

    // Head dominant stats (head is primary contributor)
    fusedStats.HP = this.calculateFusedStats(headStats.HP, bodyStats.HP);
    fusedStats.SPECIAL_DEFENSE = this.calculateFusedStats(
      headStats.SPECIAL_DEFENSE,
      bodyStats.SPECIAL_DEFENSE
    );
    fusedStats.SPECIAL_ATTACK = this.calculateFusedStats(
      headStats.SPECIAL_ATTACK,
      bodyStats.SPECIAL_ATTACK
    );

    // Body dominant stats (body is primary contributor)
    fusedStats.ATTACK = this.calculateFusedStats(
      bodyStats.ATTACK,
      headStats.ATTACK
    );
    fusedStats.DEFENSE = this.calculateFusedStats(
      bodyStats.DEFENSE,
      headStats.DEFENSE
    );
    fusedStats.SPEED = this.calculateFusedStats(
      bodyStats.SPEED,
      headStats.SPEED
    );

    // Calculate total
    fusedStats.TOTAL = Object.values(fusedStats).reduce(
      (sum, stat) => sum + stat,
      0
    );

    return fusedStats;
  }

  /**
   * Calculate Pokedex entry using custom entries first, then fallback logic
   */
  static calculateDexEntry(
    bodyPokemon,
    headPokemon,
    fusionName,
    headIndex,
    bodyIndex
  ) {
    // First try to get a custom Pokedex entry
    const customEntry = this.getCustomPokedexEntry(headIndex, bodyIndex);

    if (customEntry) {
      // Replace POKENAME placeholder with the actual fusion name
      const processedEntry = customEntry.entry.replace(/POKENAME/g, fusionName);
      return {
        entry: processedEntry,
        author: customEntry.author,
      };
    }

    // Fall back to auto-generated entry
    const bodyEntry = (bodyPokemon.pokedexEntry || '').replace(
      new RegExp(bodyPokemon.fullName, 'g'),
      fusionName
    );
    const headEntry = (headPokemon.pokedexEntry || '').replace(
      new RegExp(headPokemon.fullName, 'g'),
      fusionName
    );

    const generatedEntry = this.splitAndCombineText(bodyEntry, headEntry, '.');

    return {
      entry: generatedEntry,
      author: 'Auto-spliced Pokédex Entry',
    };
  }

  /**
   * Calculate category using authentic Pokemon Infinite Fusion logic
   * Uses the same text splitting approach as Pokedex entries
   */
  static calculateCategory(bodyPokemon, headPokemon) {
    const bodyCategory = bodyPokemon.category || '';
    const headCategory = headPokemon.category || '';

    // Use the same splitting logic as the original implementation
    return FusionService.splitAndCombineCategory(bodyCategory, headCategory);
  }

  /**
   * Calculate height using authentic Pokemon Infinite Fusion logic
   */
  static calculateHeight(headPokemon, bodyPokemon) {
    // Extract numeric values from height strings (e.g., "150 cm" -> 150)
    const headHeight = this.extractNumericValue(headPokemon.height);
    const bodyHeight = this.extractNumericValue(bodyPokemon.height);

    const averagedHeight = this.averageValues(headHeight, bodyHeight);
    return `${averagedHeight} cm`;
  }

  /**
   * Calculate weight using authentic Pokemon Infinite Fusion logic
   */
  static calculateWeight(headPokemon, bodyPokemon) {
    // Extract numeric values from weight strings (e.g., "41.5 kg" -> 41.5)
    const headWeight = this.extractNumericValue(headPokemon.weight);
    const bodyWeight = this.extractNumericValue(bodyPokemon.weight);

    const averagedWeight = this.averageValues(headWeight, bodyWeight);
    return `${averagedWeight} kg`;
  }

  /**
   * Takes 2 strings, splits and combines them using the beginning of the first one
   * and the end of the second one (for Pokedex entries)
   */
  static splitAndCombineText(beginningTextFull, endTextFull, separator) {
    const beginningTextSplit = beginningTextFull.split(separator, 2);
    const endTextSplit = endTextFull.split(separator, 2);

    const beginningText = beginningTextSplit[0];
    const endText =
      endTextSplit[1] && endTextSplit[1] !== ''
        ? endTextSplit[1]
        : endTextSplit[0];

    console.log('Beginning Text:', beginningText);
    console.log('End Text:', endText);

    return (beginningText + separator + ' ' + endText)
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  /**
   * Handle Pokemon category strings by trimming "Pokemon" and recombining
   */
  static splitAndCombineCategory(headCategory, bodyCategory) {
    // Remove "Pokémon" from the end of each category
    const headTrimmed = headCategory.replace(/\s*Pokémon\s*$/i, '').trim();
    const bodyTrimmed = bodyCategory.replace(/\s*Pokémon\s*$/i, '').trim();

    // Combine head and body categories
    const combined =
      headTrimmed && bodyTrimmed
        ? `${headTrimmed} ${bodyTrimmed}`
        : headTrimmed || bodyTrimmed;

    // Add "Pokémon" back to the end
    return `${combined} Pokémon`;
  }

  /**
   * Calculate fused stat using authentic Pokémon Infinite Fusion formula
   */
  static calculateFusedStats(dominantStat, otherStat) {
    return Math.floor((2 * dominantStat) / 3) + Math.floor(otherStat / 3);
  }

  /**
   * Calculate average of two values
   */
  static averageValues(value1, value2) {
    return Math.floor((value1 + value2) / 2);
  }

  /**
   * Average values in two maps/objects
   */
  static averageMapValues(map1, map2) {
    const result = {};
    const allKeys = new Set([...Object.keys(map1), ...Object.keys(map2)]);

    for (const key of allKeys) {
      const val1 = map1[key] || 0;
      const val2 = map2[key] || 0;
      result[key] = Math.floor((val1 + val2) / 2);
    }

    return result;
  }

  /**
   * Get the highest of two values
   */
  static getHighestValue(value1, value2) {
    return value1 > value2 ? value1 : value2;
  }

  /**
   * Get the lowest of two values
   */
  static getLowestValue(value1, value2) {
    return value1 < value2 ? value1 : value2;
  }

  /**
   * Extract numeric value from strings like "150 cm" or "41.5 kg"
   */
  static extractNumericValue(valueString) {
    if (!valueString || typeof valueString !== 'string') return 0;

    // Extract the first number (integer or decimal) from the string
    const match = valueString.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  }
}

module.exports = FusionService;
