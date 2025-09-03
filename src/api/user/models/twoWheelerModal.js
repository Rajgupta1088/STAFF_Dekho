const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
    packageName: { type: String, required: true },
    packageType: { type: String, required: true },
    numberOfPackages: { type: Number, required: true },
    totalWeight: { type: Number, required: true },
    length: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true }
}, { _id: false });

const TwoWheelerSchema = new mongoose.Schema({
    pickupPincode: { type: String },
    dropPincode: { type: String },
    pickupAddress: { type: String },
    dropAddress: { type: String },
    pickupLatitude: { type: String },
    pickupLongitude: { type: String },
    dropLatitude: { type: String },
    dropLongitude: { type: String },
    pickupNote: { type: String },
    packages: { type: [packageSchema], required: true },
    isAccepted: { type: Number, enum: [0, 1, 2], default: 0 }, // 0 => Not Accepted , 1 => Accepted , 2 => Rejected 

    driverPercentageCut: { type: String, default: "0.00" },
    driverEarning: { type: String, default: "0.00" },
    isDriverAmountPayout: { type: Number, enum: [0, 1, 2, 3,], default: 0 }, // 0 => Payout Pending , 1 => Payout Success , 2 => Payout Failed , 3 => Payout Hold

    subTotal: { type: String, default: "0.00", required: true },
    shippingCost: { type: String, default: "0.00", required: true },
    specialHandling: { type: String, default: "0.00", required: true },
    gst: { type: String, default: "0.00", required: true },
    totalPayment: { type: String, default: "0.00", required: true },
    gstPercentage: { type: String, default: "0.00", required: true },

    paymentMethod: { type: String },
    paymentGateway: { type: String },
    transportMode: { type: String },
    distance: { type: String },
    duration: { type: String },
    pickupMobile: { type: String },
    orderStatus: { type: Number, enum: [0, 1, 2, 3, 4, 5], default: 0 }, // 0 => InProgress , 1 => Pickup, 2 => In Transit , 3 => Out for Delivery , 4 => Delivered , 5 => Cancelled
    transactionStatus: { type: Number, enum: [0, 1, 2, 3, 4, 5], default: 0 }, // 0 => Initiate, 1 => Complete , 2 => Pending , 3 => Failed , 4 => Refunded , 5 => Partial Payment
    isWalletPay: { type: Number, enum: [0, 1], default: 0 }, // 0 => Online Payment, 1 => Wallet Pay

    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    preTransactionId: { type: String },
    postTransactionId: { type: String },
    invoiceNo: { type: String },
    invoiceUrl: { type: String },
    orderId: { type: String },
    paymentId: { type: String },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DriverProfile',
        default: null
    },
    paymentResponse: { type: mongoose.Schema.Types.Mixed },
    transactionDate: { type: Date },
    isVendor: {
        type: Number, enum: [0, 1], // 0 = Admin, 1 = Vendor 
        default: 0
    },
    isRated: {
        type: Number, enum: [0, 1], // 0 = Not Rated, 1 = Rated 
        default: 0
    },
    serviceType: { type: Number, enum: [0, 1, 2, 3, 4], default: 0 }, // 1 => PTL , 2 => FTL Intercity , 3 => FTL Outstation , 4 => Refunded , 5 => Partial Payment
    rejectedDriver: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Driver' }],

    step: { type: Number, enum: [0, 1, 2, 3, 4, 5, 6, 7], default: 0 },
    recipientName: { type: String },
    confirmNumber: { type: String },
    pod: { type: String },
    deliveryDate: { type: String },
    deliveryTime: { type: String },
    numberForContact: { type: String, default: "0" },
    vendorId: {
        type: String,
        default: ''
    },
}, { timestamps: true });

module.exports = mongoose.model('twoWheeler', TwoWheelerSchema);
