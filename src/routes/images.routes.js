const express = require('express');
const ImageController = require('../controllers/image.controller');

const router = express.Router();

// GET /api/images/fusion/:headId/:bodyId - Redirect to fusion image
router.get('/fusion/:headId/:bodyId', ImageController.redirectToFusionImage);

// GET /api/images/types/:typeName - Type icon endpoint
router.get('/types/:typeName', ImageController.getTypeIcon);

module.exports = router;
