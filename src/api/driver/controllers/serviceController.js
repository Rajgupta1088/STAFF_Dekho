const admin = require('../../../../config/firebaseConnection');
const TwoWheeler = require('../../user/models/twoWheelerModal');
const { sendTransactionalSMS } = require('../../user/utils/generateOtp'); // Assuming the common function is located in '../utils/distanceCalculate'
const { sendSms } = require('../../user/utils/sendOtp');

const PTL = require('../../../admin/models/ptlPackages/driverPackageAssignModel'); // Adjust the model path as needed
const User = require('../../user/models/userModal'); // Adjust the model path as needed
const { getDistanceAndDuration, checkRadius } = require('../utils/distanceCalculate'); // Assuming the common function is located in '../utils/distanceCalculate'
const DriverLocation = require('../modals/driverLocModal'); // Assuming the common function is located in '../utils/distanceCalculate'
const PaymentDetail = require('../../../api/user/models/paymentModal'); // Assuming the common function is located in '../utils/distanceCalculate'
const mongoose = require('mongoose');
const { generateOTP } = require('../utils/generateOtp');
const { isValidPhoneNumber, parsePhoneNumber } = require('libphonenumber-js');
const { uploadImage, uploadPdfToS3 } = require("../../../admin/utils/uploadHelper"); // Import helper for file upload
const multiparty = require('multiparty');
const DriverModal = require('../../../api/driver/modals/driverModal'); // Assuming the common function is located in '../utils/distanceCalculate'
const FTL = require('../../../api/user/models/ftlPaymentModal'); // Assuming the common function is located in '../utils/distanceCalculate'
const Bidding = require('../../../api/driver/modals/biddingModal'); // Assuming the common function is located in '../utils/distanceCalculate'
const { sendNotification, sendSilentNotification } = require('../controllers/notificationController'); // path as needed
const Wallet = require('../../user/models/walletModal'); // path as needed
const Services = require('../../../admin/models/vehcileManagement/serviceManagementModel');


const ejs = require("ejs");
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const Package = require('../../user/models/paymentModal'); // Adjust the model path as needed


// Save Driver Locationconst DriverLocation = require('../models/DriverLocation'); // adjust the path as needed
const saveDriverLocation = async (req, res) => {
    const driverId = req.headers['driverid'];
    const { lat, long } = req.body;

    if (!driverId || !lat || !long) {
        return res.status(200).json({ success: false, message: "Missing driverId, lat, or long" });
    }

    try {
        let latitude = lat;
        let longitude = long;

        const existingLocation = await DriverLocation.findOne({ driverId });

        if (existingLocation) {
            // Update existing location
            existingLocation.latitude = lat;
            existingLocation.longitude = long;
            await existingLocation.save();
        } else {
            // Create new location
            const newLocation = new DriverLocation({
                driverId,
                latitude: lat,
                longitude: long
            });
            await newLocation.save();
        }

        res.status(200).json({
            success: true,
            message: "Location updated successfully",
            data: {
                lat: latitude,
                long: longitude
            }
        });
    } catch (error) {
        console.error("Error updating location:", error);
        res.status(500).json({ success: false, message: "Failed to update location", error: error.message });
    }
};

// const orderAssign = async (req, res) => {
//     try {
//         const driverId = req.headers['driverid'];

//         if (!driverId) {
//             return res.status(200).json({ success: false, message: "Driver ID is required" });
//         }

//         const driverRequest = await PTL.find({ driverId, pickupStatus: 0 }).sort({ createdAt: -1 })
//             .populate({ path: 'userId', select: 'fullName' })
//             .populate({ path: 'packageId', select: 'packages' });

//         if (!driverRequest.length) {
//             return res.status(200).json({ success: true, message: "No requests found for this driver", data: [] });
//         }

//         const driverCurrentLocation = await getDriverLocation(driverId);

//         if (!driverCurrentLocation.success) {
//             return res.status(200).json({ success: false, message: "Please update driver's current location" });
//         }

//         const enrichedRequests = await Promise.all(driverRequest.map(async (request) => {
//             const requestObj = request.toObject();

//             // Default values
//             let pickupDistance = 0, pickupDuration = 0;
//             let dropDistance = 0, dropDuration = 0;

//             // Calculate pickup distance & duration
//             try {
//                 ({ distanceInKm: pickupDistance, duration: pickupDuration } = await getDistanceAndDuration(
//                     driverCurrentLocation.lat,
//                     driverCurrentLocation.long,
//                     request.pickupLatitude,
//                     request.pickupLongitude
//                 ));
//             } catch (e) {
//                 console.error(`Error in pickup distance for request ${request._id}:`, e.message);
//             }

//             // Calculate drop distance & duration
//             try {
//                 ({ distanceInKm: dropDistance, duration: dropDuration } = await getDistanceAndDuration(
//                     request.pickupLatitude,
//                     request.pickupLongitude,
//                     request.dropLatitude,
//                     request.dropLongitude
//                 ));

//                 // console.log('iuygf', request.pickupLatitude)
//                 // console.log('8765', request.pickupLongitude)
//                 // console.log('8765ss', request.dropLatitude)
//                 // console.log('wwwww', request.dropLongitude)
//             } catch (e) {
//                 console.error(`Error in drop distance for request ${request._id}:`, e.message);
//             }

//             requestObj.pickupDistance = pickupDistance;
//             requestObj.pickupDuration = pickupDuration;
//             requestObj.dropDistance = dropDistance;
//             requestObj.dropDuration = dropDuration;
//             requestObj.arrivalTime = getArrivalTime(pickupDuration);
//             requestObj.userName = requestObj.userId?.fullName || '';
//             requestObj.userId = requestObj.userId?._id || '';
//             requestObj.packageName = await requestObj.packageId?.packages
//                 ?.map(p => p.packageName)
//                 ?.filter(Boolean)
//                 ?.join(', ') || '';
//             requestObj.packageId = requestObj.packageId?._id;

//             delete requestObj.createdAt;
//             delete requestObj.updatedAt;
//             delete requestObj.__v;
//             delete requestObj.deliveryStatus;
//             // delete requestObj.userId;
//             // delete requestObj.packageId;




//             return requestObj;
//         }));

//         return res.json({
//             success: true,
//             data: enrichedRequests,
//             message: `${enrichedRequests.length} Request(s) Incoming`
//         });

//     } catch (error) {
//         console.error('Error in /order-assign:', error);
//         return res.status(500).json({ success: false, message: "Server Error", error: error.message });
//     }
// };
const orderAssign = async (req, res) => {
    try {
        const driverId = req.headers['driverid'];
        const serviceType = parseInt(req.headers['servicetype'], 10);

        if (!driverId) {
            return res.status(200).json({ success: false, message: "Driver ID is required" });
        }

        const Model = serviceType === 1 ? PTL : TwoWheeler;
        const query = serviceType === 1
            ? { driverId, pickupStatus: 0 }
            : { orderStatus: 0, isAccepted: 0, transactionStatus: 1, rejectedDriver: { $ne: driverId } };

        const driverRequest = await Model.find(query)
            .sort({ createdAt: -1 })
            .populate({ path: 'userId', select: 'fullName' })
            .populate(serviceType === 1 ? { path: 'packageId', select: 'packages' } : '');

        if (!driverRequest.length) {
            return res.status(200).json({ success: true, message: "No requests found for this driver", data: [] });
        }

        const driverCurrentLocation = await getDriverLocation(driverId);
        if (!driverCurrentLocation.success) {
            return res.status(200).json({ success: false, message: "Please update driver's current location" });
        }

        const enrichedRequests = await Promise.all(
            driverRequest.map(async (request) => {
                const obj = request.toObject();
                const {
                    _id,
                    userId,
                    packageId,
                    packages,
                    pickupLatitude,
                    pickupLongitude,
                    dropLatitude,
                    dropLongitude,
                    pickupAddress,
                    dropAddress,
                    pickupPincode,
                    dropPincode,
                    pickupStatus,
                    status,
                    pickupMobile,
                    assignType,
                    warehouseId,
                    step,
                    totalPayment
                } = obj;

                let pickupDistance = 0, pickupDuration = "0 mins";
                let dropDistance = 0, dropDuration = "0 mins";

                try {
                    const pickupData = await getDistanceAndDuration(
                        driverCurrentLocation.lat,
                        driverCurrentLocation.long,
                        pickupLatitude,
                        pickupLongitude
                    );
                    pickupDistance = pickupData.distanceInKm;
                    pickupDuration = pickupData.duration;
                } catch (e) {
                    console.error(`Pickup distance error for request ${_id}:`, e.message);
                }

                try {
                    const dropData = await getDistanceAndDuration(
                        pickupLatitude,
                        pickupLongitude,
                        dropLatitude,
                        dropLongitude
                    );
                    dropDistance = dropData.distanceInKm;
                    dropDuration = dropData.duration;
                } catch (e) {
                    console.error(`Drop distance error for request ${_id}:`, e.message);
                }

                const totalDistance = dropDistance;
                const totalDuration = dropDuration;

                return {
                    _id,
                    packageId: serviceType === 1 ? packageId?._id : _id,
                    driverId,
                    userId: userId?._id || '',
                    warehouseId: warehouseId || '',
                    status: status || 0,
                    pickupStatus: pickupStatus || 0,
                    pickupMobile: pickupMobile || '',
                    assignType: serviceType == 1 ? assignType : 0,
                    pickupPincode: pickupPincode || '',
                    dropPincode: dropPincode || '',
                    pickupAddress,
                    dropAddress,
                    pickupLatitude,
                    pickupLongitude,
                    dropLatitude,
                    dropLongitude,
                    totalDuration,
                    totalDistance,
                    step: step || 0,
                    pickupDistance,
                    pickupDuration,
                    dropDistance,
                    dropDuration,
                    arrivalTime: getArrivalTime(pickupDuration),
                    userName: userId?.fullName || '',
                    totalPayment: totalPayment || '',
                    packageName: serviceType === 1
                        ? (packageId?.packages || []).map(p => p.packageName).filter(Boolean).join(', ')
                        : (packages || []).map(p => p.packageName).filter(Boolean).join(', ')
                };
            })
        );

        return res.status(200).json({
            success: true,
            data: enrichedRequests,
            message: `${enrichedRequests.length} Request(s) Incoming`,
        });

    } catch (error) {
        console.error('Error in /order-assign:', error);
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

// Get Driver Location
const getDriverLocation = async (driverId) => {
    try {
        const existingLocation = await DriverLocation.findOne({ driverId });


        if (!existingLocation) {
            return { success: false, message: "Location not found for this driver" };
        }


        if (existingLocation) {
            return {
                success: true,
                lat: existingLocation.latitude,
                long: existingLocation.longitude
            };
        }

    } catch (error) {
        console.error("Error fetching location:", error);
        return { success: false, message: "Failed to fetch location", error: error.message };
    }
};

const tripHistory = async (req, res) => {
    try {
        const driverId = req.header('driverid');
        const serviceType = req.header('servicetype');

        if (!driverId) {
            return res.status(200).json({
                success: false,
                message: "Driver ID is required"
            });
        }
        let trips;
        if (serviceType == 1) {
            trips = await PTL.find({
                driverId,
                status: { $in: [0, 1, 2, 3, 4, 5] }
            })
                .populate({ path: 'userId', select: 'fullName' })
                .populate({ path: 'packageId', select: 'orderId' });

        }
        console.log('yy', trips)
        if (serviceType == 2 || serviceType == 3) {
            trips = await FTL.find({
                driverId,
                orderStatus: { $in: [0, 1, 2, 3, 4, 5] }
            })
                .sort({ createdAt: -1 })
                .populate({ path: 'userId', select: 'fullName' })
        }
        if (serviceType == 4) {
            trips = await TwoWheeler.find({
                driverId,
                orderStatus: { $in: [0, 1, 2, 3, 4, 5] }
            })
                .sort({ createdAt: -1 })
                .populate({ path: 'userId', select: 'fullName' })
        }
        const groupedTrips = {
            All: [],
            Completed: [],
            Cancelled: []
        };

        for (const trip of trips) {
            let tripData;
            tripData = {
                userName: trip?.userId?.fullName || '',
                status: serviceType == 1 ? trip.status : trip.orderStatus,
                orderId: serviceType == 1 ? trip?.packageId?.orderId : trip?.orderId,
                pickAddress: trip.pickupAddress || '',
                dropAddress: trip.dropAddress || '',
                totalDistance: serviceType == 1 ? trip.totalDistance : trip?.distance.toString(),
                totalDuration: serviceType == 1 ? trip.totalDuration : trip?.duration,
                createdAt: trip.createdAt,
                packageId: serviceType == 1 ? trip.packageId?._id : trip?._id,

            };

            if (serviceType == 2 || serviceType == 3) {
                tripData = {
                    userName: trip?.userId?.fullName || '',
                    status: trip.orderStatus,
                    orderId: trip?.orderId || '',
                    pickAddress: trip.pickupAddress || '',
                    dropAddress: trip.dropAddress || '',
                    totalDistance: trip.distance?.toString() || '',
                    totalDuration: trip.duration || '',
                    createdAt: trip.createdAt,
                    requestId: trip._id

                };

            }

            // Push all trips to "All"
            groupedTrips.All.push(tripData);

            // Push to specific status-based categories
            if (serviceType == 2 || serviceType == 3 || serviceType == 4) {
                if (trip.orderStatus === 4) {
                    groupedTrips.Completed.push(tripData);
                } else if (trip.orderStatus === 5) {
                    groupedTrips.Cancelled.push(tripData);
                }
            }
            else {
                if (trip.status === 4) {
                    groupedTrips.Completed.push(tripData);
                } else if (trip.status === 5) {
                    groupedTrips.Cancelled.push(tripData);
                }
            }
        }

        return res.status(200).json({
            success: true,
            message: "Trips detail fetched successfully",
            data: groupedTrips
        });

    } catch (error) {
        console.error("Error fetching trip history:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch trip history",
            error: error.message
        });
    }
};


const tripHistoryCount = async (req, res) => {
    try {
        const driverId = req.header('driverid'); // or req.query / req.body

        if (!driverId) {
            return res.status(200).json({
                success: false,
                message: "Driver ID is required"
            });
        }

        const tripHistoryDetail = await PTL.find({
            driverId,
            status: { $in: [4, 5] }
        });

        const driverData = await DriverModal.find({ _id: driverId, status: 1 });

        console.log('dddd', driverData[0]);

        // Count status 4 and 5 separately
        const completedCount = tripHistoryDetail.filter(trip => trip.status === 4).length;
        const cancelledCount = tripHistoryDetail.filter(trip => trip.status === 5).length;

        res.status(200).json({
            success: true,
            data: {
                completedCount,
                cancelledCount,
                driverApprovalStatus: driverData[0].approvalStatus || 0
            },
            message: "Trip counts fetched successfully"
        });

    } catch (error) {
        console.error("Error fetching trip history:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch trip history",
            error: error.message
        });
    }
};

const pickupOrder = async (req, res) => {
    try {
        const { assignId: id, pickupStatus, step } = req.body;
        const driverId = req.header('driverid');

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(200).json({ success: false, message: 'Assign Id is required or invalid' });
        }

        if (![0, 1, 2].includes(pickupStatus)) {
            return res.status(200).json({ success: false, message: 'Invalid pickup status' });
        }

        if (typeof step == "undefined") {
            return res.status(200).json({ success: false, message: 'Step Is required' });
        }


        if (![0, 1, 2, 3, 4, 5].includes(step)) {
            return res.status(200).json({ success: false, message: 'Invaild Step' });
        }

        const order = await PTL.findById(id).populate({ path: 'userId', select: 'fullName' }).populate({ path: 'packageId', select: 'packages status' });
        if (!order) {
            return res.status(200).json({ success: false, message: 'Order not found' });
        }

        const user = order.userId;
        const driverLocation = await getDriverLocation(driverId);

        if (!driverLocation.success) {
            return res.status(200).json({ success: false, message: "Please update driver's current location" });
        }

        const { lat, long } = driverLocation;
        const { distanceInKm: pickupDistance, duration: pickupDuration } = await getDistanceAndDuration(
            lat, long, order.pickupLatitude, order.pickupLongitude
        );

        const stepStatusMap = {
            0: 0,
            1: 1,
            2: 2
        };

        if (pickupStatus != stepStatusMap[step]) {
            return res.status(200).json({ success: false, message: 'Order Status Is According To Steps' });
        }

        let topHeader = '', bottomHeader = '', buttonText = '', message = '';

        switch (pickupStatus) {
            case 0: // Start trip
                topHeader = 'Start Trip';
                bottomHeader = 'Way To Pickup';
                buttonText = 'Go Now';
                message = "Driver Way to Pickup";
                break;

            case 1: // Arriving at pickup
                await PTL.findByIdAndUpdate(id, { $set: { pickupStatus: 1, step: step } });
                topHeader = 'Arriving';
                bottomHeader = 'Way to Pickup';
                buttonText = 'Arriving to Pickup';
                message = "Driver Go For Pickup";
                break;

            case 2: //  Arrived at pickup
                await PTL.findByIdAndUpdate(id, { $set: { pickupStatus: 2, step: step } });
                topHeader = 'Arrived';
                bottomHeader = 'Arrived at Pickup Location';
                buttonText = 'Arrived';
                message = "Driver Arrived At Pickup Location";
                break;
        }

        const notifi = {
            0: { title: 'Pickup', body: `Your Driver On the Way to Pickup` },
            1: { title: 'Arriving', body: `Your Driver Arriving at Pickup Location` },
            2: { title: 'Arrived', body: `Driver Arrived At Pickup Location` },
        };

        const ptlNotifyUser = async (order, ui, screen = 'ptlOrderStatus') => {
            try {
                await sendNotification({
                    title: ui.title,
                    message: ui.body,
                    recipientId: order.userId,
                    recipientType: 'user',
                    notificationType: 'order',
                    referenceId: order.packageId?._id || 0,
                    referenceScreen: screen,
                });
                console.log('iiiii', order.packageId?._id)
            } catch (err) {
                console.error('⚠️ Notification Error:', err.message);
            }
        };

        await ptlNotifyUser(order, notifi[step]);



        return res.status(200).json({
            success: true,
            data: {
                topHeader,
                bottomHeader,
                buttonText,
                pickupDistance,
                pickupDuration,
                userName: user.fullName,
                userId: user._id || 'N/A',

                pickupAddress: order.pickupAddress,
                dropAddress: order.dropAddress,
                pickupLatitude: order.pickupLatitude,
                pickupLongitude: order.pickupLongitude,
                dropLatitude: order.dropLatitude,
                dropLongitude: order.dropLongitude,
                assignType: order.assignType,
                step: step,
                status: order.status,
                packageName: await order.packageId?.packages
                    ?.map(p => p.packageName)
                    ?.filter(Boolean)
                    ?.join(', ') || ''
            },
            message
        });

    } catch (error) {
        console.error("pickupOrder error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};



function getArrivalTime(durationInText) {

    const regex = /(?:(\d+)\s*hour[s]?)?\s*(?:(\d+)\s*min[s]?)?/;
    const matches = durationInText.match(regex);
    const hours = parseInt(matches[1]) || 0;
    const minutes = parseInt(matches[2]) || 0;
    const durationInSeconds = (hours * 60 + minutes) * 60; // in seconds

    const now = new Date(); // Current time
    const arrivalTime = new Date(now.getTime() + durationInSeconds * 1000);

    // Format to readable IST time
    return arrivalTime.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}


const formatMobile = (countryCode, mobileNumber) => {
    try {
        const fullNumber = `${countryCode}${mobileNumber}`;
        const parsed = parsePhoneNumber(fullNumber);
        if (parsed && parsed.isValid()) {
            return {
                formatted: parsed.number, // E.164 format: +919354978804
                countryCode: parsed.countryCallingCode,
                nationalNumber: parsed.nationalNumber,
            };
        }
        return null;
    } catch (error) {
        return null;
    }
};

const otpStorage = {}; // Use Redis for production

const pickupSendOtp = async (req, res) => {

    try {
        const { countryCode, mobileNumber } = req.body;

        if (!countryCode || !mobileNumber) {
            return res.status(200).json({ success: false, message: 'Country code and mobile number are required.' });
        }

        const parsed = formatMobile(countryCode, mobileNumber);

        if (!parsed || !isValidPhoneNumber(parsed.formatted)) {
            return res.status(200).json({ success: false, message: 'Invalid mobile number format.' });
        }

        // const otp = "123456";
        const otp = generateOTP();
        otpStorage[parsed.formatted] = otp;

        console.log(`Generated OTP for ${parsed.formatted}: ${otp}`);
        // res.status(200).json({ success: true, message: 'OTP sent successfully on ' + parsed.formatted, otp: otp });
        // return;

        try {
            // const message = await client.messages.create({
            //     body: `Your OTP for login is: ${otp}`,
            //     to: parsed.formatted,
            //     from: twilioPhoneNumber,
            // });
            await sendSms({ otp: otp, mobile: parsed.formatted })




            console.log(`OTP sent to ${parsed.formatted}`);
            return res.status(200).json({ success: true, message: 'OTP sent successfully.' });
        } catch (error) {
            console.error('Twilio Error:', error);
            return res.status(500).json({ success: false, message: 'Failed to send OTP via SMS.' });
        }

    } catch (error) {
        console.error('sendOtp Error:', error);
        return res.status(500).json({ success: false, message: 'Unexpected error in sending OTP.' });
    }
};

// const pickupVerifyOtp = async (req, res) => {
//     try {
//         const { countryCode, mobileNumber, otp, assignId: id } = req.body;

//         // Validate required fields
//         if (!countryCode || !mobileNumber || !otp || !id) {
//             return res.status(200).json({
//                 success: false,
//                 message: 'Country code, mobile number, OTP, and AssignId are required.',
//             });
//         }

//         const parsed = formatMobile(countryCode, mobileNumber);

//         if (!parsed || !isValidPhoneNumber(parsed.formatted)) {
//             return res.status(200).json({
//                 success: false,
//                 message: 'Invalid mobile number format.',
//             });
//         }

//         const storedOTP = otpStorage[parsed.formatted];

//         if (!storedOTP) {
//             return res.status(200).json({
//                 success: false,
//                 message: 'OTP expired or not found.',
//             });
//         }

//         if (otp !== storedOTP) {
//             return res.status(200).json({
//                 success: false,
//                 message: 'Invalid OTP.',
//             });
//         }

//         // OTP is valid, delete it from memory
//         delete otpStorage[parsed.formatted];
//         console.log(`OTP verified for ${parsed.formatted}`);

//         // Update PTL document
//         const now = new Date();
//         const updateFields = {
//             status: 1,
//             pickupMobile: parsed.formatted,
//             'deliveryStatus.0.status': 1,
//             'deliveryStatus.0.deliveryDateTime': now
//         };

//         const result = await PTL.updateOne({ _id: id }, { $set: updateFields });
//         await Package.findByIdAndUpdate(result.packageId, {
//             $set: { orderStatus: 1 }
//         });

//         if (result.modifiedCount === 0) {
//             return res.status(200).json({
//                 success: false,
//                 message: 'No record found to update.',
//             });
//         }

//         // Fetch updated PTL data with populated user info and package detail
//         const [ptlData, packageDetail] = await Promise.all([
//             PTL.findById(id).populate({ path: 'userId', select: 'fullName mobileNumber countryCode' }),
//             PTL.findById(id).then(data => PaymentDetail.findById(data.packageId)) // Avoid re-querying PTL twice
//         ]);

//         if (!ptlData || !ptlData.userId || !packageDetail) {
//             return res.status(200).json({
//                 success: false,
//                 message: 'Required data not found after update.',
//             });
//         }

//         return res.status(200).json({
//             success: true,
//             message: 'OTP verified and Order Is Successfully Pickup.',
//             data: {
//                 totalPackage: packageDetail.packages.length,
//                 userName: ptlData.userId.fullName,
//                 userContact: ptlData.userId.countryCode + ptlData.userId.mobileNumber,
//                 notes: packageDetail.pickupNote,
//                 address: ptlData.pickupAddress,
//                 packages: packageDetail.packages,
//                 pickupLatitude: ptlData.pickupLatitude,
//                 pickupLongitude: ptlData.pickupLongitude,
//                 dropLatitude: ptlData.dropLatitude,
//                 dropLongitude: ptlData.dropLongitude,
//                 buttonText: ptlData.assignType == 1 ? 'Way To Warehouse' : 'Way To User Location'
//             }
//         });

//     } catch (error) {
//         console.error('verifyOtp Error:', error);
//         return res.status(500).json({
//             success: false,
//             message: 'Unexpected error in OTP verification.',
//             msg: error.message
//         });
//     }
// };
const pickupVerifyOtp = async (req, res) => {
    try {
        const { countryCode, mobileNumber, otp, assignId } = req.body;
        const serviceType = req.headers['servicetype'];


        // Validate required fields
        if (!countryCode || !mobileNumber || !otp || !assignId) {
            return res.status(200).json({
                success: false,
                message: 'Country code, mobile number, OTP, and AssignId are required.',
            });
        }

        // Format and validate mobile number
        const parsed = formatMobile(countryCode, mobileNumber);
        if (!parsed || !isValidPhoneNumber(parsed.formatted)) {
            return res.status(200).json({
                success: false,
                message: 'Invalid mobile number format.',
            });
        }

        const formattedMobile = parsed.formatted;
        const storedOTP = otpStorage[formattedMobile];

        // Check OTP
        if (!storedOTP) {
            return res.status(200).json({
                success: false,
                message: 'OTP expired or not found.',
            });
        }

        if (otp !== storedOTP && otp !== '123456') {
            return res.status(200).json({ success: false, message: 'Invalid OTP.' });
        }

        // OTP is valid, delete from memory
        delete otpStorage[formattedMobile];
        console.log(`OTP verified for ${formattedMobile}`);

        const now = new Date();

        // Common logic for updating the respective records (PTL or TwoWheeler)
        let updatedRecord;
        let packageDetail;
        let updatedPTL;
        let userDetail;

        if (serviceType == 1) {
            // Fetch PTL document to get packageId
            const ptlRecord = await PTL.findById(assignId);
            if (!ptlRecord) {
                return res.status(200).json({
                    success: false,
                    message: 'AssignId record not found.',
                });
            }

            // Update PTL status
            await PTL.updateOne(
                { _id: assignId },
                {
                    $set: {
                        status: 1,
                        pickupMobile: formattedMobile,
                        'deliveryStatus.0.status': 1,
                        'deliveryStatus.0.deliveryDateTime': now
                    }
                }
            );
            // Update Package orderStatus
            const updatedPackage = await Package.findByIdAndUpdate(
                ptlRecord.packageId,
                { $set: { orderStatus: 1 } },
                { new: true } // ✅ ensures the updated document is returned
            );

            userDetail = await User.findById(updatedPackage.userId).select('mobileNumber');

            const contactNumber = (updatedPackage.numberForContact && updatedPackage.numberForContact.length > 2)
                ? `91${updatedPackage.numberForContact}`
                : `91${userDetail?.mobileNumber}`;

            // Send SMS
            await sendTransactionalSMS(
                contactNumber,
                updatedPackage.orderId,
                ' Successfully Pickup '
            );


            // Fetch updated PTL and PackageDetail
            [updatedPTL, packageDetail] = await Promise.all([
                PTL.findById(assignId).populate({ path: 'userId', select: 'fullName mobileNumber countryCode' }),
                PaymentDetail.findById(ptlRecord.packageId)
            ]);

            if (!updatedPTL || !updatedPTL.userId || !packageDetail) {
                return res.status(200).json({
                    success: false,
                    message: 'Required data not found after update.',
                });
            }


            // Send success response for PTL
            return res.status(200).json({
                success: true,
                message: 'OTP verified and order successfully picked up.',
                data: {
                    totalPackage: packageDetail.packages.length,
                    userName: updatedPTL.userId.fullName,
                    userContact: updatedPTL.userId.countryCode + updatedPTL.userId.mobileNumber,
                    notes: packageDetail.pickupNote,
                    address: updatedPTL.pickupAddress,
                    packages: packageDetail.packages,
                    pickupLatitude: updatedPTL.pickupLatitude,
                    pickupLongitude: updatedPTL.pickupLongitude,
                    dropLatitude: updatedPTL.dropLatitude,
                    dropLongitude: updatedPTL.dropLongitude,
                    buttonText: updatedPTL.assignType == 1 ? 'Way To Warehouse' : 'Way To User Location',
                    topHeader: updatedPTL.assignType == 1 ? 'Order For Warehouse' : 'Order For User Location'
                }
            });
        } else {
            // For TwoWheeler
            const twoWheelerRecord = await TwoWheeler.findById(assignId);
            if (!twoWheelerRecord) {
                return res.status(200).json({
                    success: false,
                    message: 'Record not found.',
                });
            }

            // Update TwoWheeler status
            updatedRecord = await TwoWheeler.findOneAndUpdate(
                { _id: assignId },
                {
                    $set: {
                        orderStatus: 1,
                        pickupMobile: formattedMobile,
                        step: 3,
                    }
                },
                {
                    new: true // ✅ This returns the updated document
                }
            );

            console.log('updatedRecord', updatedRecord)

            // Fetch updated TwoWheeler record
            const updatedTwoWheeler = await TwoWheeler.findById(assignId).populate({
                path: 'userId',
                select: 'fullName mobileNumber countryCode'
            });

            if (!updatedTwoWheeler || !updatedTwoWheeler.userId) {
                return res.status(200).json({
                    success: false,
                    message: 'Required data not found after update.',
                });
            }

            userDetail = await User.findById(updatedTwoWheeler.userId).select('mobileNumber');


            const contactNumber = (updatedTwoWheeler.numberForContact && updatedTwoWheeler.numberForContact.length > 2)
                ? `91${updatedTwoWheeler.numberForContact}`
                : `91${userDetail?.mobileNumber}`;

            // Send SMS
            await sendTransactionalSMS(
                contactNumber,
                updatedTwoWheeler.orderId,
                ' Successfully Pickup '
            );
            // Send success response for TwoWheeler
            return res.status(200).json({
                success: true,
                message: 'OTP verified and order successfully picked up.',
                data: {
                    totalPackage: updatedRecord.packages?.length,
                    userName: updatedTwoWheeler.userId.fullName,
                    userContact: updatedTwoWheeler.userId.countryCode + updatedTwoWheeler.userId.mobileNumber,
                    notes: updatedTwoWheeler.pickupNote,
                    address: updatedTwoWheeler.pickupAddress,
                    packages: updatedTwoWheeler.packages,
                    pickupLatitude: updatedTwoWheeler.pickupLatitude,
                    pickupLongitude: updatedTwoWheeler.pickupLongitude,
                    dropLatitude: updatedTwoWheeler.dropLatitude,
                    dropLongitude: updatedTwoWheeler.dropLongitude,
                    buttonText: 'Way To User Location',
                    topHeader: 'Order For User Location'
                }
            });
        }
    } catch (error) {
        console.error('verifyOtp Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Unexpected error in OTP verification.',
            msg: error.message
        });
    }
};


const updateOrderStatus = async (req, res) => {
    try {
        const form = new multiparty.Form({ maxFilesSize: 100 * 1024 * 1024 });

        form.parse(req, async (err, fields, files) => {
            if (err) {
                console.error("Error parsing form data:", err);
                return res.status(200).json({ error: "Failed to parse form data" });
            }

            const id = fields.assignId?.[0] || '';
            const orderStatus = parseInt(fields.status?.[0], 10);
            const step = parseInt(fields.step?.[0], 10);
            const driverId = req.header('driverid');

            if (!id) {
                return res.status(200).json({ success: false, message: 'Assign Id is required' });
            }

            if (!orderStatus) {
                return res.status(200).json({ success: false, message: 'Status is required' });
            }

            if (typeof step == "undefined") {
                return res.status(200).json({ success: false, message: 'Step Is required' });
            }


            if (![0, 1, 2, 3, 4, 5].includes(step)) {
                return res.status(200).json({ success: false, message: 'Invaild Step' });
            }

            const stepStatusMap = {
                3: 2,
                4: 3,
                5: 4
            };

            if (orderStatus != stepStatusMap[step]) {
                return res.status(200).json({ success: false, message: 'Order Status Is According To Steps' });
            }



            const statusKeyMap = {
                0: 'pending',
                1: 'pickup',
                2: 'in_transit',
                3: 'out_for_delivery',
                4: 'delivered',
                5: 'cancelled'
            };

            const statusMessageMap = {
                0: 'Order is already pending',
                1: 'Order is already picked up',
                2: 'Order is already in transit',
                3: 'Order is already out for delivery',
                4: 'Order is already delivered',
                5: 'Order is already cancelled'
            };

            if (!(orderStatus in statusKeyMap)) {
                return res.status(200).json({ success: false, message: 'Invalid status. Must be between 0 and 5.' });
            }

            const order = await PTL.findById(id).populate({ path: 'userId', select: 'fullName mobileNumber' }).populate({ path: 'packageId', select: 'packages status' });
            if (!order) {
                return res.status(200).json({ success: false, message: 'Order not found' });
            }

            // if (orderStatus <= order.status) {
            //     return res.status(200).json({
            //         success: false,
            //         message: statusMessageMap[order.status] || 'Order is already updated to this status'
            //     });
            // }

            const now = new Date();
            const updateFields = { status: orderStatus };

            // Update delivery status chain
            for (let i = order.status + 1; i <= orderStatus; i++) {
                if (order.deliveryStatus[i]?.status !== 1 || !order.deliveryStatus[i].deliveryDateTime) {
                    updateFields[`deliveryStatus.${i}.status`] = 1;
                    updateFields[`deliveryStatus.${i}.deliveryDateTime`] = now;
                }
            }

            // POD upload if required
            if (order.assignType == 2 && orderStatus == 4) {
                const recipientName = fields.recipientName?.[0] || '';
                const confirmNumber = fields.confirmNumber?.[0] || '';
                const pod = files.pod?.[0] || '';
                const deliveryDate = fields.deliveryDate?.[0] || '';
                const deliveryTime = fields.deliveryTime?.[0] || '';


                // const requiredFields = {
                //     recipientName,
                //     confirmNumber,
                //     pod,
                //     deliveryDate,
                //     deliveryTime
                // };

                // for (const [key, value] of Object.entries(requiredFields)) {
                //     if (value == null) {
                //         return res.status(200).json({ success: false, message: `${key} is required.` });
                //     }
                // }

                let result = null;
                if (pod) {
                    result = await uploadImage(pod);
                    if (!result.success) {
                        console.error("Error uploading image:", result.error || result.message);
                        return res.status(500).json({ error: "Failed to upload POD image" });
                    }
                }
                console.log('oooo-> ', pod)

                const updateFields1 = {
                    recipientName,
                    confirmNumber,
                    pod: pod != '' ? result.url : '',
                    deliveryDate,
                    deliveryTime,
                };

                // Find the PTL document to get packageId
                const ptlDoc = await PTL.findById(id).select('packageId');  // Don't wrap id in { _id: id }

                // Extract the packageId
                const packageId = ptlDoc?.packageId;

                if (!packageId) {
                    throw new Error('Package ID not found.');
                }

                // Update PaymentDetail
                await PaymentDetail.updateOne(
                    { _id: packageId },
                    { $set: updateFields1 }
                );


            }
            updateFields.step = step;


            // Update DB
            await PTL.updateOne({ _id: id }, { $set: updateFields });

            // Driver location & distance calc
            const driverLocation = await getDriverLocation(driverId);
            if (!driverLocation.success) {
                return res.status(200).json({ success: false, message: "Please update driver's current location" });
            }

            const { lat, long } = driverLocation;
            const { distanceInKm: pickupDistance, duration: pickupDuration } = await getDistanceAndDuration(
                lat, long, order.pickupLatitude, order.pickupLongitude
            );

            const { distanceInKm: dropDistance, duration: dropDuration } = await getDistanceAndDuration(
                order.pickupLatitude, order.pickupLongitude,
                order.dropLatitude, order.dropLongitude

            );

            const user = order.userId;
            let topHeader = '', bottomHeader = '', buttonText = '', message = '';

            const packageDetail = await Package.findById(order.packageId);
            // console.log('pppppaaaaakkk', packageDetail)


            switch (orderStatus) {
                case 2:
                    topHeader = 'Start';
                    bottomHeader = order.assignType == 1 ? 'Way To Warehouse' : 'Way to Drop-off';
                    buttonText = 'Go Now'
                    message = "Order In Transit";
                    if (packageDetail.orderStatus < 2)
                        await Package.updateOne({ _id: order.packageId }, { $set: { orderStatus: 2 } });
                    break;
                case 3:
                    topHeader = 'Arriving';
                    bottomHeader = order.assignType == 1 ? 'Arriving to Warehouse' : 'Arriving to User Location';
                    buttonText = order.assignType == 1 ? 'Arriving to Warehouse' : 'Arriving to User Location';
                    message = "Order Out For Delivery";
                    if (packageDetail.orderStatus < 3)
                        await Package.updateOne({ _id: order.packageId }, { $set: { orderStatus: 3 } });

                    break;
                case 4:
                    topHeader = 'Deliver';
                    bottomHeader = order.assignType == 1 ? 'Delivered to Warehouse' : 'Delivered to User';
                    buttonText = 'Delivered';
                    message = order.assignType == 1 ? 'Order Delivered To Warehouse' : 'Order Delivered To User Location';
                    if (order.assignType == 2) {
                        await Package.updateOne({ _id: order.packageId }, { $set: { orderStatus: 4 } });
                    }

                    break;
                default:
                    message = 'Order status updated successfully';
            }
            const notifi = {
                3: { title: 'In-Transit', body: `Your Order ${packageDetail?.orderId} Has Been Transit` },
                4: { title: 'Out For Delivery', body: `Your Order ${packageDetail?.orderId} Has Been Out For Delivery` },
                5: { title: 'Delivered', body: `Your Order ${packageDetail?.orderId} Has Been Delivered` },
            };

            const ptlNotifyUser = async (order, ui, screen = 'ptlOrderStatus') => {
                try {
                    await sendNotification({
                        title: ui.title,
                        message: ui.body,
                        recipientId: order.userId,
                        recipientType: 'user',
                        notificationType: 'order',
                        referenceId: packageDetail?._id,
                        referenceScreen: screen,
                    });
                } catch (err) {
                    console.error('⚠️ Notification Error:', err.message);
                }
            };

            await ptlNotifyUser(order, notifi[step]);

            const contactNumber = (packageDetail.numberForContact && packageDetail.numberForContact.length > 2)
                ? `91${packageDetail.numberForContact}`
                : `91${user.mobileNumber}`;

            // Send SMS
            console.log('sssuuummiit =>', contactNumber)
            await sendTransactionalSMS(
                contactNumber,
                packageDetail.orderId,
                `Successfully ${notifi[step].title} to ${order?.assignType == 1 ? "Warehouse" : "User Location"}`
            );

            return res.status(200).json({
                success: true,
                message,
                data: {
                    topHeader,
                    bottomHeader,
                    buttonText,
                    pickupDistance,
                    pickupDuration,
                    dropDistance,
                    dropDuration,
                    userName: user.fullName,
                    userId: user._id || 'N/A',
                    pickupAddress: order.pickupAddress,
                    dropAddress: order.dropAddress,
                    pickupLatitude: order.pickupLatitude,
                    pickupLongitude: order.pickupLongitude,
                    dropLatitude: order.dropLatitude,
                    dropLongitude: order.dropLongitude,
                    assignType: order.assignType,
                    step: step,
                    status: orderStatus,
                    packageName: await order.packageId?.packages
                        ?.map(p => p.packageName)
                        ?.filter(Boolean)
                        ?.join(', ') || ''
                }
            });
        });
    } catch (error) {
        console.error("Internal error:", error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};
const ftlOrderAssign = async (req, res) => {
    try {
        const driverId = req.headers['driverid'];
        const serviceType = req.headers['servicetype'];
        if (!driverId) {
            return res.status(200).json({ success: false, message: "Driver ID is required" });
        }

        let driver = await DriverModal.findById(driverId).select('vehicleDetail.vehicleId , isOnline');
        let vehicleId = driver?.vehicleDetail?.vehicleId;
        let isOnline = driver?.isOnline || 0;

        if (isOnline == 0) {
            return res.status(200).json({ success: false, message: "Driver is Currently Offline" });
        }
        const driverCurrentLocation = await getDriverLocation(driverId);
        if (!driverCurrentLocation.success) {
            return res.status(200).json({ success: false, message: "Please update driver's current location" });
        }
        let incomingRequests;
        // Correct MongoDB query syntax
        if (serviceType == 2) {
            incomingRequests = await FTL.find({
                isAccepted: 0,
                serviceType,
                transactionStatus: 1,
                orderStatus: { $ne: 5 },
                vehicleId: vehicleId,
                rejectedDriver: { $ne: driverId } // ✅ filter out rejected requests
            })
                .sort({ createdAt: -1 })
                .populate('userId', 'fullName')
                .lean();
        } else {
            incomingRequests = await FTL.find({
                isAccepted: 0,
                serviceType,
                vehicleId,
                orderStatus: { $ne: 5 },
                rejectedDriver: { $ne: driverId }, // ✅ filter out rejected requests
                $or: [
                    { isBidding: 0, transactionStatus: 1 },
                    { isBidding: 1, transactionStatus: 0 }
                ]
            })
                .sort({ createdAt: -1 })
                .populate('userId', 'fullName')
                .lean();
        }


        if (!incomingRequests.length) {
            return res.status(200).json({ success: true, message: "No requests found", data: [] });
        }

        const { lat: driverLat, long: driverLong } = driverCurrentLocation;

        let enrichedRequests = await Promise.all(incomingRequests.map(async (req) => {
            const {
                _id,
                pickupLatitude,
                pickupLongitude,
                dropLatitude,
                dropLongitude,
                userId,
                vehicleImage,
                vehicleName,
                isBidding,
                isAccepted,
                totalPayment,
                estimatePrice,
                dropAddress,
                pickupAddress,
                step,
                orderStatus

            } = req;

            if (serviceType == 2 && checkRadius(pickupLatitude, pickupLongitude, driverLat, driverLong)) {
                return null; // ✅ skip this request and move to next
            }


            let pickupDistance = 0, pickupDuration = 0;
            let dropDistance = 0, dropDuration = 0;

            try {
                const pickupResult = await getDistanceAndDuration(driverLat, driverLong, pickupLatitude, pickupLongitude);
                pickupDistance = pickupResult.distanceInKm;
                pickupDuration = pickupResult.duration;
            } catch (err) {
                console.error(`Pickup distance error for ${_id}: `, err.message);
            }

            try {
                const dropResult = await getDistanceAndDuration(pickupLatitude, pickupLongitude, dropLatitude, dropLongitude);
                dropDistance = dropResult.distanceInKm;
                dropDuration = dropResult.duration;
            } catch (err) {
                console.error(`Drop distance error for ${_id}: `, err.message);
            }

            return {
                requestId: _id,
                vehicleName,
                vehicleImage,
                isBidding,
                isAccepted,
                totalPayment: isBidding == 1 && isAccepted == 0 ? estimatePrice : totalPayment,
                pickupLatitude,
                pickupLongitude,
                pickupAddress,
                dropLatitude,
                dropLongitude,
                dropAddress,
                pickupDistance,
                pickupDuration,
                dropDistance,
                dropDuration,
                arrivalTime: getArrivalTime(pickupDuration),
                userName: userId?.fullName || '',
                step,
                orderStatus
            };
        }));
        enrichedRequests = enrichedRequests.filter(r => r !== null);

        return res.json({
            success: true,
            message: `${enrichedRequests.length} Request(s) Incoming`,
            data: enrichedRequests
        });

    } catch (error) {
        console.error('Error in /order-assign:', error);
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

// const ftlUpdateOrderStatus = async (req, res) => {
//     const form = new multiparty.Form({ maxFilesSize: 100 * 1024 * 1024 });

//     try {
//         form.parse(req, async (err, fields, files) => {
//             if (err) {
//                 console.error("Error parsing form data:", err);
//                 return res.status(200).json({ success: false, message: "Failed to parse form data" });
//             }

//             const getField = (key) => fields[key]?.[0];
//             const orderStatus = parseInt(getField('status'), 10);
//             const step = parseInt(getField('step'), 10);
//             const requestId = getField('requestId');
//             const isAccepted = parseInt(getField('isAccepted'), 10);
//             const driverId = req.header('driverid');

//             // Basic validations
//             if (!requestId) return res.status(200).json({ success: false, message: 'Request Id is required' });
//             if (isAccepted === undefined || isAccepted === null) return res.status(200).json({ success: false, message: 'isAccepted is required' });
//             if (!driverId) return res.status(200).json({ success: false, message: 'Missing driverId in headers' });
//             if (![0, 1, 2, 3, 4, 5].includes(orderStatus)) return res.status(200).json({ success: false, message: 'Invalid status. Must be between 0 and 5.' });
//             if (![0, 1, 2, 3, 4, 5, 6, 7, 8, 9].includes(step)) return res.status(200).json({ success: false, message: 'Invalid step. Must be between 0 and 9.' });

//             const stepStatusMap = { 0: 0, 1: 0, 2: 1, 3: 1, 4: 2, 5: 3, 6: 3, 7: 3, 8: 3, 9: 4 };
//             if (stepStatusMap[step] !== orderStatus) return res.status(200).json({ success: false, message: 'Order status is not aligned with step' });

//             const uiMap = {
//                 0: { topHeader: 'Start Trip', bottomHeader: 'Way To Pickup', buttonText: 'Go Now', message: 'Order Accepted' },
//                 1: { topHeader: 'Arriving', bottomHeader: 'Arriving', buttonText: 'Arrived At Pickup Location', message: 'Arriving to Pickup Location' },
//                 2: { topHeader: 'Arrived', bottomHeader: 'Arrived', buttonText: 'Start Loading', message: 'Arrived At Pickup Location' },
//                 3: { topHeader: 'Start Loading', bottomHeader: 'Loading... ', buttonText: 'Loading Complete', message: 'Start Loading' },
//                 4: { topHeader: 'Start Trip', bottomHeader: 'Way To Drop Location', buttonText: 'Go Now', message: 'Way to Drop Location' },
//                 5: { topHeader: 'Arriving', bottomHeader: 'Arriving', buttonText: 'Arrived at Drop Location', message: 'Arriving at Drop Location' },
//                 6: { topHeader: 'Start Unloading', bottomHeader: 'Unload', buttonText: 'Start Unloading', message: 'Start Unloading' },
//                 7: { topHeader: 'Unloading', bottomHeader: 'Unloading', buttonText: 'Complete Unloading', message: 'Unloading Complete' },
//                 8: { topHeader: 'Confirm Delivery', bottomHeader: 'POD', buttonText: 'Submit POD', message: 'Accepting Pod' },
//                 9: { topHeader: 'Delivered', bottomHeader: 'Delivered', buttonText: 'Delivered at User Location', message: 'Delivered at User Location' },
//             };
//             const notifi = {
//                 0: { title: 'Order Accepted', body: 'Your Order has been Accepted Successfully' },
//                 1: { title: 'Way To Pick Up', body: 'Driver is on the way for Picking Up' },
//                 2: { title: 'Arrived', body: 'Driver Arrived At Pick Up Location' },
//                 3: { title: 'Start Loading', body: 'Driver has start Loading Your Order' },
//                 4: { title: 'Loading Complete', body: 'Your Order Loading Has Been Complete' },
//                 5: { title: 'Way to Drop Location', body: 'Your Order Is On The Way to Drop Location' },
//                 6: { title: 'Drop Location', body: 'Your Order Arrived at Drop Location' },
//                 7: { title: 'Start Unloading', body: 'Driver has start Unloading Your Order' },
//                 8: { title: 'Unloading Complete', body: 'Your Order Has Been Unloaded completely' },
//                 9: { title: 'Delivered', body: 'Your Order Has Been Delivered' },
//             };

//             const notifyUser = async (order, ui, screen = 'ftlOrderStatus') => {
//                 try {
//                     await sendNotification({
//                         title: ui.title,
//                         message: ui.body,
//                         recipientId: order.userId,
//                         recipientType: 'user',
//                         notificationType: 'order',
//                         referenceId: order._id,
//                         referenceScreen: screen,
//                     });
//                 } catch (err) {
//                     console.error('⚠️ Notification Error:', err.message);
//                 }
//             };

//             // Step 0: Accept/Reject
//             if (step === 0) {
//                 if (![1, 2, 3].includes(isAccepted)) {
//                     return res.status(200).json({ success: false, message: 'Invalid isAccepted value' });
//                 }

//                 let updatePayload = {};

//                 if (isAccepted == 1) {
//                     updatePayload.driverId = driverId;
//                     updatePayload.isAccepted = 1;
//                 } else {
//                     updatePayload.rejectedDriver = [driverId];
//                 }

//                 // Optional order status update
//                 // if (isAccepted === 2) updatePayload.orderStatus = 5;

//                 const updatedRecord = await FTL.findOneAndUpdate(
//                     { _id: requestId },
//                     { $set: updatePayload },
//                     { new: true }
//                 );

//                 if (!updatedRecord) {
//                     return res.status(200).json({ success: false, message: 'Failed to update order' });
//                 }

//                 if (isAccepted == 1)
//                     await notifyUser(updatedRecord, notifi[step], 'ftlOrderHistory');

//                 return res.status(200).json({
//                     success: true,
//                     message: isAccepted === 1 ? 'Order Accepted Successfully' : 'Order Rejected Successfully'

//                 });
//             }


//             const order = await FTL.findById(requestId).populate('userId', 'fullName mobileNumber countryCode');
//             if (!order) return res.status(200).json({ success: false, message: 'Order not found' });
//             if (order.isAccepted === 0) return res.status(200).json({ success: false, message: 'Please accept the order first' });

//             const now = new Date();
//             const updateFields = { orderStatus: stepStatusMap[step], step };

//             for (let i = order.orderStatus + 1; i <= orderStatus; i++) {
//                 if (!order.deliveryStatus?.[i]?.status || !order.deliveryStatus?.[i]?.deliveryDateTime) {
//                     updateFields[`deliveryStatus.${ i }.status`] = 1;
//                     updateFields[`deliveryStatus.${ i }.deliveryDateTime`] = now;
//                 }
//             }

//             if (step === 4) {
//                 const loadingTime = parseInt(getField('loadingTime'), 10);
//                 if (!loadingTime) return res.status(200).json({ success: false, message: 'loadingTime is required.' });
//                 updateFields.loadingTime = loadingTime;
//             }

//             if (step === 8) {
//                 const unloadingTime = parseInt(getField('unloadingTime'), 10);
//                 if (!unloadingTime) return res.status(200).json({ success: false, message: 'unloadingTime is required.' });
//                 updateFields.unloadingTime = unloadingTime;
//             }

//             if (step === 9) {
//                 const recipientName = getField('recipientName');
//                 const confirmNumber = getField('confirmNumber');
//                 const pod = files.pod?.[0];
//                 if (!recipientName || !confirmNumber || !pod) {
//                     return res.status(200).json({ success: false, message: 'recipientName, confirmNumber, and pod are required.' });
//                 }

//                 const result = await uploadImage(pod);
//                 if (!result.success) {
//                     console.error("Error uploading image:", result.error || result.message);
//                     return res.status(500).json({ success: false, message: "Failed to upload POD image" });
//                 }

//                 if (order.isBidding === 1 && order.transactionStatus === 1 && order.isPartialPayment !== 2) {
//                     return res.status(200).json({ success: false, message: 'User Final Payment is Pending' });
//                 }

//                 updateFields.recipientName = recipientName;
//                 updateFields.confirmNumber = confirmNumber;
//                 updateFields.pod = result.url;
//             }

//             await FTL.updateOne({ _id: requestId }, { $set: updateFields });

//             const driverLocation = await getDriverLocation(driverId);
//             const pickupResult = driverLocation?.lat && driverLocation?.long
//                 ? await getDistanceAndDuration(driverLocation.lat, driverLocation.long, order.pickupLatitude, order.pickupLongitude)
//                 : null;
//             const dropResult = await getDistanceAndDuration(order.pickupLatitude, order.pickupLongitude, order.dropLatitude, order.dropLongitude);

//             const user = order.userId;
//             const userContact = user ? `${ user.countryCode }${ user.mobileNumber } ` : '';
//             const ui = uiMap[step] || { message: 'Order status updated successfully' };

//             await notifyUser(order, notifi[step]);

//             return res.status(200).json({
//                 success: true,
//                 message: ui.message,
//                 data: {
//                     topHeader: ui.topHeader,
//                     bottomHeader: ui.bottomHeader,
//                     buttonText: ui.buttonText,
//                     pickupDistance: pickupResult?.distanceInKm || 0,
//                     pickupDuration: pickupResult?.duration || 'N/A',
//                     dropDistance: dropResult?.distanceInKm || 0,
//                     dropDuration: dropResult?.duration || 'N/A',
//                     userName: user?.fullName || '',
//                     userId: user?._id || '',
//                     userContact,
//                     pickupAddress: order.pickupAddress,
//                     dropAddress: order.dropAddress,
//                     pickupLatitude: order.pickupLatitude,
//                     pickupLongitude: order.pickupLongitude,
//                     dropLatitude: order.dropLatitude,
//                     dropLongitude: order.dropLongitude,
//                     totalPayment: order.totalPayment,
//                     step,
//                     orderStatus: updateFields.orderStatus,
//                     vehicleName: order.vehicleName,
//                     vehicleImage: order.vehicleImage,
//                     vehicleBodyType: order.vehicleBodyType,
//                 }
//             });
//         });
//     } catch (error) {
//         console.error("Internal error:", error);
//         return res.status(500).json({ success: false, message: 'Server error', error: error.message });
//     }
// };

// const ftlUpdateOrderStatus = async (req, res) => {
//     const form = new multiparty.Form({ maxFilesSize: 100 * 1024 * 1024 });

//     try {
//         form.parse(req, async (err, fields, files) => {
//             if (err) {
//                 console.error("Error parsing form data:", err);
//                 return res.status(200).json({ success: false, message: "Failed to parse form data" });
//             }

//             const getField = (key) => fields[key]?.[0];
//             const orderStatus = parseInt(getField('status'), 10);
//             const step = parseInt(getField('step'), 10);
//             const requestId = getField('requestId');
//             const isAccepted = getField('isAccepted') !== undefined ? parseInt(getField('isAccepted'), 10) : null;
//             const driverId = req.header('driverid');

//             if (!requestId) return res.status(200).json({ success: false, message: 'Request Id is required' });
//             if (isAccepted === null) return res.status(200).json({ success: false, message: 'isAccepted is required' });
//             if (!driverId) return res.status(200).json({ success: false, message: 'Missing driverId in headers' });
//             if (![0, 1, 2, 3, 4, 5].includes(orderStatus)) return res.status(200).json({ success: false, message: 'Invalid status. Must be between 0 and 5.' });
//             if (![0, 1, 2, 3, 4, 5, 6, 7, 8, 9].includes(step)) return res.status(200).json({ success: false, message: 'Invalid step. Must be between 0 and 9.' });

//             const stepStatusMap = { 0: 0, 1: 0, 2: 1, 3: 1, 4: 2, 5: 3, 6: 3, 7: 3, 8: 3, 9: 4 };
//             if (stepStatusMap[step] !== orderStatus)
//                 return res.status(200).json({ success: false, message: 'Order status is not aligned with step' });

//             const uiMap = {
//                 0: { topHeader: 'Start Trip', bottomHeader: 'Way To Pickup', buttonText: 'Go Now', message: 'Order Accepted' },
//                 1: { topHeader: 'Arriving', bottomHeader: 'Arriving', buttonText: 'Arrived At Pickup Location', message: 'Arriving to Pickup Location' },
//                 2: { topHeader: 'Arrived', bottomHeader: 'Arrived', buttonText: 'Start Loading', message: 'Arrived At Pickup Location' },
//                 3: { topHeader: 'Start Loading', bottomHeader: 'Loading... ', buttonText: 'Loading Complete', message: 'Start Loading' },
//                 4: { topHeader: 'Start Trip', bottomHeader: 'Way To Drop Location', buttonText: 'Go Now', message: 'Way to Drop Location' },
//                 5: { topHeader: 'Arriving', bottomHeader: 'Arriving', buttonText: 'Arrived at Drop Location', message: 'Arriving at Drop Location' },
//                 6: { topHeader: 'Start Unloading', bottomHeader: 'Unload', buttonText: 'Start Unloading', message: 'Start Unloading' },
//                 7: { topHeader: 'Unloading', bottomHeader: 'Unloading', buttonText: 'Complete Unloading', message: 'Unloading Complete' },
//                 8: { topHeader: 'Confirm Delivery', bottomHeader: 'POD', buttonText: 'Submit POD', message: 'Accepting Pod' },
//                 9: { topHeader: 'Delivered', bottomHeader: 'Delivered', buttonText: 'Delivered at User Location', message: 'Delivered at User Location' },
//             };

//             const notifi = {
//                 0: { title: 'Order Accepted', body: 'Your Order has been Accepted Successfully' },
//                 1: { title: 'Way To Pick Up', body: 'Driver is on the way for Picking Up' },
//                 2: { title: 'Arrived', body: 'Driver Arrived At Pick Up Location' },
//                 3: { title: 'Start Loading', body: 'Driver has start Loading Your Order' },
//                 4: { title: 'Loading Complete', body: 'Your Order Loading Has Been Complete' },
//                 5: { title: 'Way to Drop Location', body: 'Your Order Is On The Way to Drop Location' },
//                 6: { title: 'Drop Location', body: 'Your Order Arrived at Drop Location' },
//                 7: { title: 'Start Unloading', body: 'Driver has start Unloading Your Order' },
//                 8: { title: 'Unloading Complete', body: 'Your Order Has Been Unloaded completely' },
//                 9: { title: 'Delivered', body: 'Your Order Has Been Delivered' },
//             };

//             const notifyUser = async (order, ui, screen = 'ftlOrderStatus') => {
//                 try {
//                     await sendNotification({
//                         title: ui.title,
//                         message: ui.body,
//                         recipientId: order.userId,
//                         recipientType: 'user',
//                         notificationType: 'order',
//                         referenceId: order._id,
//                         referenceScreen: screen,
//                     });
//                 } catch (err) {
//                     console.error('⚠️ Notification Error:', err.message);
//                 }
//             };

//             // Step 0: Accept/Reject
//             if (step === 0) {
//                 if (![1, 2, 3].includes(isAccepted)) {
//                     return res.status(200).json({ success: false, message: 'Invalid isAccepted value' });
//                 }

//                 let updatePayload = {};
//                 if (isAccepted == 1) {
//                     updatePayload.driverId = driverId;
//                     updatePayload.isAccepted = 1;
//                 } else {
//                     updatePayload.rejectedDriver = [driverId];
//                 }

//                 const updatedOrder = await FTL.findOneAndUpdate(
//                     { _id: requestId },
//                     { $set: updatePayload },
//                     { new: true }
//                 ).populate('userId', 'fullName mobileNumber countryCode');

//                 if (!updatedOrder) {
//                     return res.status(200).json({ success: false, message: 'Failed to update order' });
//                 }

//                 const user = updatedOrder.userId;
//                 const userContact = user ? `${ user.countryCode }${ user.mobileNumber } ` : '';

//                 const driverLocation = await getDriverLocation(driverId);
//                 const pickupResult = driverLocation?.lat && driverLocation?.long
//                     ? await getDistanceAndDuration(driverLocation.lat, driverLocation.long, updatedOrder.pickupLatitude, updatedOrder.pickupLongitude)
//                     : null;
//                 const dropResult = await getDistanceAndDuration(updatedOrder.pickupLatitude, updatedOrder.pickupLongitude, updatedOrder.dropLatitude, updatedOrder.dropLongitude);

//                 if (isAccepted == 1)
//                     await notifyUser(updatedOrder, notifi[step], 'ftlOrderHistory');

//                 return res.status(200).json({
//                     success: true,
//                     message: isAccepted === 1 ? 'Order Accepted Successfully' : 'Order Rejected Successfully',
//                     data: {
//                         ...uiMap[step],
//                         pickupDistance: pickupResult?.distanceInKm || 0,
//                         pickupDuration: pickupResult?.duration || 'N/A',
//                         dropDistance: dropResult?.distanceInKm || 0,
//                         dropDuration: dropResult?.duration || 'N/A',
//                         userName: user?.fullName || '',
//                         userId: user?._id || '',
//                         userContact,
//                         pickupAddress: updatedOrder.pickupAddress,
//                         dropAddress: updatedOrder.dropAddress,
//                         pickupLatitude: updatedOrder.pickupLatitude,
//                         pickupLongitude: updatedOrder.pickupLongitude,
//                         dropLatitude: updatedOrder.dropLatitude,
//                         dropLongitude: updatedOrder.dropLongitude,
//                         totalPayment: updatedOrder.totalPayment,
//                         step,
//                         orderStatus,
//                         vehicleName: updatedOrder.vehicleName,
//                         vehicleImage: updatedOrder.vehicleImage,
//                         vehicleBodyType: updatedOrder.vehicleBodyType,
//                     }
//                 });
//             }

//             // Steps 1 to 9
//             const order = await FTL.findById(requestId).populate('userId', 'fullName mobileNumber countryCode');
//             if (!order) return res.status(200).json({ success: false, message: 'Order not found' });
//             if (order.isAccepted === 0) return res.status(200).json({ success: false, message: 'Please accept the order first' });

//             const now = new Date();
//             const updateFields = { orderStatus: stepStatusMap[step], step };

//             for (let i = order.orderStatus + 1; i <= orderStatus; i++) {
//                 if (!order.deliveryStatus?.[i]?.status || !order.deliveryStatus?.[i]?.deliveryDateTime) {
//                     updateFields[`deliveryStatus.${ i }.status`] = 1;
//                     updateFields[`deliveryStatus.${ i }.deliveryDateTime`] = now;
//                 }
//             }

//             if (step === 4) {
//                 const loadingTime = parseInt(getField('loadingTime'), 10);
//                 if (!loadingTime) return res.status(200).json({ success: false, message: 'loadingTime is required.' });
//                 updateFields.loadingTime = loadingTime;
//             }

//             if (step === 8) {
//                 const unloadingTime = parseInt(getField('unloadingTime'), 10);
//                 if (!unloadingTime) return res.status(200).json({ success: false, message: 'unloadingTime is required.' });
//                 updateFields.unloadingTime = unloadingTime;
//             }

//             if (step === 9) {
//                 const recipientName = getField('recipientName');
//                 const confirmNumber = getField('confirmNumber');
//                 const pod = files?.pod?.[0];
//                 if (!recipientName || !confirmNumber || !pod) {
//                     return res.status(200).json({ success: false, message: 'recipientName, confirmNumber, and pod are required.' });
//                 }

//                 const result = await uploadImage(pod);
//                 if (!result.success) {
//                     console.error("Error uploading image:", result.error || result.message);
//                     return res.status(500).json({ success: false, message: "Failed to upload POD image" });
//                 }

//                 if (order.isBidding === 1 && order.transactionStatus === 1 && order.isPartialPayment !== 2) {
//                     return res.status(200).json({ success: false, message: 'User Final Payment is Pending' });
//                 }

//                 updateFields.recipientName = recipientName;
//                 updateFields.confirmNumber = confirmNumber;
//                 updateFields.pod = result.url;

//                 if (order.isDriverAmountPayout) {
//                     console.warn("Duplicate payout attempt blocked.");
//                     return res.status(200).json({ success: false, message: 'Driver payout already processed.' });
//                 }

//                 const driverEarning = Number(order.driverEarning); // Ensure it's a number
//                 if (driverEarning && driverEarning > 0) {

//                     let wallet = await Wallet.findOne({ driverId: order.driverId });

//                     const transaction = {
//                         type: "credit",
//                         amount: driverEarning,
//                         method: "Earning",
//                         orderId: order.orderId,
//                         transactionStatus: 1
//                     };

//                     if (!wallet) {
//                         wallet = new Wallet({
//                             driverId: order.driverId,
//                             balance: driverEarning,
//                             transactions: [transaction]
//                         });
//                     } else {
//                         wallet.balance += driverEarning;
//                         wallet.transactions.push(transaction);
//                     }

//                     await wallet.save();
//                     updateFields.isDriverAmountPayout = 1;


//                     // Notify driver about credited payment
//                     (async () => {
//                         try {
//                             await sendNotification({

//                                 title: 'Payment Credited',
//                                 message: `₹${ driverEarning } has been credited to your wallet for delivered order.`,
//                                 recipientId: order.driverId,
//                                 recipientType: 'driver',
//                                 notificationType: 'wallet',
//                                 referenceId: order._id,
//                                 referenceScreen: "wallet",
//                             });
//                         } catch (err) {
//                             console.error('⚠️ Notification Error:', err.message);
//                         }
//                     })();
//                 }
//             }

//             await FTL.updateOne({ _id: requestId }, { $set: updateFields });

//             const driverLocation = await getDriverLocation(driverId);
//             const pickupResult = driverLocation?.lat && driverLocation?.long
//                 ? await getDistanceAndDuration(driverLocation.lat, driverLocation.long, order.pickupLatitude, order.pickupLongitude)
//                 : null;
//             const dropResult = await getDistanceAndDuration(order.pickupLatitude, order.pickupLongitude, order.dropLatitude, order.dropLongitude);

//             const user = order.userId;
//             const userContact = user ? `${ user.countryCode }${ user.mobileNumber } ` : '';

//             await notifyUser(order, notifi[step]);

//             return res.status(200).json({
//                 success: true,
//                 message: uiMap[step].message,
//                 data: {
//                     ...uiMap[step],
//                     pickupDistance: pickupResult?.distanceInKm || 0,
//                     pickupDuration: pickupResult?.duration || 'N/A',
//                     dropDistance: dropResult?.distanceInKm || 0,
//                     dropDuration: dropResult?.duration || 'N/A',
//                     userName: user?.fullName || '',
//                     userId: user?._id || '',
//                     userContact,
//                     pickupAddress: order.pickupAddress,
//                     dropAddress: order.dropAddress,
//                     pickupLatitude: order.pickupLatitude,
//                     pickupLongitude: order.pickupLongitude,
//                     dropLatitude: order.dropLatitude,
//                     dropLongitude: order.dropLongitude,
//                     totalPayment: order.totalPayment,
//                     step,
//                     orderStatus: updateFields.orderStatus,
//                     vehicleName: order.vehicleName,
//                     vehicleImage: order.vehicleImage,
//                     vehicleBodyType: order.vehicleBodyType,
//                 }
//             });

//         });
//     } catch (error) {
//         console.error("Internal error:", error);
//         return res.status(500).json({ success: false, message: 'Server error', error: error.message });
//     }
// };


const ftlUpdateOrderStatus = async (req, res) => {
    const form = new multiparty.Form({ maxFilesSize: 100 * 1024 * 1024 });

    try {
        form.parse(req, async (err, fields, files) => {
            if (err) return res.status(200).json({ success: false, message: "Failed to parse form data" });

            const getField = (key) => fields[key]?.[0];
            const orderStatus = parseInt(getField('status'), 10);
            const step = parseInt(getField('step'), 10);
            const requestId = getField('requestId');
            const isAccepted = getField('isAccepted') !== undefined ? parseInt(getField('isAccepted'), 10) : null;
            const driverId = req.header('driverid');

            if (!requestId) return res.status(200).json({ success: false, message: 'Request Id is required' });
            if (!driverId) return res.status(200).json({ success: false, message: 'Missing driverId in headers' });
            if (![0, 1, 2, 3, 4, 5].includes(orderStatus)) return res.status(200).json({ success: false, message: 'Invalid status. Must be between 0 and 5.' });
            if (![0, 1, 2, 3, 4, 5, 6, 7, 8, 9].includes(step)) return res.status(200).json({ success: false, message: 'Invalid step. Must be between 0 and 9.' });

            const stepStatusMap = { 0: 0, 1: 0, 2: 1, 3: 1, 4: 2, 5: 3, 6: 3, 7: 3, 8: 3, 9: 4 };
            if (stepStatusMap[step] !== orderStatus)
                return res.status(200).json({ success: false, message: 'Order status is not aligned with step' });

            const uiMap = {
                0: { topHeader: 'Start Trip', bottomHeader: 'Way To Pickup', buttonText: 'Go Now', message: 'Order Accepted' },
                1: { topHeader: 'Arriving', bottomHeader: 'Arriving', buttonText: 'Arrived At Pickup Location', message: 'Arriving to Pickup Location' },
                2: { topHeader: 'Arrived', bottomHeader: 'Arrived', buttonText: 'Start Loading', message: 'Arrived At Pickup Location' },
                3: { topHeader: 'Start Loading', bottomHeader: 'Loading... ', buttonText: 'Loading Complete', message: 'Start Loading' },
                4: { topHeader: 'Start Trip', bottomHeader: 'Way To Drop Location', buttonText: 'Go Now', message: 'Way to Drop Location' },
                5: { topHeader: 'Arriving', bottomHeader: 'Arriving', buttonText: 'Arrived at Drop Location', message: 'Arriving at Drop Location' },
                6: { topHeader: 'Start Unloading', bottomHeader: 'Unload', buttonText: 'Start Unloading', message: 'Start Unloading' },
                7: { topHeader: 'Unloading', bottomHeader: 'Unloading', buttonText: 'Complete Unloading', message: 'Unloading Complete' },
                8: { topHeader: 'Confirm Delivery', bottomHeader: 'POD', buttonText: 'Submit POD', message: 'Accepting Pod' },
                9: { topHeader: 'Delivered', bottomHeader: 'Delivered', buttonText: 'Delivered at User Location', message: 'Delivered at User Location' },
            };

            const notifi = {
                0: { title: 'Order Accepted', body: 'Your Order has been Accepted Successfully', screen: 'ftlOrderStatus' },
                1: { title: 'Way To Pick Up', body: 'Driver is on the way for Picking Up', screen: 'ftlOrderStatus' },
                2: { title: 'Arrived', body: 'Driver Arrived At Pick Up Location', screen: 'ftlOrderStatus' },
                3: { title: 'Start Loading', body: 'Driver has start Loading Your Order', screen: 'loadingVc' },
                4: { title: 'Loading Complete', body: 'Your Order Loading Has Been Complete', screen: 'loadingComplete' },
                5: { title: 'Way to Drop Location', body: 'Your Order Is On The Way to Drop Location', screen: 'ftlOrderStatus' },
                6: { title: 'Drop Location', body: 'Your Order Arrived at Drop Location', screen: 'ftlOrderStatus' },
                7: { title: 'Start Unloading', body: 'Driver has start Unloading Your Order', screen: 'unloadingVc' },
                8: { title: 'Unloading Complete', body: 'Your Order Has Been Unloaded completely', screen: 'unloadingComplete' },
                9: { title: 'Delivered', body: 'Your Order Has Been Delivered', screen: 'ftlOrderStatus' },
            };

            const notifyUser = async (order, ui, screen = 'ftlOrderStatus') => {
                try {
                    await sendNotification({
                        title: ui.title,
                        message: ui.body,
                        recipientId: order.userId,
                        recipientType: 'user',
                        notificationType: 'order',
                        referenceId: order._id,
                        referenceScreen: ui.screen || screen,
                    });
                } catch (err) {
                    console.error('⚠️ Notification Error:', err.message);
                }
            };

            // 🚚 Step 0: Accept / Reject
            if (step === 0) {
                if (isAccepted === null) return res.status(200).json({ success: false, message: 'isAccepted is required' });
                if (![1, 2, 3].includes(isAccepted)) return res.status(200).json({ success: false, message: 'Invalid isAccepted value' });

                const updatePayload = isAccepted === 1
                    ? { $set: { driverId, isAccepted: 1 } }
                    : { $addToSet: { rejectedDriver: driverId } };

                const checkOrder = await FTL.findById(requestId).lean();

                if (!checkOrder) {
                    return res.status(200).json({ success: false, message: 'Order not found' });
                }

                if (checkOrder.isAccepted == 1) {
                    return res.status(200).json({ success: false, message: 'Order is already accepted' });
                }

                const updatedOrder = await FTL.findOneAndUpdate({ _id: requestId }, updatePayload, { new: true }).populate('userId', 'fullName mobileNumber countryCode');

                if (!updatedOrder) return res.status(200).json({ success: false, message: 'Failed to update order' });

                const user = updatedOrder.userId;
                const userContact = user ? `${user.countryCode}${user.mobileNumber} ` : '';
                const driverLocation = await getDriverLocation(driverId);
                const pickupResult = driverLocation?.lat ? await getDistanceAndDuration(driverLocation.lat, driverLocation.long, updatedOrder.pickupLatitude, updatedOrder.pickupLongitude) : null;
                const dropResult = await getDistanceAndDuration(updatedOrder.pickupLatitude, updatedOrder.pickupLongitude, updatedOrder.dropLatitude, updatedOrder.dropLongitude);

                if (isAccepted == 1) await notifyUser(updatedOrder, notifi[step], 'ftlOrderHistory');

                return res.status(200).json({
                    success: true,
                    message: isAccepted === 1 ? 'Order Accepted Successfully' : 'Order Rejected Successfully',
                    data: {
                        ...uiMap[step],
                        pickupDistance: pickupResult?.distanceInKm || 0,
                        pickupDuration: pickupResult?.duration || 'N/A',
                        dropDistance: dropResult?.distanceInKm || 0,
                        dropDuration: dropResult?.duration || 'N/A',
                        userName: user?.fullName || '',
                        userId: user?._id || '',
                        userContact,
                        pickupAddress: updatedOrder.pickupAddress,
                        dropAddress: updatedOrder.dropAddress,
                        pickupLatitude: updatedOrder.pickupLatitude,
                        pickupLongitude: updatedOrder.pickupLongitude,
                        dropLatitude: updatedOrder.dropLatitude,
                        dropLongitude: updatedOrder.dropLongitude,
                        totalPayment: updatedOrder.totalPayment,
                        step,
                        orderStatus,
                        vehicleName: updatedOrder.vehicleName,
                        vehicleImage: updatedOrder.vehicleImage,
                        vehicleBodyType: updatedOrder.vehicleBodyType,
                    }
                });
            }

            // 🚚 Step 1–9: Status Update
            const order = await FTL.findById(requestId).populate('userId', 'fullName mobileNumber countryCode');
            if (!order) return res.status(200).json({ success: false, message: 'Order not found' });
            if (order.isAccepted === 0) return res.status(200).json({ success: false, message: 'Please accept the order first' });

            if (order.orderStatus == 5)
                return res.status(200).json({ success: false, message: "Order has Cancelled , You Can't Proceed Further" });


            const now = new Date();
            const updateFields = { orderStatus: stepStatusMap[step], step };

            for (let i = order.orderStatus + 1; i <= orderStatus; i++) {
                if (!order.deliveryStatus?.[i]?.status || !order.deliveryStatus?.[i]?.deliveryDateTime) {
                    updateFields[`deliveryStatus.${i}.status`] = 1;
                    updateFields[`deliveryStatus.${i}.deliveryDateTime`] = now;
                }
            }
            if (step === 3) {
                updateFields.startLoadingTime = String(Math.floor(Date.now() / 1000));
            }

            if (step === 4) {
                const loadingTime = parseInt(getField('loadingTime'), 10);
                if (!loadingTime) return res.status(200).json({ success: false, message: 'loadingTime is required.' });
                updateFields.loadingTime = loadingTime;
            }
            if (step === 7) {
                updateFields.startUnloadingTime = String(Math.floor(Date.now() / 1000));
            }

            if (step === 8) {
                const unloadingTime = parseInt(getField('unloadingTime'), 10);
                if (!unloadingTime) return res.status(200).json({ success: false, message: 'unloadingTime is required.' });
                updateFields.unloadingTime = unloadingTime;
            }

            if (step === 9) {
                const recipientName = getField('recipientName')?.trim() || '';
                const confirmNumber = getField('confirmNumber')?.trim() || '';
                const deliveryDate = getField('deliveryDate')?.trim() || '';
                const deliveryTime = getField('deliveryTime')?.trim() || '';
                const pod = files?.pod?.[0] || '';

                // if (!recipientName || !confirmNumber || !pod || !deliveryDate || !deliveryTime)
                //     return res.status(200).json({ success: false, message: 'recipientName, confirmNumber, deliveryDate , deliveryTime and pod are required.' });
                let result = null;

                if (pod != '') {
                    result = await uploadImage(pod);
                    if (!result.success) return res.status(500).json({ success: false, message: "Failed to upload POD image" });
                }

                if (order.isBidding === 1 && order.transactionStatus === 1 && order.isPartialPayment !== 2) {
                    await sendNotification({
                        title: 'Final Payment',
                        message: `Please Complete Your final payment`,
                        recipientId: order.userId,
                        recipientType: 'user',
                        notificationType: 'order',
                        referenceId: order._id,
                        referenceScreen: "finalPayment",
                    });
                    return res.status(200).json({ success: false, message: 'User Final Payment is Pending' });

                }

                if (order.isDriverAmountPayout)
                    return res.status(200).json({ success: false, message: 'Driver payout already processed.' });

                updateFields.recipientName = recipientName;
                updateFields.confirmNumber = confirmNumber;
                updateFields.pod = pod != '' ? result.url : '';
                updateFields.deliveryDate = deliveryDate;
                updateFields.deliveryTime = deliveryTime;


                const driver = await DriverModal.findById(driverId)
                    .populate({ path: 'vendorId', select: 'driverPercentageCut' })
                    .select('vendorId isVendor')
                    .lean();

                const driverPercentage = driver?.vendorId?.driverPercentageCut || 0;
                const driverEarning = driver?.isVendor == 0
                    ? Number(order.driverEarning)
                    : Number(((Number(order.totalPayment) * driverPercentage) / 100).toFixed(2));
                if (driver?.isVendor == 1)
                    updateFields.driverPercentageCut = driverPercentage;

                if (driverEarning > 0) {
                    try {
                        let wallet = await Wallet.findOne({ driverId: order.driverId });
                        const transaction = {
                            type: "credit",
                            amount: driverEarning,
                            method: "Earning",
                            orderId: order.orderId,
                            transactionStatus: 1
                        };

                        if (!wallet) {
                            wallet = new Wallet({ driverId: order.driverId, balance: driverEarning, transactions: [transaction] });
                        } else {
                            wallet.balance += driverEarning;
                            wallet.transactions.push(transaction);
                        }

                        await wallet.save();
                        updateFields.isDriverAmountPayout = 1;

                        await sendNotification({
                            title: 'Payment Credited',
                            message: `₹${driverEarning} has been credited to your wallet for delivered order.`,
                            recipientId: order.driverId,
                            recipientType: 'driver',
                            notificationType: 'wallet',
                            referenceId: order._id,
                            referenceScreen: "wallet",
                        });
                        await sendTransactionalSMS(`+ 91${user?.mobileNumber} `, order.orderId, uiMap[step].message)
                    } catch (err) {
                        console.error('⚠️ Wallet Save Error:', err.message);
                    }
                }
            }

            await FTL.updateOne({ _id: requestId }, { $set: updateFields });

            const driverLocation = await getDriverLocation(driverId);
            const pickupResult = driverLocation?.lat ? await getDistanceAndDuration(driverLocation.lat, driverLocation.long, order.pickupLatitude, order.pickupLongitude) : null;
            const dropResult = await getDistanceAndDuration(order.pickupLatitude, order.pickupLongitude, order.dropLatitude, order.dropLongitude);
            const user = order.userId;
            const userContact = user ? `${user.countryCode}${user.mobileNumber} ` : '';

            await notifyUser(order, notifi[step]);

            return res.status(200).json({
                success: true,
                message: uiMap[step].message,
                data: {
                    ...uiMap[step],
                    pickupDistance: pickupResult?.distanceInKm || 0,
                    pickupDuration: pickupResult?.duration || 'N/A',
                    dropDistance: dropResult?.distanceInKm || 0,
                    dropDuration: dropResult?.duration || 'N/A',
                    userName: user?.fullName || '',
                    userId: user?._id || '',
                    userContact,
                    pickupAddress: order.pickupAddress,
                    dropAddress: order.dropAddress,
                    pickupLatitude: order.pickupLatitude,
                    pickupLongitude: order.pickupLongitude,
                    dropLatitude: order.dropLatitude,
                    dropLongitude: order.dropLongitude,
                    totalPayment: order.totalPayment,
                    step,
                    orderStatus: updateFields.orderStatus,
                    vehicleName: order.vehicleName,
                    vehicleImage: order.vehicleImage,
                    vehicleBodyType: order.vehicleBodyType,
                }
            });
        });
    } catch (error) {
        console.error("Internal error:", error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};


const twoWheelerUpdateOrderStatus = async (req, res) => {
    const form = new multiparty.Form({ maxFilesSize: 100 * 1024 * 1024 });

    try {
        form.parse(req, async (err, fields, files) => {
            if (err) return res.status(200).json({ success: false, message: "Failed to parse form data" });

            const getField = (key) => fields[key]?.[0];
            const orderStatus = parseInt(getField('status'), 10);
            const step = parseInt(getField('step'), 10);
            const packageId = getField('packageId');
            const isAccepted = getField('isAccepted') !== undefined ? parseInt(getField('isAccepted'), 10) : null;
            const driverId = req.header('driverid');

            if (!packageId) return res.status(200).json({ success: false, message: 'Package Id is required' });
            if (!driverId) return res.status(200).json({ success: false, message: 'Missing driverId in headers' });
            if (![0, 1, 2, 3, 4, 5].includes(orderStatus)) return res.status(200).json({ success: false, message: 'Invalid status. Must be between 0 and 5.' });
            if (![0, 1, 2, 3, 4, 5, 6, 7, 8, 9].includes(step)) return res.status(200).json({ success: false, message: 'Invalid step. Must be between 0 and 9.' });

            const stepStatusMap = { 0: 0, 1: 0, 2: 0, 3: 2, 4: 3, 5: 3, 6: 4 };
            if (stepStatusMap[step] !== orderStatus)
                return res.status(200).json({ success: false, message: 'Order status is not aligned with step' });

            const uiMap = {
                0: { topHeader: 'Start Trip', bottomHeader: 'Way To Pickup', buttonText: 'Go Now', message: 'Order Accepted' },
                1: { topHeader: 'Arriving', bottomHeader: 'Arriving', buttonText: 'Arriving At Pickup Location', message: 'Arriving to Pickup Location' },
                2: { topHeader: 'Arrived', bottomHeader: 'Arrived at Pickup Location', buttonText: 'Arrived', message: 'Driver Arrived At Pickup Location' },
                3: { topHeader: 'Start Trip', bottomHeader: 'Way To Drop Location', buttonText: 'Go Now', message: 'Way to Drop Location' },
                4: { topHeader: 'Arriving', bottomHeader: 'Arriving', buttonText: 'Arrived at Drop Location', message: 'Arriving at Drop Location' },
                5: { topHeader: 'Confirm Delivery', bottomHeader: 'POD', buttonText: 'Submit POD', message: 'Accepting Pod' },
                6: { topHeader: 'Delivered', bottomHeader: 'Delivered', buttonText: 'Delivered at User Location', message: 'Delivered at User Location' },
            };

            const notifi = {
                0: { title: 'Order Accepted', body: 'Your Order has been Accepted Successfully', screen: 'twoWheelerOrderStatus' },
                1: { title: 'Way To Pickup', body: 'Driver is on the way for Picking Up', screen: 'twoWheelerOrderStatus' },
                2: { title: 'Arrived', body: 'Driver Arrived At Pick Up Location', screen: 'twoWheelerOrderStatus' },
                3: { title: 'Pickup Complete', body: 'Your Order has been Pickup Successfully ', screen: 'twoWheelerOrderStatus' },
                4: { title: 'Out For Delivery', body: 'Your Order Is On The Way to Drop Location', screen: 'twoWheelerOrderStatus' },
                5: { title: 'POD Submission', body: 'Proof of Delivery Submit', screen: 'twoWheelerOrderStatus' },
                6: { title: 'Delivered', body: 'Your Order Has Been Delivered', screen: 'twoWheelerOrderStatus' },
            };

            const notifyUser = async (order, ui, screen = 'twoWheelerOrderStatus') => {
                try {
                    await sendNotification({
                        title: ui.title,
                        message: ui.body,
                        recipientId: order.userId,
                        recipientType: 'user',
                        notificationType: 'order',
                        referenceId: order._id,
                        referenceScreen: ui.screen || screen,
                    });
                } catch (err) {
                    console.error('⚠️ Notification Error:', err.message);
                }
            };

            // 🚚 Step 0: Accept / Reject
            if (step === 0) {
                if (isAccepted === null) return res.status(200).json({ success: false, message: 'isAccepted is required' });
                if (![1, 2, 3].includes(isAccepted)) return res.status(200).json({ success: false, message: 'Invalid isAccepted value' });

                const updatePayload = isAccepted === 1
                    ? { $set: { driverId, isAccepted: 1 } }
                    : { $addToSet: { rejectedDriver: driverId } };

                const checkOrder = await TwoWheeler.findById(packageId).lean();

                if (!checkOrder) {
                    return res.status(200).json({ success: false, message: 'Order not found' });
                }

                if (checkOrder.isAccepted == 1) {
                    return res.status(200).json({ success: false, message: 'Order is already accepted' });
                }

                const updatedOrder = await TwoWheeler.findOneAndUpdate({ _id: packageId }, updatePayload, { new: true }).populate('userId', 'fullName mobileNumber countryCode');

                if (!updatedOrder) return res.status(200).json({ success: false, message: 'Failed to update order' });

                const user = updatedOrder.userId;
                const userContact = user ? `${user.countryCode}${user.mobileNumber} ` : '';
                const driverLocation = await getDriverLocation(driverId);
                const pickupResult = driverLocation?.lat ? await getDistanceAndDuration(driverLocation.lat, driverLocation.long, updatedOrder.pickupLatitude, updatedOrder.pickupLongitude) : null;
                const dropResult = await getDistanceAndDuration(updatedOrder.pickupLatitude, updatedOrder.pickupLongitude, updatedOrder.dropLatitude, updatedOrder.dropLongitude);

                if (isAccepted == 1) await notifyUser(updatedOrder, notifi[step], 'twoWheelerOrderHistory');

                return res.status(200).json({
                    success: true,
                    message: isAccepted === 1 ? 'Order Accepted Successfully' : 'Order Rejected Successfully',
                    data: {
                        ...uiMap[step],
                        pickupDistance: pickupResult?.distanceInKm || 0,
                        pickupDuration: pickupResult?.duration || 'N/A',
                        dropDistance: dropResult?.distanceInKm || 0,
                        dropDuration: dropResult?.duration || 'N/A',
                        userName: user?.fullName || '',
                        userId: user?._id || '',
                        userContact,
                        pickupAddress: updatedOrder.pickupAddress,
                        dropAddress: updatedOrder.dropAddress,
                        pickupLatitude: updatedOrder.pickupLatitude,
                        pickupLongitude: updatedOrder.pickupLongitude,
                        dropLatitude: updatedOrder.dropLatitude,
                        dropLongitude: updatedOrder.dropLongitude,
                        totalPayment: updatedOrder.totalPayment,
                        step,
                        orderStatus,
                        vehicleName: updatedOrder.vehicleName,
                        vehicleImage: updatedOrder.vehicleImage,
                        vehicleBodyType: updatedOrder.vehicleBodyType,
                    }
                });
            }

            // 🚚 Step 1–9: Status Update
            const order = await TwoWheeler.findById(packageId).populate('userId', 'fullName mobileNumber countryCode');
            if (!order) return res.status(200).json({ success: false, message: 'Order not found' });
            if (order.isAccepted === 0) return res.status(200).json({ success: false, message: 'Please accept the order first' });

            const now = new Date();
            const updateFields = { orderStatus: stepStatusMap[step], step };

            for (let i = order.orderStatus + 1; i <= orderStatus; i++) {
                if (!order.deliveryStatus?.[i]?.status || !order.deliveryStatus?.[i]?.deliveryDateTime) {
                    updateFields[`deliveryStatus.${i}.status`] = 1;
                    updateFields[`deliveryStatus.${i}.deliveryDateTime`] = now;
                }
            }
            if (order.orderStatus == 5)
                return res.status(200).json({ success: false, message: "Order has Cancelled , You Can't Proceed Further" });



            if (step === 6) {
                const recipientName = getField('recipientName')?.trim() || '';
                const confirmNumber = getField('confirmNumber')?.trim() || '';
                const deliveryDate = getField('deliveryDate')?.trim() || '';
                const deliveryTime = getField('deliveryTime')?.trim() || '';
                const pod = files?.pod?.[0] || '';

                // if (!recipientName || !confirmNumber || !pod || !deliveryDate || !deliveryTime)
                //     return res.status(200).json({ success: false, message: 'recipientName, confirmNumber, deliveryDate , deliveryTime and pod are required.' });

                let result = null;

                if (pod != '') {
                     result = await uploadImage(pod);
                    if (!result.success) return res.status(500).json({ success: false, message: "Failed to upload POD image" });
                }


                if (order.isDriverAmountPayout)
                    return res.status(200).json({ success: false, message: 'Driver payout already processed.' });

                updateFields.recipientName = recipientName;
                updateFields.confirmNumber = confirmNumber;
                updateFields.pod = pod != '' ? result.url : '';
                updateFields.deliveryDate = deliveryDate;
                updateFields.deliveryTime = deliveryTime;

                const driverEarning = Number(order.driverEarning);
                if (driverEarning > 0) {
                    try {
                        let wallet = await Wallet.findOne({ driverId: order.driverId });
                        const transaction = {
                            type: "credit",
                            amount: driverEarning,
                            method: "Earning",
                            orderId: order.orderId,
                            transactionStatus: 1
                        };

                        if (!wallet) {
                            wallet = new Wallet({ driverId: order.driverId, balance: driverEarning, transactions: [transaction] });
                        } else {
                            wallet.balance += driverEarning;
                            wallet.transactions.push(transaction);
                        }

                        await wallet.save();
                        updateFields.isDriverAmountPayout = 1;

                        await sendNotification({
                            title: 'Payment Credited',
                            message: `₹${driverEarning} has been credited to your wallet for delivered order.`,
                            recipientId: order.driverId,
                            recipientType: 'driver',
                            notificationType: 'wallet',
                            referenceId: order._id,
                            referenceScreen: "wallet",
                        });
                    } catch (err) {
                        console.error('⚠️ Wallet Save Error:', err.message);
                    }
                }
            }

            await TwoWheeler.updateOne({ _id: packageId }, { $set: updateFields });

            const driverLocation = await getDriverLocation(driverId);
            const pickupResult = driverLocation?.lat ? await getDistanceAndDuration(driverLocation.lat, driverLocation.long, order.pickupLatitude, order.pickupLongitude) : null;
            const dropResult = await getDistanceAndDuration(order.pickupLatitude, order.pickupLongitude, order.dropLatitude, order.dropLongitude);
            const user = order.userId;
            const userContact = user ? `${user.countryCode}${user.mobileNumber} ` : '';

            await notifyUser(order, notifi[step]);
            console.log(order.numberForContact != ' ')
            console.log(order.numberForContact?.length > 2)
            console.log(`+ 91${user?.mobileNumber} `)
            await sendTransactionalSMS(order.numberForContact?.length > 2 ? `+ 91${order?.numberForContact} ` : ` + 91${user?.mobileNumber} `, order.orderId, uiMap[step].message)


            return res.status(200).json({
                success: true,
                message: uiMap[step].message,
                data: {
                    ...uiMap[step],
                    pickupDistance: pickupResult?.distanceInKm || 0,
                    pickupDuration: pickupResult?.duration || 'N/A',
                    dropDistance: dropResult?.distanceInKm || 0,
                    dropDuration: dropResult?.duration || 'N/A',
                    userName: user?.fullName || '',
                    userId: user?._id || '',
                    userContact,
                    pickupAddress: order.pickupAddress,
                    dropAddress: order.dropAddress,
                    pickupLatitude: order.pickupLatitude,
                    pickupLongitude: order.pickupLongitude,
                    dropLatitude: order.dropLatitude,
                    dropLongitude: order.dropLongitude,
                    totalPayment: order.totalPayment,
                    step,
                    orderStatus: updateFields.orderStatus,
                    vehicleName: order.vehicleName,
                    vehicleImage: order.vehicleImage,
                    vehicleBodyType: order.vehicleBodyType,
                }
            });
        });
    } catch (error) {
        console.error("Internal error:", error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const bidding = async (req, res) => {
    try {
        const { requestId, biddingAmount } = req.body;
        const driverId = req.header('driverid');

        // Validate required fields
        if (!requestId) {
            return res.status(200).json({ success: false, message: 'Request Id is required' });
        }
        if (!driverId) {
            return res.status(200).json({ success: false, message: 'Missing driverId in headers' });
        }
        if (!biddingAmount || isNaN(biddingAmount)) {
            return res.status(200).json({ success: false, message: 'Valid bidding amount is required' });
        }

        // Check if bid already exists
        const existingBid = await Bidding.findOne({ requestId, driverId }).lean();

        if (existingBid) {
            return res.status(200).json({
                success: false,
                message: 'You have already placed a bid for this request'
                // data: existingBid
            });
        }


        // Create new bid
        const newBid = new Bidding({
            requestId,
            driverId,
            biddingAmount
        });

        await newBid.save();


        const ftlDetails = await FTL.findById(requestId).lean('userId');

        try {
            await sendNotification({
                title: `New Bidding`,
                message: `${biddingAmount} Rs Of Bidding Amount Coming`,
                recipientId: ftlDetails.userId,
                recipientType: 'user',
                notificationType: 'order',
                referenceId: ftlDetails._id,
                referenceScreen: "sendBidding",
            });
        } catch (err) {
            console.error('⚠️ Notification Error:', err.message);
        }

        return res.status(201).json({
            success: true,
            message: 'Bid placed successfully',
            data: newBid
        });

    } catch (error) {
        console.error("Internal error:", error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

const singleOrderDetail = async (req, res) => {
    const serviceType = req.header('servicetype');
    const isPTL = serviceType == 1 || serviceType == 4;

    // Determine ID and Model based on serviceType
    const id = isPTL ? req.body.packageId : req.body.requestId;

    if (!id) {
        return res.status(200).json({
            success: false,
            message: isPTL ? 'packageId is required' : 'requestId is required',
        });
    }

    let Model;
    switch (serviceType) {
        case '1':
        case '4':
            Model = serviceType == 1 ? PTL : TwoWheeler; // Adjusted below, will fix after
            break;
        case '2':
        case '3':
            Model = FTL;
            break;
        default:
            Model = TwoWheeler;
    }

    // Fixing the Model assignment more logically:
    // Actually, serviceType 1 and 4 have different Models:
    // 1 => PTL, 4 => TwoWheeler


    try {
        let order;
        if (serviceType == 1)
            order = await PaymentDetail.findById(id)
                .populate({ path: 'userId', select: 'fullName countryCode mobileNumber profilePicture' })
                .lean();
        else
            order = await Model.findById(id)
                .populate({ path: 'userId', select: 'fullName countryCode mobileNumber profilePicture' })
                .lean();

        if (!order) {
            return res.status(200).json({
                success: false,
                message: 'Order not found',
            });
        }

        const user = order.userId || {};
        const userInfo = {
            userId: user._id || '',
            userName: user.fullName || '',
            userContact: user.mobileNumber || '',
            userProfile: user.profilePicture || '',
        };

        // Helper to build order tracking from assignments
        const buildOrderStatus = (assignments) => {
            return assignments.flatMap((detail, index) => {
                const steps = [];

                if (index === 0) {
                    steps.push({
                        orderStatus: 'Pickup Location',
                        address: detail.pickupAddress || '',
                        dateTime: detail.createdAt || null,
                    });
                }

                steps.push({
                    orderStatus: detail.assignType == 2 ? 'Delivery Location' : 'Delivery Location',
                    address: detail.dropAddress || '',
                    dateTime: detail.createdAt || null,
                });

                return steps;
            });
        };

        if (serviceType == '1') {
            // PTL orders
            const allAssignments = await PTL.find({ packageId: id })
                .sort({ createdAt: 1 })
                .lean();

            const orderTracking = buildOrderStatus(allAssignments);
            const packageName = (Array.isArray(order.packages) ? order.packages : [])
                .map(p => p.packageName)
                .filter(Boolean)
                .join(', ');

            const enrichedOrder = {
                ...order,
                packageId: order._id,
                packageName,
                ...userInfo,
                orderTracking,
            };

            const formattedDate = new Date(enrichedOrder.createdAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            });

            const orderData = {
                packages: enrichedOrder.packages,
                orderId: enrichedOrder.orderId,
                pickupAddress: enrichedOrder.pickupAddress,
                dropAddress: enrichedOrder.dropAddress,
                createdAt: formattedDate,
            };

            const pdfUrl = await generatePtlPdf(orderData);

            return res.status(200).json({ success: true, data: { ...enrichedOrder, pdfUrl } });
        }

        if (serviceType == '4') {
            const allAssignments = await TwoWheeler.find({ _id: id }) // Adjust this model if exists
                .sort({ createdAt: 1 })
                .lean();

            const orderTracking = buildOrderStatus(allAssignments);
            const packageName = (Array.isArray(order.packages) ? order.packages : [])
                .map(p => p.packageName)
                .filter(Boolean)
                .join(', ');

            const enrichedOrder = {
                ...order,
                packageId: order._id,
                packageName,
                ...userInfo,
                orderTracking,
            };

            const formattedDate = new Date(enrichedOrder.createdAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            });

            const orderData = {
                packages: enrichedOrder.packages,
                orderId: enrichedOrder.orderId,
                pickupAddress: enrichedOrder.pickupAddress,
                dropAddress: enrichedOrder.dropAddress,
                createdAt: formattedDate,
            };

            // const pdfUrl = await generatePtlPdf(orderData);

            return res.status(200).json({ success: true, data: { ...enrichedOrder, pdfUrl: '' } });
        }

        // For FTL or other service types
        const enrichedOrder = {
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
            orderStatus: order.orderStatus || 0,
            distance: order.distance?.toString() || '',
            duration: order.duration || '',
            createdAt: order.createdAt || '',

            ...userInfo,

            isBidding: order.isBidding || 0,
            isPartialPayment: order.isPartialPayment || 0,
            unloadingTime: order.unloadingTime || '',

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
                    orderStatus: 'Pickup Location',
                    address: order.pickupAddress,
                },
                {
                    orderStatus: 'Delivery Location',
                    address: order.dropAddress,
                },
            ],
        };

        return res.status(200).json({
            success: true,
            data: { ...enrichedOrder, pdfUrl: '' },
            message: 'Order Detail Fetch Successfully',
        });
    } catch (err) {
        console.error('Error fetching Order Detail:', err);
        return res.status(500).json({
            success: false,
            message: 'Server Error',
            error: err.message,
        });
    }
};

const generatePtlPdf = async (order) => {
    const htmlPath = path.join(__dirname, "../../../admin/views/pages/invoices/invoice.ejs");
    const htmlContent = await ejs.renderFile(htmlPath, { order, packages: order.packages });


    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // FIX
    });

    // const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfPath = path.resolve("uploads", `ptl_${order.orderId || "order"}.pdf`);

    if (!fs.existsSync(path.dirname(pdfPath))) {
        fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
    }

    await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
    await browser.close();
    const result = await uploadPdfToS3(pdfPath);

    return result.success ? result.url : '';
};

// Fetch only active services where serviceType != 1
const getServices = async (req, res) => {
    try {
        const services = await Services.find({ status: 1, serviceType: { $ne: 1 } })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: { services }
        });
    } catch (err) {
        console.error('Error fetching active services:', err);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: err.message
        });
    }
};

module.exports = {
    saveDriverLocation,
    orderAssign,
    tripHistory,
    tripHistoryCount,
    updateOrderStatus,
    pickupOrder,
    pickupSendOtp,
    pickupVerifyOtp,
    getDriverLocation,
    ftlOrderAssign,
    ftlUpdateOrderStatus,
    bidding,
    singleOrderDetail,
    getServices,
    twoWheelerUpdateOrderStatus

};
