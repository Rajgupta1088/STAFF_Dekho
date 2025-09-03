const admin = require("firebase-admin");
const settingModel = require("../src/admin/models/configuration/settingModel");

let firebaseApp;
let db;
let auth;

const initFirebaseAdmin1 = async () => {
    if (firebaseApp && db) {
        console.log("⚡ Firebase already initialized");
        return { firebaseApp, db, auth };
    }

    // Get credentials from DB
    const fireCredentialData = await settingModel
        .findOne({ firebase: { $exists: true } })
        .sort({ createdAt: -1 });

    if (!fireCredentialData || !fireCredentialData.firebase) {
        throw new Error("❌ Firebase credentials not found in DB.");
    }

    const credentials = fireCredentialData.firebase;

    if (!credentials.private_key || !credentials.client_email || !credentials.project_id) {
        throw new Error("❌ Firebase credentials are incomplete.");
    }

    // Fix private_key formatting
    credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");

    // Initialize Firebase
    try {
        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert(credentials),
            databaseURL: credentials.databaseURL || undefined,
        });

        db = admin.firestore();
        auth = admin.auth();

        console.log("✅ Firebase Admin initialized successfully");
    } catch (err) {
        console.error("❌ Firebase init error:", err.message);
        throw err;
    }

    // 🔹 Test Firestore connection
    try {
        await db.collection("test").doc("connection-check").set({
            status: "ok",
            time: new Date(),
        });
        console.log("✅ Firestore test write successful");
    } catch (err) {
        console.error("❌ Firestore test write failed:", err.message);
        throw err;
    }

    return { firebaseApp, db, auth };
};

module.exports = { initFirebaseAdmin1 };
