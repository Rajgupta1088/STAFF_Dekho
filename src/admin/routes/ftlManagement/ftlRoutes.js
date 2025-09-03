
const express = require('express');
const router = express.Router();

const FTLCtrl = require('../../controllers/ftlManagement/ftlcontroller');
const { checkCrudPermission } = require('../../middleware/permission/checkCrudPermission');


router.get('/ftlManagement', checkCrudPermission('isShow'), FTLCtrl.ftlPage);
router.post('/ftlList', checkCrudPermission('isShow'), FTLCtrl.ftlList);
router.get('/ftlOrderDetail/:id', checkCrudPermission('isShow'), FTLCtrl.ftlOrderDetail);
router.get('/ftlOutstationDriverList', checkCrudPermission('isShow'), FTLCtrl.ftlOutstationDriverList);
router.post('/ftlManualAssignDriver', checkCrudPermission('isShow'), FTLCtrl.ftlManualAssignDriver);



module.exports = router;
