// Render the Faq management page
const Driver = require('../../../api/driver/modals/driverModal');
const { sendNotification } = require('../../../api/driver/controllers/notificationController'); // path as needed

const FTL = require('../../../api/user/models/ftlPaymentModal');
const { isValidObjectId } = require('mongoose');
const Bidding = require('../../../api/driver/modals/biddingModal'); // Adjust path as per your project
const Rating = require('../../../api/user/models/ratingModal'); // Adjust path as per your project

const ftlPage = (req, res) => {
    res.render('pages/ftlManagement/ftl');
};

const moment = require('moment');

const ftlList = async (req, res) => {
    try {
        const { start = 0, length = 10, order = [], draw } = req.body;

        // Custom search filters
        const {
            pickupAddress,
            dropAddress,
            vehcileName,
            isBidding,
            orderId,
            isAccepted,
            isPartialPayment,
            transactionStatus
        } = req.body;

        let query = {};
        let sort = {};

        const admin = req.session.admin || {};
        const isVendor = admin?.isVendor == 1 ? 1 : 0;
        const adminId = admin.id || null;
        const adminType = admin.admin_type;

        if (isVendor == 1) {
            query.isVendor = 1;
            console.log('vendor management');
            query.vendorId = adminId;


        }
        // Specific filters
        if (pickupAddress) query.pickupAddress = { $regex: pickupAddress.trim(), $options: 'i' };
        if (dropAddress) query.dropAddress = { $regex: dropAddress.trim(), $options: 'i' };
        if (vehcileName) query.vehicleName = { $regex: vehcileName.trim(), $options: 'i' };
        if (isBidding !== undefined && isBidding !== '') query.isBidding = parseInt(isBidding);
        if (orderId) query.orderId = { $regex: orderId.trim(), $options: 'i' };
        if (isAccepted !== undefined && isAccepted !== '') query.isAccepted = parseInt(isAccepted);
        if (isPartialPayment !== undefined && isPartialPayment !== '') query.isPartialPayment = parseInt(isPartialPayment);
        if (transactionStatus !== undefined && transactionStatus !== '') query.transactionStatus = parseInt(transactionStatus);

        // Sorting
        if (order.length > 0) {
            const columnIndex = parseInt(order[0].column);
            const direction = order[0].dir === 'asc' ? -1 : -1;
            const columnMap = {
                1: 'pickupAddress',
                2: 'dropAddress',
                3: 'vehicleName',
                4: 'isBidding',
                7: 'orderId',
                9: 'isAccepted',
                10: 'isPartialPayment',
                11: 'transactionStatus',
            };
            const sortField = columnMap[columnIndex];
            sort = sortField ? { [sortField]: direction } : { createdAt: -1 };
        } else {
            sort = { createdAt: -1 };
        }
        sort = { createdAt: -1 };


        const totalRecords = await FTL.countDocuments();
        const filteredRecords = await FTL.countDocuments(query);

        const ftlDetails = await FTL.find(query)
            .skip(Number(start))
            .limit(Number(length))
            .sort(sort)
            .populate({ path: 'userId', select: 'fullName' })
            .populate({ path: 'driverId', select: 'personalInfo.name' });

        return res.status(200).json({
            draw,
            recordsTotal: totalRecords,
            recordsFiltered: filteredRecords,
            data: ftlDetails
        });
    } catch (error) {
        console.error('FTL List Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


const mongoose = require('mongoose');

const ftlOrderDetail = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(200).json({ success: false, message: 'Invalid order id.' });
        }

        const ftlDetail = await FTL.findById(id).lean();
        if (!ftlDetail) {
            return res.status(200).json({ success: false, message: 'FTL order not found.' });
        }

        // Use id as requestId
        const allBidding = await Bidding.find({ requestId: id })
            .populate({ path: 'driverId', select: 'personalInfo' })
            .select('driverId biddingAmount')
            .lean();

        const driverIds = allBidding
            .map(bid => bid.driverId?._id)
            .filter(Boolean);

        // Fetch average ratings for all drivers in one query
        const ratingAggregation = await Rating.aggregate([
            {
                $match: {
                    driverId: { $in: driverIds }
                }
            },
            {
                $group: {
                    _id: '$driverId',
                    averageRating: { $avg: '$rating' },
                    totalRatings: { $sum: 1 }
                }
            }
        ]);

        const ratingMap = ratingAggregation.reduce((acc, r) => {
            acc[r._id.toString()] = {
                averageRating: Number(r.averageRating).toFixed(1),
                totalRatings: r.totalRatings
            };
            return acc;
        }, {});

        // Build bidding response
        const bidding = allBidding.map(bid => {
            const driverIdStr = bid.driverId?._id?.toString();
            const rating = ratingMap[driverIdStr] || { averageRating: "0", totalRatings: 0 };

            return {
                averageRating: rating.averageRating,
                totalRatings: rating.totalRatings,
                biddingAmount: Number(bid.biddingAmount).toFixed(2),
                driverName: bid.driverId?.personalInfo?.name || 'N/A',
                driverProfile: bid.driverId?.personalInfo?.profilePicture || null,
                driverId: driverIdStr || null
            };
        });

        return res.status(200).json({ success: true, data: { ...ftlDetail, bidding } });
    } catch (err) {
        console.error("Error fetching FTL order detail:", err);
        return res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
};


const ftlOutstationDriverList = async (req, res) => {
    try {
        const drivers = await Driver.find({ approvalStatus: 1, serviceType: 3 });


        return res.status(200).json({
            status: true,
            drivers
        });
    } catch (error) {
        console.error("Error fetching warehouse data:", error);
        return res.status(500).json({
            status: false,
            message: "Internal Server Error"
        });
    }
};

const ftlManualAssignDriver = async (req, res) => {
    try {
        const { driverId, ftlId } = req.body;

        // ✅ Validation
        if (!driverId) {
            return res.status(400).json({ status: false, message: "Driver ID is required" });
        }
        if (!ftlId) {
            return res.status(400).json({ status: false, message: "FTL ID is required" });
        }

        // ✅ Update FTL with driverId
        const updatedFTL = await FTL.findOneAndUpdate(
            { _id: ftlId },
            { $set: { driverId, serviceType: 3, transactionStatus: 1, isAccepted: 1 } },
            { new: true }
        );

        if (!updatedFTL) {
            return res.status(200).json({ status: false, message: "FTL record not found" });
        }

        // ✅ Send Notification (non-blocking)
        sendNotification({
            title: "FTL Order Assigned",
            message: "You have been assigned a new FTL order",
            recipientId: driverId,
            recipientType: "driver",
            notificationType: "order",
            referenceId: updatedFTL._id,
            referenceScreen: "ftlOrderAssign",
        }).catch(err => {
            console.error("⚠️ Notification Error:", err.message);
        });

        return res.status(200).json({
            status: true,
            message: "Driver assigned successfully",
            data: updatedFTL,
        });

    } catch (error) {
        console.error("❌ Error assigning driver to FTL:", error);
        return res.status(500).json({
            status: false,
            message: "Internal Server Error",
        });
    }
};


module.exports = { ftlPage, ftlList, ftlOrderDetail, ftlOutstationDriverList, ftlManualAssignDriver }