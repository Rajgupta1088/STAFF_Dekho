const Rating = require('../models/ratingModal');
const FTL = require('../../../api/user/models/ftlPaymentModal');
const PaymentDetail = require('../../../api/user/models/paymentModal');

const driverRating = async (req, res) => {
    const serviceType = req.header('servicetype');
    const isPTL = serviceType == 1;

    const id = isPTL ? req.body.packageId : req.body.requestId;
    const Model = isPTL ? PaymentDetail : FTL;

    if (!id) {
        return res.status(400).json({
            success: false,
            message: isPTL ? 'packageId is required' : 'requestId is required'
        });
    }

    try {
        const { driverId, rating, comment } = req.body;
        const userId = req.headers['userid'];

        if (!driverId || !userId || rating === undefined) {
            return res.status(400).json({ success: false, message: 'driverId, userId, and rating are required fields' });
        }

        // Validate rating is between 1 and 5
        const parsedRating = Number(rating);
        if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
            return res.status(400).json({ success: false, message: 'Rating must be a number between 1 and 5' });
        }

        // Check if user already rated this request/package
        const alreadyRated = await Rating.findOne({ userId, requestId: id });
        if (alreadyRated) {
            return res.status(409).json({ success: false, message: 'You have already rated this request.' });
        }

        // Create new rating
        const newRating = new Rating({
            driverId,
            userId,
            rating: parsedRating,
            comment,
            requestId: id
        });

        await newRating.save();

        // Mark payment/FTL entry as rated
        await Model.updateOne({ _id: id }, { $set: { isRated: 1 } });

        res.status(201).json({ success: true, message: 'Thanks for rating.', data: newRating });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { driverRating };
