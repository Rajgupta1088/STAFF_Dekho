require('dotenv').config();
const jwt = require('jsonwebtoken');
const Driver = require('../../../api/driver/modals/driverModal'); // Assuming the common function is located in '../utils/distanceCalculate'

const secretKey = process.env.JWT_SECRET;

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    const driverId = req.headers['driverid'];
    const deviceToken = req.headers['devicetoken'];


    if (!token) {
        return res.status(200).json({ success: false, message: 'Token is missing' });
    }
    if (!driverId) {
        return res.status(200).json({ success: false, message: 'Driver Id is missing' });
    }
    if (!deviceToken) {
        return res.status(200).json({ success: false, message: 'Device Token is missing' });
    }



    const driver = await Driver.findById(driverId);

    if (!driver) {
        return res.status(200).json({ success: false, message: 'Driver not found' });
    }

    // Update device token if different
    if (driver.deviceToken !== deviceToken) {
        await Driver.updateOne({ _id: driverId }, { $set: { deviceToken } });
    }


    try {
        const decoded = jwt.verify(token, secretKey);
        req.user = decoded; // contains driverId and mobileNumber
        next();
    } catch (err) {
        return res.status(200).json({ success: false, message: 'Invalid Jwt token' });
    }
};

const headerAuth = async (req, res, next) => {
    const deviceType = req.headers['devicetype']; // headers are lowercase
    const deviceId = req.headers['deviceid']; // headers are lowercase
    const deviceToken = req.headers['devicetoken']; // headers are lowercase
    const serviceId = req.headers['serviceid']; // headers are lowercase
    const serviceType = req.headers['servicetype']; // headers are lowercase

    if (!deviceType) {
        return res.status(200).json({ success: false, message: 'DeviceType is missing' });
    } else if (!deviceId) {
        return res.status(200).json({ success: false, message: 'Device Id is missing' });
    } else if (!serviceId) {
        return res.status(200).json({ success: false, message: 'Service Id Is Missing' });
    } else if (!serviceType) {
        return res.status(200).json({ success: false, message: 'Service Type Is Missing' });
    }
    else {
        next();
    }
};


module.exports = { verifyToken, headerAuth };
