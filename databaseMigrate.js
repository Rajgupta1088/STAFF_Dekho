const mongoose = require('mongoose');

// Connect to both databases
const liveConn = mongoose.createConnection('mongodb+srv://onpointlogistics688:vAfVPAi5d5e2Wl7b@cluster0.mcl2w.mongodb.net/onpoint?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const devConn = mongoose.createConnection('mongodb+srv://onpointlogistics688:vAfVPAi5d5e2Wl7b@cluster0.mcl2w.mongodb.net/devonpoint?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

(async () => {
    try {
        // Wait for both connections
        await Promise.all([liveConn.asPromise(), devConn.asPromise()]);

        // Get all collection names from the live DB
        const collections = await liveConn.db.listCollections().toArray();

        console.log(`Found ${collections.length} collections. Copying...`);

        for (const col of collections) {
            const name = col.name;

            console.log(`📥 Copying collection: ${name}`);

            // Get data from live
            const LiveModel = liveConn.model(name, new mongoose.Schema({}, { strict: false }), name);
            const DevModel = devConn.model(name, new mongoose.Schema({}, { strict: false }), name);

            const data = await LiveModel.find().lean();

            // Optional: Clear dev collection before insert (or use insertMany without delete)
            await DevModel.deleteMany({});
            if (data.length) {
                await DevModel.insertMany(data);
            }

            console.log(`✅ Copied ${data.length} documents to ${name}`);
        }

        console.log('🎉 All collections copied from live to dev!');
    } catch (err) {
        console.error('❌ Error during copy:', err);
    } finally {
        await liveConn.close();
        await devConn.close();
    }
})();
