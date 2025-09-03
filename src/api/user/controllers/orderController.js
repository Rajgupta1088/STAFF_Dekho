const Order = require('../../../api/user/models/paymentModal');
const TwoWheeler = require('../../../api/user/models/twoWheelerModal');
const PTL = require('../../../api/user/models/paymentModal');
const driverPackageAssign = require('../../../admin/models/ptlPackages/driverPackageAssignModel');
const driverModal = require('../../driver/modals/driverModal');
const FTL = require('../models/ftlPaymentModal');
const { sendNotification } = require('../../driver/controllers/notificationController'); // path as needed
const mongoose = require('mongoose');
const Wallet = require('../models/walletModal');

mongoose.set('strictPopulate', false);

const getOrderList = async (req, res) => {
    const userId = req.headers['userid'];
    const serviceType = parseInt(req.headers['servicetype'], 10);

    try {
        let orders = [];
        let assignments = [];

        if (serviceType == 1) {
            orders = await Order.find({ userId, transactionStatus: 1 })
                .sort({ createdAt: -1 })
                .lean();

            if (!orders.length) {
                return res.status(200).json({
                    success: true,
                    data: { allOrderData: [], completeOrderData: [], cancelledOrderData: [] }
                });
            }

            const orderIds = orders.map(o => o._id);

            assignments = await driverPackageAssign.find({
                packageId: { $in: orderIds }
            })
                .sort({ createdAt: 1 })
                .populate({ path: 'driverId', select: 'personalInfo vehicleDetail' })
                .lean();

            // Build map of latest assignment per package
            const assignmentsMap = new Map();
            const statusMap = new Map();

            for (const assign of assignments) {
                const idStr = assign.packageId.toString();
                if (!assignmentsMap.has(idStr)) assignmentsMap.set(idStr, assign);

                // Track order steps if status=4
                if (assign.status === 4) {
                    if (!statusMap.has(idStr)) statusMap.set(idStr, []);
                    statusMap.get(idStr).push(assign);
                }
            }

            // Build order status steps
            const buildOrderStatus = (idStr) => {
                const orderDetails = statusMap.get(idStr) || [];
                const steps = [];
                orderDetails.forEach((detail, i) => {
                    if (i === 0) steps.push({ orderStatus: 'Pickup Location', Address: detail.pickupAddress });
                    steps.push({
                        orderStatus: detail.assignType == 2 ? 'Delivery Location' : 'Delivery Location',
                        Address: detail.dropAddress
                    });
                });
                return steps;
            };

            // Transform orders
            var transformOrders = (ordersToTransform) =>
                ordersToTransform.map(order => {
                    const idStr = order._id.toString();
                    const tracking = assignmentsMap.get(idStr);
                    const driver = tracking?.driverId || {};
                    const packages = Array.isArray(order.packages) ? order.packages : [];

                    return {
                        ...order,
                        packageId: order._id,
                        packageName: packages.map(p => p.packageName).filter(Boolean).join(', '),
                        driverId: driver._id || '',
                        driverName: driver.personalInfo?.name || '',
                        driverContact: driver.personalInfo?.mobile || '',
                        driverProfile: driver.personalInfo?.profilePicture || '',
                        vehicleNumber: driver.vehicleDetail?.plateNumber || '',
                        orderTracking: tracking ? buildOrderStatus(idStr) : [],
                        assignType: tracking?.assignType || 0,
                    };
                });
        }

        // Service Type 2 (Two Wheeler)
        else {

            orders = await TwoWheeler.find({
                userId,
                transactionStatus: 1
            })
                .populate({
                    path: 'driverId',
                    select: 'personalInfo vehicleDetail'
                })
                .sort({ createdAt: -1 })
                .lean();

            if (!orders.length) {
                return res.status(200).json({
                    success: true,
                    data: { allOrderData: [], completeOrderData: [], cancelledOrderData: [] }
                });
            }

            var transformOrders = (ordersToTransform) =>
                ordersToTransform.map(order => {
                    const driver = order.driverId || {};
                    const packages = Array.isArray(order.packages) ? order.packages : [];

                    return {
                        ...order,
                        packageId: order._id,
                        isBidding: 0,
                        packageName: packages.map(p => p.packageName).filter(Boolean).join(', '),
                        driverId: driver._id || '',
                        driverName: driver.personalInfo?.name || '',
                        driverContact: driver.personalInfo?.mobile || '',
                        driverProfile: driver.personalInfo?.profilePicture || '',
                        vehicleNumber: driver.vehicleDetail?.plateNumber || '',
                        orderTracking: [
                            { orderStatus: 'Pickup Location', Address: order.pickupAddress },
                            { orderStatus: 'Delivery Location', Address: order.dropAddress }
                        ],
                    };
                });
        }

        const allOrderData = transformOrders(orders);
        const completeOrderData = allOrderData.filter(o => o.assignType === 2 || o.orderTracking.some(s => s.orderStatus === 'Delivered'));
        const cancelledOrderData = allOrderData.filter(o => o.transactionStatus === 0 || o.orderStatus === 5);

        res.status(200).json({
            success: true,
            data: { allOrderData, completeOrderData, cancelledOrderData },
            message: 'My Order Fetch Successfully'
        });
    } catch (err) {
        console.error('Error fetching Order Detail:', err);
        res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
};

const singleOrderDetail = async (req, res) => {
    const { packageId } = req.body;
    const serviceType = parseInt(req.headers['servicetype'], 10);

    if (!packageId) {
        return res.status(200).json({ success: false, message: 'packageId is required' });
    }

    try {
        // ---------------------- SERVICE TYPE 1 ----------------------
        if (serviceType == 1) {
            const order = await Order.findById(packageId).lean();

            if (!order) {
                return res.status(200).json({ success: false, message: 'Order not found' });
            }

            // Fetch all assignments for building orderTracking
            const allAssignments = await driverPackageAssign.find({ packageId })
                .sort({ createdAt: 1 })
                .populate({ path: 'driverId', select: 'personalInfo vehicleDetail' })
                .lean();

            // Latest assignment for driver info
            const latestAssignment = allAssignments[allAssignments.length - 1] || null;
            const driver = latestAssignment?.driverId || {};
            const assignType = latestAssignment?.assignType || 0;

            // Build orderTracking steps
            const buildOrderStatus = (assignmentList) => {
                return assignmentList.map((detail, index) => {
                    const label = index === 0 ? 'Pickup Location' : (detail.assignType == 2 ? 'Delivery Location' : 'Delivery Location');
                    return {
                        orderStatus: label,
                        address: index === 0 ? detail.pickupAddress || '' : detail.dropAddress || '',
                        dateTime: detail.createdAt || null
                    };
                });
            };

            const orderTracking = buildOrderStatus(allAssignments);

            const packages = Array.isArray(order.packages) ? order.packages : [];
            const packageName = packages.map(p => p.packageName).filter(Boolean).join(', ');

            const enrichedOrder = {
                ...order,
                packageId: order._id,
                packageName,
                driverId: driver._id || '',
                driverName: driver.personalInfo?.name || '',
                driverContact: driver.personalInfo?.mobile || '',
                driverProfile: driver.personalInfo?.profilePicture || '',
                vehicleNumber: driver.vehicleDetail?.plateNumber || '',
                orderTracking,
                assignType,
                isRated: order?.isRated || 0
            };

            return res.status(200).json({ success: true, data: enrichedOrder });
        }

        // ---------------------- SERVICE TYPE 2 ----------------------
        else {
            const order = await TwoWheeler.findById(packageId)
                .populate({ path: 'driverId', select: 'personalInfo vehicleDetail' })
                .lean();

            if (!order) {
                return res.status(200).json({ success: false, message: 'Order not found' });
            }

            const driver = order.driverId || {};
            const packages = Array.isArray(order.packages) ? order.packages : [];
            const packageName = packages.map(p => p.packageName).filter(Boolean).join(', ');

            const orderTracking = [
                { orderStatus: 'Pickup Location', address: order.pickupAddress || '', dateTime: order.createdAt },
                { orderStatus: 'Delivery Location', address: order.dropAddress || '', dateTime: order.updatedAt }
            ];

            const enrichedOrder = {
                ...order,
                packageId: order._id,
                packageName,
                driverId: driver._id || '',
                driverName: driver.personalInfo?.name || '',
                driverContact: driver.personalInfo?.mobile || '',
                driverProfile: driver.personalInfo?.profilePicture || '',
                vehicleNumber: driver.vehicleDetail?.plateNumber || '',
                orderTracking,
                isRated: order?.isRated || 0
            };

            return res.status(200).json({ success: true, data: enrichedOrder });
        }
    } catch (err) {
        console.error('Error fetching Order Detail:', err);
        return res.status(500).json({
            success: false,
            message: 'Server Error',
            error: err.message
        });
    }
};


const ftlOrderCancel = async (req, res) => {
    const { status, requestId } = req.body;
    const userId = req.header('userid')

    // Validate inputs
    if (status != 5 || !requestId) {
        return res.status(200).json({
            success: false,
            message: 'requestId is required and status must be 5',
        });
    }

    try {
        // Find the latest order by requestId (assuming orderId === requestId or adjust accordingly)
        const order = await FTL.findOne({ _id: requestId }).sort({ createdAt: -1 });

        if (!order) {
            return res.status(200).json({
                success: false,
                message: 'Order not found',
            });
        }
        if (order.orderStatus == 5)
            return res.status(200).json({
                success: false,
                message: "FTL Order is Already Cancelled"
            });

        // Update the FtlPayment status to 5 (cancelled)
        const result = await FTL.findOneAndUpdate(
            { _id: requestId },
            { $set: { orderStatus: 5 } },
            { new: true }
        );

        const wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            return res.status(200).json({ success: false, message: 'Wallet not found' });
        }

        const refundAmount = parseFloat(order.totalPayment) || 0;

        // Step 3: Refund to wallet
        wallet.balance += refundAmount;
        wallet.transactions.push({
            type: 'credit',
            amount: refundAmount,
            method: 'Wallet Refund',
            transactionStatus: 1,
            order_id: order.orderId,
            date: new Date()
        });
        await wallet.save();


        try {
            await sendNotification({
                title: 'Order Cancelled',
                message: `Your Order - ${result.orderId} is cancelled  & ${refundAmount} is refunded in Your Wallet`,
                recipientId: result.userId,
                recipientType: 'user',
                notificationType: 'order',
                referenceId: result._id,
                referenceScreen: 'orderCancelled',
            });
        } catch (err) {
            console.error('⚠️ Notification Error:', err.message);
        }


        return res.status(200).json({
            success: true,
            message: "Order Cancel Successfully"
        });
    } catch (err) {
        console.error('Error processing order cancel:', err);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: err.message,
        });
    }
};


const ptlOrderCancel = async (req, res) => {
    const { status, packageId } = req.body;
    const userId = req.header('userid');

    // Validate inputs
    if (status != 5 || !packageId) {
        return res.status(200).json({
            success: false,
            message: 'packageId is required and status must be 5',
        });
    }

    try {
        // Find the latest order by packageId (assuming orderId === packageId or adjust accordingly)
        const order = await PTL.findById(packageId).sort({ createdAt: -1 });

        if (!order) {
            return res.status(200).json({
                success: false,
                message: 'Order not found',
            });
        }
        if (order.orderStatus == 5)
            return res.status(200).json({
                success: false,
                message: "PTL Order is Already Cancelled"
            });

        const wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            return res.status(200).json({ success: false, message: 'Wallet not found' });
        }

        const refundAmount = parseFloat(order.totalPayment) || 0;

        // Step 3: Refund to wallets
        wallet.balance += refundAmount;
        wallet.transactions.push({
            type: 'credit',
            amount: refundAmount,
            method: 'Wallet Refund',
            transactionStatus: 1,
            order_id: order.orderId,
            date: new Date()
        });
        await wallet.save();


        // Update the PTLPayment status to 5 (cancelled)
        const result = await PTL.findOneAndUpdate(
            { _id: packageId },
            { $set: { orderStatus: 5 } },
            { new: true }
        );
        // await driverPackageAssign.updateMany(
        //     { packageId: requestId },
        //     { $set: { status: 5 } }
        // );

        console.log(result.modifiedCount); // Number of updated documents

        try {
            await sendNotification({
                title: 'Order Cancelled',
                message: `Your Order - ${result.orderId} is cancelled  & ${refundAmount} is refunded in Your Wallet`,
                recipientId: result.userId,
                recipientType: 'user',
                notificationType: 'order',
                referenceId: result._id,
                referenceScreen: 'orderCancelled',
            });
        } catch (err) {
            console.error('⚠️ Notification Error:', err.message);
        }


        return res.status(200).json({
            success: true,
            message: "Order Cancel Successfully"
        });
    } catch (err) {
        console.error('Error processing order cancel:', err);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: err.message,
        });
    }
};


const ftlOrderList = async (req, res) => {
    const userId = req.headers['userid'];
    const serviceType = req.headers['servicetype'];

    const transformOrders = (orders) => {
        return orders.map((order) => {
            const driver = order?.driverId || {};
            return {
                requestId: order._id?.toString() || '',
                vehicleName: order.vehicleName || '',
                vehicleImage: order.vehicleImage || '',
                vehicleBodyType: order.vehicleBodyType || '',
                orderId: order.orderId || '',
                isAccepted: order.isAccepted || 0,
                step: order.step || 0,
                transactionStatus: order.transactionStatus || 0,

                pickupAddress: order.pickupAddress || '',
                dropAddress: order.dropAddress || '',
                pickupLatitude: order.pickupLatitude || '',
                pickupLongitude: order.pickupLongitude || '',
                dropLatitude: order.dropLatitude || '',
                dropLongitude: order.dropLongitude || '',
                orderStatus: order.orderStatus || 0,
                distance: order.distance ? order.distance.toString() : '',
                duration: order.duration || '',
                // orderDate: order.createdAt || '',
                createdAt: order.createdAt || '',

                driverId: driver._id || '',
                driverName: driver.personalInfo?.name || '',
                driverContact: driver.personalInfo?.mobile || '',
                driverProfile: driver.personalInfo?.profilePicture || '',
                vehicleNumber: driver.vehicleDetail?.plateNumber || '',

                isBidding: order.isBidding || 0,
                isPartialPayment: order.isPartialPayment || 0,
                unloadingTime: order.unloadingTime || '',
            };
        });
    };

    try {
        const query = { userId, serviceType };
        if (serviceType == 2) query.transactionStatus = 1;

        const orders = await FTL.find(query)
            .populate({
                path: 'driverId',
                select: 'personalInfo vehicleDetail'
            })
            .sort({ createdAt: -1 })
            .lean();

        const allOrderData = transformOrders(orders);
        const completeOrderData = transformOrders(orders.filter(o => o.orderStatus === 4));
        const cancelledOrderData = transformOrders(orders.filter(o => o.orderStatus === 5));

        return res.status(200).json({
            success: true,
            message: 'My Order Fetch Successfully',
            data: {
                allOrderData,
                completeOrderData,
                cancelledOrderData
            }
        });

    } catch (err) {
        console.error('Error fetching Order Detail:', err);
        return res.status(500).json({
            success: false,
            message: 'Server Error',
            error: err.message
        });
    }
};


const ftlSingleOrderDetail = async (req, res) => {
    const { requestId } = req.body;

    if (!requestId) {
        return res.status(200).json({
            success: false,
            message: 'requestId is required'
        });
    }

    try {
        const order = await FTL.findById(requestId)
            .populate({
                path: 'driverId',
                select: 'personalInfo vehicleDetail'
            })
            .lean();

        if (!order) {
            return res.status(200).json({
                success: false,
                message: 'Order not found'
            });
        }

        const driver = order.driverId || {};

        return res.status(200).json({
            success: true,
            data: {
                requestId: order._id?.toString() || '',
                vehicleName: order.vehicleName || '',
                vehicleImage: order.vehicleImage || '',
                vehicleBodyType: order.vehicleBodyType || '',
                orderId: order.orderId || 0,
                step: order.step || 0,
                isAccepted: order.isAccepted || 0,

                pickupAddress: order.pickupAddress || '',
                dropAddress: order.dropAddress || '',
                pickupLatitude: order.pickupLatitude || '',
                pickupLongitude: order.pickupLongitude || '',
                dropLatitude: order.dropLatitude || '',
                dropLongitude: order.dropLongitude || '',
                orderStatus: order.orderStatus,
                distance: order.distance?.toString() || '',
                duration: order.duration || '',
                // orderDate: order.createdAt || '',
                createdAt: order.createdAt || '',

                driverId: driver._id || '',
                driverName: driver.personalInfo?.name || '',
                driverContact: driver.personalInfo?.mobile || '',
                driverProfile: driver.personalInfo?.profilePicture || '',
                vehicleNumber: driver.vehicleDetail?.plateNumber || '',

                isBidding: order.isBidding || 0,
                isPartialPayment: order.isPartialPayment || 0,
                unloadingTime: order.unloadingTime || '',
                loadingTime: order.loadingTime || '',

                subTotal: order.subTotal || '',
                shippingCost: order.shippingCost || '',
                specialHandling: order.specialHandling || '',
                gst: order.gst || '',
                gstPercentage: order.gstPercentage || '',
                totalPayment: order.totalPayment || '',
                prePayment: order.prePayment || '',
                postPayment: order.postPayment || '',
                estimatePrice: order.estimatePrice || '',
                orderTracking: [
                    {
                        "orderStatus": "Pickup Location",
                        "address": order?.pickupAddress,
                    },
                    {
                        "orderStatus": "Delivery Location",
                        "address": order?.dropAddress,
                    }
                ],
                isRated: order.isRated || 0,
                startLoadingTime: order.startLoadingTime || '',
                startUnloadingTime: order.startUnloadingTime || ''

            }
        });

    } catch (err) {
        console.error('Error fetching Order Detail:', err);
        return res.status(500).json({
            success: false,
            message: 'Server Error',
            error: err.message
        });
    }
};

const twoWheelerOrderCancel = async (req, res) => {
    const { status, packageId } = req.body;
    const userId = req.get('userid'); // Correct way to read header

    if (!packageId) {
        return res.status(200).json({ success: false, message: 'packageId is required' });
    }
    if (Number(status) !== 5) {
        return res.status(200).json({ success: false, message: 'Status must be 5 to cancel the order' });
    }

    try {
        // Step 1: Find and update order
        let order = await TwoWheeler.findOneAndUpdate(
            { _id: packageId, orderStatus: { $ne: 5 } }, // Only update if not already cancelled
            { $set: { orderStatus: 5 } },
            { new: true }
        );

        if (!order) {
            return res.status(200).json({
                success: false,
                message: 'Order not found or already cancelled',
            });
        }

        // Step 2: Find wallet
        const wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            return res.status(200).json({ success: false, message: 'Wallet not found' });
        }

        const refundAmount = parseFloat(order.totalPayment) || 0;

        // Step 3: Refund to wallet
        wallet.balance += refundAmount;
        wallet.transactions.push({
            type: 'credit',
            amount: refundAmount,
            method: 'Wallet Refund',
            transactionStatus: 1,
            order_id: order.orderId,
            date: new Date()
        });
        await wallet.save();

        // Step 4: Send notification
        await sendNotification({
            title: 'Order Cancelled',
            message: `Your Order - ${order.orderId} has been cancelled & ${refundAmount} is refunded in Your Wallet`,
            recipientId: order.userId,
            recipientType: 'user',
            notificationType: 'order',
            referenceId: order._id,
            referenceScreen: 'orderCancelled',
        });

        return res.status(200).json({
            success: true,
            message: 'Order cancelled and refund processed successfully',
        });

    } catch (err) {
        console.error('❌ Error cancelling order:', err);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: err.message,
        });
    }
};



module.exports = { getOrderList, singleOrderDetail, ptlOrderCancel, ftlOrderCancel, ftlOrderList, ftlSingleOrderDetail, twoWheelerOrderCancel };
