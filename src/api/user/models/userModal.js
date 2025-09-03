const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true
    }
    ,
    emailAddress: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,

    }
    ,
    countryCode: {
        type: String,
        required: true,
        trim: true,
        match: [/^\+\d{1,3}$/, 'Please enter a valid country code (e.g., +91)']
    },
    mobileNumber: {
        type: String,
        required: true,
        trim: true,
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
        default: 'Prefer not to say'
    },
    companyName: {
        type: String,
        trim: true,
        default: ''
    },
    gstNumber: {
        type: String,
        trim: true,
        default: ''
    },
    status: { type: Number, enum: [1, 2, 3], default: 1 } // 1 = Active, 2 = Inactive , 3 => Delete
    ,
    profilePicture: {
        type: String,
        default: ''
    },
    deviceType: {
        type: Number, enum: [1, 2, 3] // 1 = Android, 2 = Ios , 3 => Website
    },
    isVendor: {
        type: Number, enum: [0, 1], // 0 = Admin, 1 = Vendor 
        default: 0
    },
    isSkipPayment: {
        type: Number, enum: [0, 1], // 0 = Paid User, 1 = Free User 
        default: 0
    },
    vendorId: {
        type: String,
        default: ''
    },
    deviceToken: {
        type: String,
        default: ''
    }, deviceId: {
        type: String,
        default: ''
    }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User;