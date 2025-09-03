const TwoWheeler = require('../../../api/user/models/twoWheelerModal');
const Rating = require('../../../api/user/models/ratingModal');
const { isValidObjectId } = require('mongoose');

// Render the two-wheeler management page
const twoWheelerPage = (req, res) => {
    res.render('pages/twoWheelerManagement/twoWheeler');
};

// Fetch list of two-wheeler orders
const twoWheelerList = async (req, res) => {
    try {
        const {
            start = 0,
            length = 10,
            order = [],
            draw,
            pickupAddress,
            dropAddress,
            vehcileName,
            orderId,
            isAccepted,
            transactionStatus
        } = req.body;

        const query = {};
        const admin = req.session.admin || {};
        const isVendor = admin?.isVendor == 1;
        const adminId = admin.id || null;

        if (isVendor) {
            query.isVendor = 1;
            query.vendorId = adminId;
        }

        // Apply search filters
        if (pickupAddress) query.pickupAddress = { $regex: pickupAddress.trim(), $options: 'i' };
        if (dropAddress) query.dropAddress = { $regex: dropAddress.trim(), $options: 'i' };
        if (vehcileName) query.vehicleName = { $regex: vehcileName.trim(), $options: 'i' };
        if (orderId) query.orderId = { $regex: orderId.trim(), $options: 'i' };
        if (isAccepted !== undefined && isAccepted !== '') query.isAccepted = parseInt(isAccepted);
        if (transactionStatus !== undefined && transactionStatus !== '') query.transactionStatus = parseInt(transactionStatus);

        // Define sorting
        const columnMap = {
            1: 'pickupAddress',
            2: 'dropAddress',
            6: 'orderId',
            7: 'isAccepted',
            9: 'transactionStatus',
        };

        let sort = { createdAt: -1 }; // default
        if (order.length > 0) {
            const columnIndex = parseInt(order[0].column);
            const direction = order[0].dir === 'asc' ? 1 : -1;
            const sortField = columnMap[columnIndex];
            if (sortField) {
                sort = { [sortField]: direction };
            }
        }

        // Pagination and fetching
        const [totalRecords, filteredRecords, twoWheelerDetails] = await Promise.all([
            TwoWheeler.countDocuments(),
            TwoWheeler.countDocuments(query),
            TwoWheeler.find(query)
                .skip(Number(start))
                .limit(Number(length))
                .sort(sort)
                .populate({ path: 'userId', select: 'fullName' })
                .populate({ path: 'driverId', select: 'personalInfo.name vehicleDetail.vehicleName' })
        ]);

        return res.status(200).json({
            draw,
            recordsTotal: totalRecords,
            recordsFiltered: filteredRecords,
            data: twoWheelerDetails
        });

    } catch (error) {
        console.error('TwoWheeler List Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Get specific two-wheeler order detail
const twoWheelerOrderDetail = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: 'Invalid order ID.' });
        }

        const orderDetail = await TwoWheeler.findById(id).lean();

        if (!orderDetail) {
            return res.status(404).json({ success: false, message: 'TwoWheeler order not found.' });
        }

        return res.status(200).json({ success: true, data: orderDetail });

    } catch (err) {
        console.error('Error fetching TwoWheeler order detail:', err);
        return res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

module.exports = {
    twoWheelerPage,
    twoWheelerList,
    twoWheelerOrderDetail
};
