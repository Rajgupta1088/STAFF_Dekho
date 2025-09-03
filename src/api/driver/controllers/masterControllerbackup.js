const DriverAssign = require('../../../admin/models/ptlPackages/driverPackageAssignModel');
const FTL = require('../../user/models/ftlPaymentModal');
const TwoWheeler = require('../../user/models/twoWheelerModal');
const Service = require('../../../admin/models/vehcileManagement/serviceManagementModel');
const DriverModal = require('../modals/driverModal');
const { getDriverLocation } = require('./serviceController');
const { getArrivalTime, getDistanceAndDuration } = require('../utils/distanceCalculate');

const sendNoPendingResponse = (res, { approvalStatus, isOnline, serviceType, completedCount, cancelledCount }) => {
    res.status(200).json({
        success: true,
        message: 'No pending requests',
        data: {
            driverApprovalStatus: approvalStatus,
            isOnline,
            pendingRequest: 0,
            assignId: '',
            serviceType,
            isWallet: serviceType == 1 ? 0 : 1,
            request: [],
            tripCount: { completedCount, cancelledCount }
        }
    });
};

const countTrips = (trips, completedKey = 'status') => ({
    completedCount: trips.filter(t => t[completedKey] === 4).length,
    cancelledCount: trips.filter(t => t[completedKey] === 5).length
});

const masterDetail = async (req, res) => {
    try {
        const serviceId = req.header('serviceid');
        const driverId = req.header('driverid');
        if (!driverId) return res.status(200).json({ success: false, message: "Driver ID is required in headers." });

        const [serviceDoc, driverData] = await Promise.all([
            Service.findById(serviceId).select('serviceType'),
            DriverModal.findOne({ _id: driverId, status: 1 }).lean()
        ]);

        const serviceType = parseInt(serviceDoc?.serviceType);
        const approvalStatus = driverData?.approvalStatus || 0;
        const isOnline = driverData?.isOnline || 0;

        const driverLocation = await getDriverLocation(driverId);
        if (!driverLocation?.lat || !driverLocation?.long) {
            return res.status(200).json({ success: false, message: "Please update driver's current location" });
        }

        const { lat, long } = driverLocation;

        let requestData = [];
        let completedCount = 0;
        let cancelledCount = 0;

        // PTL (serviceType = 1)
        if (serviceType === 1) {
            const [pending, history] = await Promise.all([
                DriverAssign.find({
                    driverId,
                    pickupStatus: { $ne: 0 },
                    status: { $nin: [4, 5] }
                }).sort({ createdAt: -1 })
                    .populate('userId', 'fullName')
                    .populate('packageId', 'packages'),
                DriverAssign.find({ driverId, status: { $in: [4, 5] } })
            ]);

            ({ completedCount, cancelledCount } = countTrips(history));

            if (!pending.length) {
                return sendNoPendingResponse(res, { approvalStatus, isOnline, serviceType, completedCount, cancelledCount });
            }

            const headersByStep = {
                1: { top: 'Arriving', bottom: 'Way to Pickup', buttonText: 'Arriving to Pickup' },
                2: { top: 'Arrived', bottom: 'Arrived at Pickup Location', buttonText: 'Arrived' },
                3: { top: 'Start Trip', bottom: 'Way To Drop', buttonText: 'Go Now' },
                4: { top: 'Arriving', bottom: 'Arriving to Drop-off', buttonText: 'Arriving' },
                5: { top: 'Delivered', bottom: 'Delivered', buttonText: 'Delivered' }
            };

            requestData = await Promise.all(pending.map(async (req) => {
                const pickup = await getDistanceAndDuration(lat, long, req.pickupLatitude, req.pickupLongitude);
                const drop = await getDistanceAndDuration(req.pickupLatitude, req.pickupLongitude, req.dropLatitude, req.dropLongitude);
                const header = headersByStep[req.step] || {};

                return {
                    assignId: req._id,
                    topHeader: header.top,
                    bottomHeader: header.bottom,
                    buttonText: header.buttonText,
                    pickupDistance: pickup.distanceInKm,
                    pickupDuration: pickup.duration,
                    dropDistance: drop.distanceInKm,
                    dropDuration: drop.duration,
                    userName: req.userId?.fullName || 'N/A',
                    userId: req.userId?._id || 'N/A',
                    pickupAddress: req.pickupAddress,
                    dropAddress: req.dropAddress,
                    pickupLatitude: req.pickupLatitude,
                    pickupLongitude: req.pickupLongitude,
                    dropLatitude: req.dropLatitude,
                    dropLongitude: req.dropLongitude,
                    step: req.step || 0,
                    assignType: req.assignType,
                    status: req.status,
                    packageName: req.packageId?.packages?.map(p => p.packageName).join(', ') || ''
                };
            }));
        }

        // Two-Wheeler (serviceType = 4)
        else if (serviceType === 4) {
            const [pending, history] = await Promise.all([
                TwoWheeler.find({ driverId, isAccepted: 1, orderStatus: { $nin: [4, 5] } }).sort({ createdAt: -1 }).populate('userId', 'fullName'),
                TwoWheeler.find({ driverId, orderStatus: { $in: [4, 5] } })
            ]);

            ({ completedCount, cancelledCount } = countTrips(history, 'orderStatus'));

            if (!pending.length) {
                return sendNoPendingResponse(res, { approvalStatus, isOnline, serviceType, completedCount, cancelledCount });
            }

            const headersByStep = {
                0: { top: 'Start Trip', bottom: 'Way To Pickup', buttonText: 'Go Now' },
                1: { top: 'Arriving', bottom: 'Arriving', buttonText: 'Arrived At Pickup Location' },
                2: { top: 'Arrived', bottom: 'Arrived at Pickup Location', buttonText: 'Arrived' },
                3: { top: 'Start Trip', bottom: 'Way To Drop Location', buttonText: 'Go Now' },
                4: { top: 'Arriving', bottom: 'Arriving', buttonText: 'Arrived at Drop Location' },
                5: { top: 'Confirm Delivery', bottom: 'POD', buttonText: 'Submit POD' },
                6: { top: 'Delivered', bottom: 'Delivered', buttonText: 'Delivered at User Location' }
            };

            requestData = await Promise.all(pending.map(async (req) => {
                const pickup = await getDistanceAndDuration(lat, long, req.pickupLatitude, req.pickupLongitude);
                const drop = await getDistanceAndDuration(req.pickupLatitude, req.pickupLongitude, req.dropLatitude, req.dropLongitude);
                const header = headersByStep[req.step] || {};

                return {
                    packageId: req._id,
                    topHeader: header.top,
                    bottomHeader: header.bottom,
                    buttonText: header.buttonText,
                    pickupDistance: pickup.distanceInKm,
                    pickupDuration: pickup.duration,
                    dropDistance: drop.distanceInKm,
                    dropDuration: drop.duration,
                    userName: req.userId?.fullName || 'N/A',
                    userId: req.userId?._id || 'N/A',
                    pickupAddress: req.pickupAddress,
                    dropAddress: req.dropAddress,
                    pickupLatitude: req.pickupLatitude,
                    pickupLongitude: req.pickupLongitude,
                    dropLatitude: req.dropLatitude,
                    dropLongitude: req.dropLongitude,
                    step: req.step,
                    orderStatus: req.orderStatus,
                    packageName: req.packages?.map(p => p.packageName).join(', ') || ''
                };
            }));
        }

        // FTL (default)
        else {
            const [pending, history] = await Promise.all([
                FTL.find({ driverId, transactionStatus: 1, isAccepted: 1, orderStatus: { $nin: [4, 5] } })
                    .sort({ createdAt: -1 })
                    .populate('userId', 'fullName mobileNumber countryCode'),
                FTL.find({ driverId, orderStatus: { $in: [4, 5] } })
            ]);

            ({ completedCount, cancelledCount } = countTrips(history, 'orderStatus'));

            if (!pending.length) {
                return sendNoPendingResponse(res, { approvalStatus, isOnline, serviceType, completedCount, cancelledCount });
            }

            const uiMap = {
                0: { topHeader: 'Start Trip', bottomHeader: 'Way To Pickup', buttonText: 'Go Now' },
                1: { topHeader: 'Arriving', bottomHeader: 'Arriving', buttonText: 'Arrived to Pickup Location' },
                2: { topHeader: 'Arrived', bottomHeader: 'Arrived', buttonText: 'Start Loading' },
                3: { topHeader: 'Start Loading', bottomHeader: 'Loading...', buttonText: 'Loading Complete' },
                4: { topHeader: 'Start Trip', bottomHeader: 'Way To Drop Location', buttonText: 'Go Now' },
                5: { topHeader: 'Arriving', bottomHeader: 'Arriving', buttonText: 'Arrived at Drop Location' },
                6: { topHeader: 'Start Unloading', bottomHeader: 'Unload', buttonText: 'Start Unloading' },
                7: { topHeader: 'Unloading', bottomHeader: 'Unloading', buttonText: 'Mark Delivered' },
                8: { topHeader: 'Confirm Delivery', bottomHeader: 'POD', buttonText: 'Submit' },
                9: { topHeader: 'Delivered', bottomHeader: 'Delivered', buttonText: 'Delivered at User Location' }
            };

            requestData = await Promise.all(pending.map(async (req) => {
                const pickup = await getDistanceAndDuration(lat, long, req.pickupLatitude, req.pickupLongitude);
                const drop = await getDistanceAndDuration(req.pickupLatitude, req.pickupLongitude, req.dropLatitude, req.dropLongitude);
                const ui = uiMap[req.step] || {};

                return {
                    requestId: req._id,
                    topHeader: ui.topHeader,
                    bottomHeader: ui.bottomHeader,
                    buttonText: ui.buttonText,
                    pickupDistance: pickup?.distanceInKm || 0,
                    pickupDuration: pickup?.duration || 'N/A',
                    dropDistance: drop?.distanceInKm || 0,
                    dropDuration: drop?.duration || 'N/A',
                    arrivalTime: getArrivalTime(drop?.duration) || '',
                    userName: req.userId?.fullName || '',
                    userId: req.userId?._id || '',
                    userContact: `${req.userId?.countryCode || ''}${req.userId?.mobileNumber || ''}`,
                    pickupAddress: req.pickupAddress,
                    dropAddress: req.dropAddress,
                    pickupLatitude: req.pickupLatitude,
                    pickupLongitude: req.pickupLongitude,
                    dropLatitude: req.dropLatitude,
                    dropLongitude: req.dropLongitude,
                    totalPayment: req.totalPayment || 0,
                    step: req.step,
                    orderStatus: req.orderStatus,
                    vehicleName: req.vehicleName,
                    vehicleImage: req.vehicleImage,
                    vehicleBodyType: req.vehicleBodyType
                };
            }));
        }

        res.status(200).json({
            success: true,
            message: 'Master Data',

            data: {
                driverApprovalStatus: approvalStatus,
                isOnline,
                pendingRequest: requestData.length,
                assignId: requestData[0]?.assignId || requestData[0]?.packageId || requestData[0]?.requestId || '',
                serviceType,
                isWallet: serviceType === 1 ? 0 : 1,
                request: requestData,
                tripCount: { completedCount, cancelledCount }
            }
        });

    } catch (error) {
        console.error("Error in masterDetail:", error);
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

module.exports = { masterDetail };
