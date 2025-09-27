const express = require('express');
const FusionController = require('../controllers/fusion.controller');

const router = express.Router();

// GET /api/fusion - Get a fusion with all data (supports query parameters)
router.get('/', FusionController.getFusion);

// GET /api/fusion/names - Get only Pokémon names (supports query parameters)
router.get('/names', FusionController.getFusionNames);

// GET /api/fusion/types - Get only type information (supports query parameters)
router.get('/types', FusionController.getFusionTypes);

module.exports = router;
