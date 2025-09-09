require('dotenv').config();
const jwt = require('jsonwebtoken');
const Candidate = require('../modals/candidateProfileModel')

const secretKey = process.env.JWT_SECRET;

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    const candidateId = req.headers['candidateid'];

    const deviceToken = req.headers['devicetoken'];

    if (!deviceToken) {
        return res.status(200).json({ success: false, message: 'Device Token Is Missing' });
    }

    const candidate = await Candidate.findById(candidateId);

    if (!candidate) {
        return res.status(200).json({ success: false, message: 'Candidate not found' });
    }

    // Update device token if different
    if (candidate.deviceToken !== deviceToken) {
        await Candidate.updateOne({ _id: candidateId }, { $set: { deviceToken } });
    }


    if (!token) {
        return res.status(200).json({ success: false, message: 'Jwt Token is missing' });
    }
    if (!candidateId) {
        return res.status(200).json({ success: false, message: 'Candidate Id is missing' });
    }

    try {
        const decoded = jwt.verify(token, secretKey);
        req.candidate = decoded; // contains candidateId and mobileNumber
        next();
    } catch (err) {
        return res.status(200).json({ success: false, message: 'Invalid Jwt token' });
    }
};
const headerAuth = async (req, res, next) => {
    const deviceType = req.headers['devicetype']; // headers are lowercase
    const deviceId = req.headers['deviceid']; // headers are lowercase

    if (!deviceType) {
        return res.status(200).json({ success: false, message: 'DeviceType is missing' });
    }
    else if (!deviceId) {
        return res.status(200).json({ success: false, message: 'Device Id is missing' });
    } else {
        next();
    }
};


module.exports = { verifyToken, headerAuth };
