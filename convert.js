const mongoose = require('mongoose');
const Tracking = require('./src/admin/models/websiteManagement/trackingModel');

// New collection with dynamic schema
const trackingNewSchema = new mongoose.Schema({}, { strict: false });
const TrackingNew = mongoose.model('TrackingNew', trackingNewSchema);

async function copyAndTransformTrackingData() {
    try {
        // 1️⃣ Connect to MongoDB
        await mongoose.connect('mongodb+srv://onpointlogistics688:vAfVPAi5d5e2Wl7b@cluster0.mcl2w.mongodb.net/onpoint?retryWrites=true&w=majority', {

            useNewUrlParser: true, useUnifiedTopology: true
        }
        );
        console.log('✅ Connected to MongoDB');

        // 2️⃣ Fetch all documents from Tracking
        const trackings = await Tracking.find({}).lean();
        console.log(`Found ${trackings.length} records`);

        // 3️⃣ Transform each document
        const transformedData = trackings.map(doc => {
            const oldStatus = doc.deliveryStatus || {};

            const newStatus = [
                {}, // Index 0 placeholder
                {
                    type: "Pickup",
                    status: oldStatus["1"]?.status ?? 0,
                    deliveryDateTime: oldStatus["1"]?.deliveryDateTime || ""
                },
                {
                    type: "InTransit",
                    status: oldStatus["2"]?.status ?? 0,
                    transitData: oldStatus["2"]?.transitData || []
                },
                {
                    type: "OutForDelivery",
                    status: oldStatus["3"]?.status ?? 0,
                    deliveryDateTime: oldStatus["3"]?.deliveryDateTime || ""
                },
                {
                    type: "Delivered",
                    status: oldStatus["4"]?.status ?? 0,
                    deliveryDateTime: oldStatus["4"]?.deliveryDateTime || "",
                    pod: oldStatus["4"]?.pod || ""
                },
                {
                    type: "Cancelled",
                    status: oldStatus["5"]?.status ?? 0,
                    deliveryDateTime: oldStatus["5"]?.deliveryDateTime || ""
                },
                {
                    type: "Hold",
                    status: oldStatus["6"]?.status ?? 0,
                    deliveryDateTime: oldStatus["6"]?.deliveryDateTime || ""
                }
            ];

            // Remove _id to avoid duplicate key issues
            const { _id, ...rest } = doc;

            // Return transformed document
            return {
                ...rest,
                deliveryStatus: newStatus
            };
        });

        // 4️⃣ Insert into new collection "trackingnew"
        await TrackingNew.insertMany(transformedData);
        console.log(`✅ Successfully inserted ${transformedData.length} records into "trackingnew"`);

        mongoose.connection.close();
    } catch (err) {
        console.error('❌ Error:', err);
        mongoose.connection.close();
    }
}

copyAndTransformTrackingData();
