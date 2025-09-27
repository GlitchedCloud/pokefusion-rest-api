const express = require('express');
const FusionController = require('../controllers/fusion.controller');

const router = express.Router();

// GET /api/fusion - Get a fusion with all data (supports query parameters)
router.get('/', FusionController.getFusion);

// GET /api/fusion/names - Get only Pokémon names (supports query parameters)
router.get('/names', FusionController.getFusionNames);

// GET /api/fusion/types - Get only type information (supports query parameters)
router.get('/types', FusionController.getFusionTypes);

// GET /api/fusion/stats - Get only stats information (supports query parameters)
router.get('/stats', FusionController.getFusionStats);

// GET /api/fusion/pokedex - Get only Pokedex entry (supports query parameters)
router.get('/pokedex', FusionController.getFusionPokedex);

module.exports = router;
