const mongoose = require('mongoose');


// await mongoose.connect('mongodb://localhost:27017/OnPointsLogistics', {

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected');
    } catch (err) {
        console.error('Connection error', err);
        process.exit(1);
    }
};

module.exports = connectDB;
