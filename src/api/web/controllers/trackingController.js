const TrackingModel = require('../../../admin/models/websiteManagement/trackingModel');
const PTLModel = require('../../user/models/paymentModal');
const FTLModel = require('../../user/models/ftlPaymentModal');
const TwoWheelerModel = require('../../user/models/twoWheelerModal');

const getTrackingData = async (req, res) => {
    try {
        const { trackingId } = req.body;

        if (!trackingId) {
            return res.status(200).json({ success: false, message: 'Tracking ID is required', data: [] });
        }

        let trackingDetails = null;
        let source = null;

        // Function to format tracking data into a consistent structure
        const formatTrackingData = (data) => ({
            status: data.status || data.orderStatus,
            deliveryStatus: data.deliveryStatus || '',
            pod: data.pod || '',
            trackingId: data.trackingId || data.orderId || '',
            estimateDate: data.estimateDate || '',
            currentLocation: data.currentLocation || '',
            pickUpLocation: data.pickUpLocation || data.pickupAddress || '',
            dropLocation: data.dropLocation || data.dropAddress || '',
            transportMode: data.transportMode || '',
            noOfPacking: data.noOfPacking || '',
            boxes: data.boxes || '',
            fullDetails: data
        });

        if (trackingId.startsWith('OPL')) {
            const models = [
                { model: PTLModel, label: 'PTL' },
                { model: FTLModel, label: 'FTL' },
                { model: TwoWheelerModel, label: 'TwoWheeler' }
            ];

            for (const { model, label } of models) {
                trackingDetails = await model.findOne({ orderId: trackingId }).lean();
                if (trackingDetails) {
                    source = label;
                    break;
                }
            }
        } else {
            trackingDetails = await TrackingModel.findOne({ trackingId }).lean();
            if (trackingDetails) source = 'WebsiteTracking';
        }

        if (trackingDetails) {
            const responseData = formatTrackingData(trackingDetails);
            return res.status(200).json({
                success: true,
                message: 'Tracking Data Found',
                data: [responseData],
                source
            });
        }

        return res.status(200).json({
            success: false,
            message: 'No Tracking Data Found',
            data: [],
            source: null
        });

    } catch (error) {
        console.error('Error Getting Tracking Data:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch tracking data. Please try again later.',
            error: error.message,
            data: [],
            source: null
        });
    }
};

module.exports = { getTrackingData };
