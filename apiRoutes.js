const express = require('express');
const router = express.Router();

const candidateRoutes = require('./src/api/candidate/routes/indexRoutes');
const webRoutes = require('./src/api/web/routes/indexRoutes');


router.use('/candidate', candidateRoutes);
router.use('/web', webRoutes);


module.exports = router;
