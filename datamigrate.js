const mongoose = require('mongoose');

const sourceUri = 'mongodb+srv://onpointlogistics688:vAfVPAi5d5e2Wl7b@cluster0.mcl2w.mongodb.net/onpoint?retryWrites=true&w=majority';
const destUri = 'mongodb+srv://onpointlogistics688:vAfVPAi5d5e2Wl7b@cluster0.mcl2w.mongodb.net/devonpoint?retryWrites=true&w=majority';


const SourceModel = mongoose.createConnection(destUri).model('warehouses', new mongoose.Schema({}, { strict: false }));
const DestModel = mongoose.createConnection(sourceUri).model('warehouses', new mongoose.Schema({}, { strict: false }));

(async () => {
    try {
        const data = await SourceModel.find({});
        await DestModel.insertMany(data);
        console.log('Data migrated from source to destination live DB');
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit();
    }
})();
