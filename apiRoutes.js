const express = require('express');
const router = express.Router();

const candidateRoutes = require('./src/api/candidate/routes/indexRoutes');

<<<<<<< HEAD
router.use('/driver', driverRoutes);
router.use('/user', userRoutes);
router.use('/web', webRoutes);
=======
router.use('/candidate', candidateRoutes);
>>>>>>> 78735803560db44155602d505f787f18f71b1dbc


module.exports = router;
