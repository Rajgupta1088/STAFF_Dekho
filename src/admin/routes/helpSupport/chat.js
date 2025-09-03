const express = require('express');
const router = express.Router();
const chatCtrl = require('../../controllers/helpSupport/chat');
const { checkCrudPermission } = require('../../middleware/permission/checkCrudPermission');

router.get('/helpAndSupport', checkCrudPermission(), chatCtrl.chatPage);
router.get('/driverHelpAndSupport', checkCrudPermission(), chatCtrl.driverChatPage);

router.post("/send", chatCtrl.saveChatMessage);

router.get("/history", chatCtrl.getChatMessages);

router.post("/driverSend", chatCtrl.driverSaveChatMessage);

router.get("/driverHistory", chatCtrl.driverGetChatMessages);


module.exports = router;
