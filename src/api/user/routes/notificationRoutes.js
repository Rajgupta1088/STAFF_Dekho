
const express = require('express');
const router = express.Router();

const { getNotification } = require('../controllers/notificationController')

router.get('/getNotification', getNotification);

module.exports = router;
