require('dotenv').config();
const jwt = require('jsonwebtoken');
const User = require('../models/userModal')

const secretKey = process.env.JWT_SECRET;

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    const userId = req.headers['userid'];

    const serviceId = req.headers['serviceid'];
    const serviceType = req.headers['servicetype'];

    const deviceToken = req.headers['devicetoken'];

    if (!deviceToken) {
        return res.status(200).json({ success: false, message: 'Device Token Is Missing' });
    }

    const user = await User.findById(userId);

    if (!user) {
        return res.status(200).json({ success: false, message: 'User not found' });
    }

    // Update device token if different
    if (user.deviceToken !== deviceToken) {
        await User.updateOne({ _id: userId }, { $set: { deviceToken } });
    }


    if (!token) {
        return res.status(200).json({ success: false, message: 'Jwt Token is missing' });
    }
    if (!userId) {
        return res.status(200).json({ success: false, message: 'User Id is missing' });
    }
    if (!serviceId) {
        return res.status(200).json({ success: false, message: 'Service ID is missing' });
    }
    if (!serviceType) {
        return res.status(200).json({ success: false, message: 'Service Type Is Missing' });
    }

    try {
        const decoded = jwt.verify(token, secretKey);
        req.user = decoded; // contains userId and mobileNumber
        next();
    } catch (err) {
        return res.status(200).json({ success: false, message: 'Invalid Jwt token' });
    }
};
const headerAuth = async (req, res, next) => {
    const deviceType = req.headers['devicetype']; // headers are lowercase

    if (!deviceType) {
        return res.status(200).json({ success: false, message: 'DeviceType is missing' });
    } else {
        next();
    }
};


module.exports = { verifyToken, headerAuth };
