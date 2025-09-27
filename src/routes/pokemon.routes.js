const express = require('express');
const PokemonController = require('../controllers/pokemon.controller');

const router = express.Router();

// GET /api/pokemon - Get all Pokemon names
router.get('/', PokemonController.getAllPokemon);

module.exports = router;
