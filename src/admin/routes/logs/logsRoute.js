const express = require('express');
const router = express.Router();
const logCtrl = require('../../controllers/logs/logsManagement');
const { checkCrudPermission } = require('../../middleware/permission/checkCrudPermission');

router.get('/logsManagement', checkCrudPermission(), logCtrl.logPage);
router.post('/logsList', checkCrudPermission(), logCtrl.logsList);

module.exports = router;
