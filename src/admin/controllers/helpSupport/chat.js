const { initFirebaseAdmin1 } = require("../../../../config/firebasebk");
const User = require("../../../api/user/models/userModal");
const Driver = require("../../../api/driver/modals/driverModal");

const adminId = "ONP1234567890"; // static admin id

const chatPage = async (req, res) => {
    try {
        const { db } = await initFirebaseAdmin1();

        // 🔹 Fetch all chats from Firestore
        const snapshot = await db.collection("chats").get();

        if (snapshot.empty) {
            return res.render("pages/helpSupport/chat", { users: [] });
        }

        // 🔹 Extract userIds (remove adminId)
        const userIds = [];
        snapshot.forEach(doc => {
            const chatData = doc.data();
            if (chatData.users && Array.isArray(chatData.users)) {
                chatData.users.forEach(uId => {
                    if (uId !== adminId) {
                        userIds.push(uId);
                    }
                });
            }
        });

        // 🔹 Fetch user details from MongoDB
        const users = await User.find({ _id: { $in: userIds } })
            .select("fullName profilePicture")
            .lean();

        return res.render("pages/helpSupport/chat", { users });
    } catch (err) {
        console.error("❌ Error fetching chat users:", err.message);
        return res.status(500).send("Error loading chat page");
    }
};


const driverChatPage = async (req, res) => {
    try {
        const { db } = await initFirebaseAdmin1();

        // 🔹 Fetch all chats from Firestore
        const snapshot = await db.collection("driverChats").get();
        console.log('snapshot =>', snapshot)


        if (snapshot.empty) {
            return res.render("pages/helpSupport/driverChat", { drivers: [] });
        }

        // 🔹 Extract driverIds (remove adminId)
        const driverIds = [];
        snapshot.forEach(doc => {
            const chatData = doc.data();
            console.log('chatData =>', chatData)

            if (chatData.driver && Array.isArray(chatData.driver)) {
                chatData.driver.forEach(uId => {
                    console.log('chatId =>', uId)

                    if (uId !== adminId) {
                        driverIds.push(uId);
                    }
                });
            }
        });

        // 🔹 Fetch Driver details from MongoDB
        const drivers = await Driver.find({ _id: { $in: driverIds } })
            .select("personalInfo.name personalInfo.profilePicture")
            .lean();
        console.log('ddd =>', drivers)

        return res.render("pages/helpSupport/driverChat", { drivers });
    } catch (err) {
        console.error("❌ Error fetching chat drivers:", err.message);
        return res.status(500).send("Error loading chat page");
    }
};


// const { initFirebaseAdmin1 } = require("../../../../config/firebasebk");
// const User = require("../models/userModal");

// const adminId = "ONP1234567890"; // Static Admin ID

// 🔹 Ensure chat exists or return existing chat

const driverCreateOrGetChat = async (driverId, adminId, db) => {
    const chatId = `${driverId}_${adminId}`;
    const chatRef = db.collection("driverChats").doc(chatId);
    const chatDoc = await chatRef.get();

    if (!chatDoc.exists) {
        await chatRef.set({
            drivers: [driverId, adminId],
            createdAt: new Date(),
            lastMessage: null,
        });
    }

    return chatRef;
};

// 🔹 Helper: fetch all chat messages
const driverFetchMessages = async (driverId, db) => {
    const chatRef = db.collection("driverChats").doc(`${driverId}_${adminId}`);
    const messagesRef = chatRef.collection("messages").orderBy("timestamp", "asc");

    const snapshot = await messagesRef.get();
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
};

// 🔹 Save a new chat message
const driverSaveChatMessage = async (req, res) => {

    const driverId = req.header("driverid");
    const { message, isDriverSended } = req.body;

    try {
        if (!driverId || !message || typeof isDriverSended !== "boolean") {
            return res.status(200).json({
                success: false,
                error: "Missing required fields or invalid isDriverSended (must be boolean)",
            });
        }

        // ✅ Fetch driver details
        const driverDetail = await Driver.findById(driverId).select("personalInfo.name personalInfo.profilePicture").lean();
        if (!driverDetail) {
            return res.status(200).json({ success: false, error: "Driver not found" });
        }

        const { db } = await initFirebaseAdmin1();

        // ✅ Ensure chat exists
        const chatRef = await driverCreateOrGetChat(driverId, adminId, db);
        const messagesRef = chatRef.collection("messages");

        const newMessage = {
            adminId,
            driverId,
            message,
            isDriverSended,
            timestamp: new Date().toISOString(),
        };

        await messagesRef.add(newMessage);

        // ✅ Update last message for quick listing
        await chatRef.update({
            lastMessage: message,
            updatedAt: new Date(),
        });

        // ✅ Fetch updated conversation
        const messages = await driverFetchMessages(driverId, db);

        return res.status(200).json({
            success: true,
            message: "Message saved",
            driverDetail,
            data: messages,
        });
    } catch (err) {
        console.error("❌ Error saving chat:", err.message);
        return res.status(500).json({ error: "Error saving chat" });
    }
};

// 🔹 Get all messages between a driver and admin
const driverGetChatMessages = async (req, res) => {
    const driverId = req.header("driverid");

    try {
        if (!driverId) {
            return res.status(200).json({ success: false, error: "Missing driverId" });
        }

        // ✅ Fetch driver details
        const driverDetail = await Driver.findById(driverId).select("personalInfo.name personalInfo.profilePicture").lean();
        if (!driverDetail) {
            return res.status(200).json({ success: false, error: "Driver not found" });
        }

        const { db } = await initFirebaseAdmin1();

        // ✅ Ensure chat exists
        await driverCreateOrGetChat(driverId, adminId, db);

        // ✅ Fetch messages
        const messages = await driverFetchMessages(driverId, db);

        return res.status(200).json({
            success: true,
            driverDetail,
            data: messages,
        });
    } catch (err) {
        console.error("❌ Error fetching chat:", err.message);
        return res.status(500).json({ error: "Error fetching chat" });
    }
};


const createOrGetChat = async (userId, adminId, db) => {
    const chatId = `${userId}_${adminId}`;
    const chatRef = db.collection("chats").doc(chatId);
    const chatDoc = await chatRef.get();

    if (!chatDoc.exists) {
        await chatRef.set({
            users: [userId, adminId],
            createdAt: new Date(),
            lastMessage: null,
        });
    }

    return chatRef;
};

// 🔹 Helper: fetch all chat messages
const fetchMessages = async (userId, db) => {
    const chatRef = db.collection("chats").doc(`${userId}_${adminId}`);
    const messagesRef = chatRef.collection("messages").orderBy("timestamp", "asc");

    const snapshot = await messagesRef.get();
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
};

// 🔹 Save a new chat message
const saveChatMessage = async (req, res) => {
    const userId = req.header("userid");
    const { message, isUserSended } = req.body;

    try {
        if (!userId || !message || typeof isUserSended !== "boolean") {
            return res.status(200).json({
                success: false,
                error: "Missing required fields or invalid isUserSended (must be boolean)",
            });
        }

        // ✅ Fetch user details
        const userDetail = await User.findById(userId).select("fullName profilePicture").lean();
        if (!userDetail) {
            return res.status(200).json({ success: false, error: "User not found" });
        }

        const { db } = await initFirebaseAdmin1();

        // ✅ Ensure chat exists
        const chatRef = await createOrGetChat(userId, adminId, db);
        const messagesRef = chatRef.collection("messages");

        const newMessage = {
            adminId,
            userId,
            message,
            isUserSended,
            timestamp: new Date().toISOString(),
        };

        await messagesRef.add(newMessage);

        // ✅ Update last message for quick listing
        await chatRef.update({
            lastMessage: message,
            updatedAt: new Date(),
        });

        // ✅ Fetch updated conversation
        const messages = await fetchMessages(userId, db);

        return res.status(200).json({
            success: true,
            message: "Message saved",
            userDetail,
            data: messages,
        });
    } catch (err) {
        console.error("❌ Error saving chat:", err.message);
        return res.status(500).json({ error: "Error saving chat" });
    }
};

// 🔹 Get all messages between a user and admin
const getChatMessages = async (req, res) => {
    const userId = req.header("userid");

    try {
        if (!userId) {
            return res.status(200).json({ success: false, error: "Missing userId" });
        }

        // ✅ Fetch user details
        const userDetail = await User.findById(userId).select("fullName profilePicture").lean();
        if (!userDetail) {
            return res.status(200).json({ success: false, error: "User not found" });
        }

        const { db } = await initFirebaseAdmin1();

        // ✅ Ensure chat exists
        await createOrGetChat(userId, adminId, db);

        // ✅ Fetch messages
        const messages = await fetchMessages(userId, db);

        return res.status(200).json({
            success: true,
            userDetail,
            data: messages,
        });
    } catch (err) {
        console.error("❌ Error fetching chat:", err.message);
        return res.status(500).json({ error: "Error fetching chat" });
    }
};


module.exports = { getChatMessages, saveChatMessage, driverGetChatMessages, driverSaveChatMessage, chatPage, driverChatPage };

