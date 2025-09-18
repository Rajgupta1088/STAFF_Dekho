const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
    title: { type: String, required: true }, // Subscription name/title
    actualPrice: { type: Number, required: true }, // Original price
    estimatePrice: { type: Number, required: true }, // Discounted/estimated price
    planValidity: { type: String, required: true }, // Validity in days/months
    discount: { type: Number, required: true }, // Discount percentage
    status: { type: Number, enum: [1, 2], default: 1 }, // 1 = Active, 2 = Inactive
    subscriptionType: { type: Number, enum: [1, 2], required: true }, // 1-> Candidate 2 -> Institute
    features: [{ type: String, required: true }] // Array of features for the plan
}, {
    timestamps: true // createdAt & updatedAt
});

module.exports = mongoose.model('Subscription', SubscriptionSchema);
