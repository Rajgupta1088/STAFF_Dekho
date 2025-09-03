const express = require('express');
const router = express.Router();
const { checkCrudPermission } = require('../../middleware/permission/checkCrudPermission');


const TwoWheelerCTRL = require('../../controllers/twoWheelerManagement/twoWheelerController');

router.get('/twoWheelerManagement', checkCrudPermission('isShow'), TwoWheelerCTRL.twoWheelerPage);
router.post('/twoWheelerList', checkCrudPermission('isShow'), TwoWheelerCTRL.twoWheelerList);
router.get('/twoWheelerOrderDetail/:id', checkCrudPermission('isShow'), TwoWheelerCTRL.twoWheelerOrderDetail);


module.exports = router;
