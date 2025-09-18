const mongoose=require('mongoose');

const CouponSchema = new mongoose.Schema({
    couponTitle : { type: String, required: true },
    couponFor : { type: Number, enum: [1, 2], default: 1 },  // 1-Institute 2-Candidate
    coupanType : { type: Number, enum: [1, 2], default: 1 },  // 1-Value 2-Percentage
    status: { type: Number, enum: [1, 2], default: 1 }, // 1 = Active, 2 = Inactive
    couponValue :  { type: Number, required: true },
    validFrom : {type: Date, required: true},
    validTill : {type: Date, required: true}
},
{
    timestamps: true
});

module.exports = mongoose.model('Coupon', CouponSchema);