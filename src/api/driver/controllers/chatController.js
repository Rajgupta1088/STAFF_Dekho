const { initFirebaseAdmin1 } = require("../../../../config/firebasebk");
const Driver = require("../modals/driverModal");

const adminId = "ONP1234567890"; // Static Admin ID

// 🔹 Ensure chat exists or return existing chat
const createOrGetChat = async (driverId, adminId, db) => {
    const chatId = `${driverId}_${adminId}`;
    const chatRef = db.collection("driverChats").doc(chatId);
    const chatDoc = await chatRef.get();

    if (!chatDoc.exists) {
        await chatRef.set({
            driver: [driverId, adminId],
            createdAt: new Date(),
            lastMessage: null,
        });
    }

    return chatRef;
};

// 🔹 Helper: fetch all chat messages
const fetchMessages = async (driverId, db) => {
    const chatRef = db.collection("driverChats").doc(`${driverId}_${adminId}`);
    const messagesRef = chatRef.collection("messages").orderBy("timestamp", "asc");

    const snapshot = await messagesRef.get();
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
};

// 🔹 Save a new chat message
const saveChatMessage = async (req, res) => {
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
            return res.status(200).json({ success: false, error: "driver not found" });
        }

        const { db } = await initFirebaseAdmin1();

        // ✅ Ensure chat exists
        const chatRef = await createOrGetChat(driverId, adminId, db);
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
        const messages = await fetchMessages(driverId, db);

        return res.status(200).json({
            success: true,
            message: "Message saved",
            driverDetail,
            data: messages,
        });
    } catch (err) {
        console.error("❌ Error saving chat:", err.message);
        return res.status(500).json({ error: "Error saving chat", return: err.message });

    }
};

// 🔹 Get all messages between a driver and admin
const getChatMessages = async (req, res) => {
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
        await createOrGetChat(driverId, adminId, db);

        // ✅ Fetch messages
        const messages = await fetchMessages(driverId, db);

        return res.status(200).json({
            success: true,
            driverDetail,
            data: messages,
            message: "Message fetch Successfully",

        });
    } catch (err) {
        console.error("❌ Error fetching chat:", err.message);
        return res.status(500).json({ error: "Error fetching chat", return: err.message });

    }
};

// 🔹 Fetch driver who already have a chat
const chatPage = async (req, res) => {
    try {
        const { db } = await initFirebaseAdmin1();

        // ✅ Fetch all chats from Firestore
        const snapshot = await db.collection("driverChats").get();

        if (snapshot.empty) {
            return res.render("pages/helpSupport/chat", { driver: [] });
        }

        // ✅ Extract driverIds (excluding adminId)
        const driverIds = [];
        snapshot.forEach(doc => {
            const chatData = doc.data();
            if (chatData.driver && Array.isArray(chatData.driver)) {
                chatData.driver.forEach(uId => {
                    if (uId !== adminId) {
                        driverIds.push(uId);
                    }
                });
            }
        });

        // ✅ Fetch driver details from MongoDB
        const driver = await Driver.find({ _id: { $in: driverIds } })
            .select("personalInfo.name personalInfo.profilePicture")
            .lean();

        return res.render("pages/helpSupport/chat", { driver });
    } catch (err) {
        console.error("❌ Error fetching chat driver:", err.message);
        return res.status(500).send("Error loading chat page");
    }
};

module.exports = { getChatMessages, saveChatMessage, chatPage };
