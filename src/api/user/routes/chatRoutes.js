const express = require("express");
const router = express.Router();
const { saveChatMessage, getChatMessages } = require("../controllers/chatController");

// Save message
router.post("/send", saveChatMessage);

// Get chat history
router.get("/history", getChatMessages);

module.exports = router;
