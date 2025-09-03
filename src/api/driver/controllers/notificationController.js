const { initFirebaseAdmin } = require('../../../../config/firebaseConnection');
const Driver = require('../../../api/driver/modals/driverModal');
const Package = require('../../user/models/paymentModal');
const Assign = require('../../../admin/models/ptlPackages/driverPackageAssignModel');
const Notification = require('../../driver/modals/notificationModal');
const admin = require('firebase-admin');
const User = require('../../user/models/userModal'); // adjust path

// Send FCM to driver
const sendOrderNotificationToDriver = async (driverToken, orderData) => {
    if (!driverToken) {
        console.error("❌ Driver token is missing.");
        return false;
    }

    const message = {
        token: driverToken,
        notification: {
            title: "New Order Assigned",
            body: `Order #${orderData.orderId} has been assigned to you.`,
        },
        data: {
            orderId: String(orderData.orderId),
            pickupLocation: orderData.pickupLocation || '',
            deliveryLocation: orderData.deliveryLocation || '',
            referenceId: String(orderData?._id || ''),
            referenceScreen: "ptlIncomingRequest"
        },
        android: {
            priority: "high",
            notification: {
                sound: "default",
            },
        },
        apns: {
            payload: {
                aps: {
                    alert: {
                        title: "New Order Assigned",
                        body: `Order #${orderData.orderId} has been assigned to you.`,
                    },
                    sound: "default",
                    badge: 1,
                },
            },
            headers: {
                'apns-priority': '10',
            },
        },
    };

    try {
        const adminApp = await initFirebaseAdmin();
        const response = await adminApp.messaging().send(message);
        console.log("✅ Notification sent successfully:", response);

        return true;
    } catch (error) {
        console.error("❌ Error sending notification:", error.message);
        return false;
    }
};

const assignOrderToDriver = async (driverId, packageId, assignId) => {
    try {
        const [packageData, driverData, assignData] = await Promise.all([
            Package.findById(packageId),
            Driver.findById(driverId),
            Assign.findById(assignId),
        ]);

        if (!packageData || !driverData || !assignData) {
            console.warn("⚠️ One or more records not found.");
            return false;
        }

        const orderData = {
            orderId: packageData.orderId,
            pickupLocation: assignData.pickupAddress,
            deliveryLocation: assignData.dropAddress,
        };

        console.log("ℹ️ Sending notification with orderData:", orderData);

        return await sendOrderNotificationToDriver(driverData.deviceToken, orderData);
    } catch (error) {
        console.error("❌ Error assigning order:", error.message);
        return false;
    }
};


const getNotification = async (req, res) => {

    try {
        const driverId = req.header('driverid');

        const notificationDetail = await Notification.find({ recipientId: driverId, recipientType: 'driver' }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: notificationDetail,
            message: notificationDetail.length > 0 ? 'Notification Fetch Successfully' : 'No Notification Found'
        });

    } catch (err) {
        console.error('Error fetching Notification data:', err);
        res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
};

const sendNotificationToAllDrivers = async (title, body, serviceType, referenceId, referenceScreen, vehicleId = '') => {
    try {
        const adminApp = await initFirebaseAdmin();

        // const drivers = await Driver.find({
        //     deviceToken: { $ne: null },
        //     serviceType,
        //     'vehicleDetail.vehicleId': vehicleId
        // }).select('deviceToken');

        // if (!drivers.length) {
        //     console.warn("⚠️ No drivers found with device tokens.");
        //     return;
        // }

        const query = {
            deviceToken: { $ne: null },
            serviceType
        };

        // Add vehicle filter only if serviceType is NOT 1 or 4
        if (serviceType != 1 && serviceType != 4) {
            query['vehicleDetail.vehicleId'] = vehicleId;
        }

        const drivers = await Driver.find(query).select('deviceToken');

        if (!drivers.length) {
            console.warn("⚠️ No drivers found with device tokens.");
            return;
        }
        await Promise.all(drivers.map(async (driver) => {
            const message = {
                token: driver.deviceToken,
                notification: {
                    title,
                    body
                },
                data: {
                    referenceId: String(referenceId || ''),
                    referenceScreen: String(referenceScreen || '')
                },
                android: {
                    priority: "high",
                    notification: {
                        sound: "default"
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            alert: {
                                title,
                                body
                            },
                            sound: "default",
                            badge: 1
                        }
                    },
                    headers: {
                        "apns-priority": "10"
                    }
                }
            };

            try {
                const response = await adminApp.messaging().send(message);
                console.log(`✅ Sent to ${driver.deviceToken}:`, response);
            } catch (err) {
                console.error(`❌ Failed for ${driver.deviceToken}:`, err.message);
            }
        }));

    } catch (error) {
        console.error("❌ Error sending notifications to all drivers:", error.message);
    }
};


const sendNotification = async ({
    title,
    message,
    recipientId,
    recipientType = 'driver', // 'driver' or 'user'
    notificationType = 'general',
    referenceId = '',
    referenceScreen = '',
}) => {
    try {
        const adminApp = await initFirebaseAdmin();

        let deviceToken = '';

        // Fetch device token
        if (recipientType === 'driver') {
            const driver = await Driver.findById(recipientId).select('deviceToken');
            deviceToken = driver?.deviceToken;
        }

        if (recipientType === 'user') {
            const user = await User.findById(recipientId).select('deviceToken');
            deviceToken = user?.deviceToken;
            console.log(user);

        }
        console.log(recipientType);
        console.log(deviceToken);
        // You can add support for 'user' type here if needed

        if (!deviceToken) {
            console.warn(`⚠️ No device token for ${recipientType} ID ${recipientId}`);
        } else {
            // FCM message
            const fcmMessage = {
                token: deviceToken,
                notification: {
                    title,
                    body: message,
                },
                data: {
                    referenceId: String(referenceId || ''),
                    referenceScreen: String(referenceScreen || ''),
                    notificationTimmer: String(Math.floor(Date.now() / 1000))

                },
                android: {
                    priority: "high",
                    notification: {
                        title: title,
                        body: message,
                        sound: "default",
                    },

                },
                apns: {
                    payload: {
                        aps: {
                            alert: {
                                title,
                                body: message,
                            },
                            sound: "default",
                            badge: 1,
                            "content-available": 1,
                            "mutable-content": 1
                        },
                    },
                    headers: {
                        'apns-priority': '10',
                    },
                },
            };

            // Send FCM
            await adminApp.messaging().send(fcmMessage);
            console.log(`✅ Notification sent to ${recipientType} ${recipientId}`);
        }

        // Save to DB (always, even if device token is missing)
        await new Notification({
            recipientId,
            recipientType,
            title,
            message,
            notificationType,
            referenceId,
            referenceScreen,
        }).save();

        return true;
    } catch (error) {
        console.error(`❌ sendNotification Error:`, error.message);
        return false;
    }
};


const sendSilentNotification = async (recipientType = 'user', recipientId, referenceId, referenceScreen) => {
    try {

        let deviceToken = '';

        // Fetch device token
        if (recipientType === 'driver') {
            const driver = await Driver.findById(recipientId).select('deviceToken');
            deviceToken = driver?.deviceToken;
        }

        if (recipientType === 'user') {
            const user = await User.findById(recipientId).select('deviceToken');
            deviceToken = user?.deviceToken;
            console.log(user);

        }

        if (!deviceToken) {
            console.warn('❌ No FCM token provided');
            return;
        }

        const message = {
            token: deviceToken,
            android: {
                priority: 'high'
            },
            apns: {
                headers: {
                    'apns-priority': '10'
                },
                payload: {
                    aps: {
                        'content-available': 1,
                        'mutable-content': 1
                    }
                }
            },
            data: {
                referenceId: String(referenceId),
                referenceScreen: String(referenceScreen),
                silent: 'true' // optional flag to handle on client
            }
        };

        const response = await admin.messaging().send(message);
        console.log('✅ Silent notification sent:', response);
    } catch (error) {
        console.error('⚠️ Failed to send silent notification:', error.message);
    }
};


module.exports = { assignOrderToDriver, getNotification, sendNotificationToAllDrivers, sendNotification, sendSilentNotification };
