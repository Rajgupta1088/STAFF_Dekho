const express = require('express');
const router = express.Router();

const candidateRoutes = require('./src/api/candidate/routes/indexRoutes');

router.use('/candidate', candidateRoutes);


module.exports = router;
