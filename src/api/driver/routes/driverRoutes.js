
const express = require('express');
const router = express.Router();

const { createDriver, updateDriver, driverOnlineOffline, driverPayoutList, deleteDriver } = require('../controllers/driverController')
const { addBankDetails, getBankDetails } = require('../controllers/driverBankDetail')

router.post('/createDriver', createDriver);
router.post('/updateDriver', updateDriver);
router.post('/bankDetails', addBankDetails);
router.get('/getBankDetails', getBankDetails);
router.post('/driverOnlineOffline', driverOnlineOffline);
router.post('/payoutRequest', driverOnlineOffline);
router.get('/driverPayoutList', driverPayoutList);
router.get('/deleteDriver', deleteDriver);



module.exports = router;
