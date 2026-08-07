const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resource.controller');

router.get('/', resourceController.getResources);
router.get('/categories', resourceController.getCategories);
router.get('/:id', resourceController.getResourceById);

module.exports = router;
