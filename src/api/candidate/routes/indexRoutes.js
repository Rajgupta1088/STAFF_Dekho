const express = require('express');
const router = express.Router();

const sendOtpRoutes = require('./otpRoutes');


const { verifyToken, headerAuth } = require('../middleware/authentication');
router.use('/otp', sendOtpRoutes);

router.use(headerAuth);
router.use('/setting', configurationRoutes);

// router.use(verifyToken);

module.exports = router;
