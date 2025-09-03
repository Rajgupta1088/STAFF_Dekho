const mongoose = require("mongoose");

const PermissionSchema = new mongoose.Schema({
    module: { type: String, required: true },
    add: { type: Boolean, default: false },
    edit: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
    export: { type: Boolean, default: false },
    url: { type: String, default: "" }
}, { _id: false });

const VendorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    business_name: { type: String, required: true },
    business_category: { type: String, required: true },
    address: { type: String, required: true },
    admin_type: { type: String, default: 'Sub Vendor' },
    permissions: [PermissionSchema],

    isVendor: {
        type: Number, enum: [0, 1], // 0 = Admin, 1 = Vendor 
        default: 0
    },
    vendorId: {
        type: String,
        default: ''
    },
    driverPercentageCut: { type: Number, default: 0 },
    status: {
        type: Number,
        enum: [1, 2], // 1: Pickup, 2: Out for Delivery, 3: In Progress, 4: Delivered, 5: Cancelled
        required: true
    }
},
    {
        timestamps: true

    });

module.exports = mongoose.model("Vendor", VendorSchema);