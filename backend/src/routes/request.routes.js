const express = require('express');
const router = express.Router();
const requestController = require('../controllers/request.controller');
const authenticate = require('../middlewares/authenticate');

router.use(authenticate);

router.post('/', requestController.createRequest);
router.get('/', requestController.getUserRequests);
router.get('/:id', requestController.getRequestById);
router.put('/:id', requestController.updateRequest);

module.exports = router;
