const express = require('express');
const router = express.Router();

const sendOtpRoutes = require('./otpRoutes');
const candidateProfileRoutes = require('./candidateProfileRoutes');

const { verifyToken, headerAuth } = require('../middleware/authentication');
router.use('/otp', sendOtpRoutes);

router.use(headerAuth);
// router.use('/setting', configurationRoutes);
router.use('/profile', candidateProfileRoutes);

router.use(verifyToken);

module.exports = router;
