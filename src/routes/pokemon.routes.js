const express = require('express');
const PokemonController = require('../controllers/pokemon.controller');

const router = express.Router();

// GET /api/pokemon - Get all Pokemon names
router.get('/', PokemonController.getAllPokemon);

// GET /api/pokemon/types - Get all Pokemon type data
router.get('/types', PokemonController.getPokemonTypes);

module.exports = router;
