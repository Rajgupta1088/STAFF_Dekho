const axios = require('axios');
const DriverBankDetail = require('../modals/bankDetailModal');
const Driver = require('../modals/driverModal');
const Wallet = require('../../user/models/walletModal');

// RazorpayX setup
const razorpayX = axios.create({
    baseURL: 'https://api.razorpay.com/v1/',
    auth: {
        username: process.env.PAY_KEY_ID,
        password: process.env.PAY_SECRET_KEY
    }
});

// Step 1: Create Contact
const createDriverContact = async (driver) => {
    const res = await razorpayX.post('/contacts', {
        name: driver.name,
        email: driver.email,
        contact: driver.mobile,
        type: 'employee',
        reference_id: `driver_${driver._id}`,
    });
    return res.data.id;
};

// Step 2: Create Fund Account
const createDriverFundAccount = async (contactId, driver) => {
    const res = await razorpayX.post('/fund_accounts', {
        contact_id: contactId,
        account_type: 'bank_account',
        bank_account: {
            name: driver.accountHolderName,
            ifsc: driver.ifscCode,
            account_number: driver.accountNumber
        }
    });
    return res.data.id;
};

// Step 3: Create Payout
const createPayoutToDriver = async (fundAccountId, amount, virtualAccountNumber) => {
    const res = await razorpayX.post('/payouts', {
        account_number: virtualAccountNumber,
        fund_account_id: fundAccountId,
        amount: Math.round(amount * 100), // convert to paise
        currency: 'INR',
        mode: 'IMPS', // Consider UPI or NEFT fallback
        purpose: 'salary',
        queue_if_low_balance: true,
        narration: 'Driver Payout'
    });
    return res.data;
};

// Main API Function
const walletTranfer = async (req, res) => {
    const driverId = req.header('driverid');
    const { amount } = req.body;

    // ✅ Validate amount
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
        return res.status(400).json({ success: false, message: 'Amount must be a valid positive number' });
    }

    const bankDetail = await Wallet.findOne({ driverId }).lean();


    const virtualAccountNumber = process.env.PAY_ACCOUNT_NO;
    if (!virtualAccountNumber) {
        return res.status(500).json({ success: false, message: 'Virtual account number is not configured.' });
    }

    try {
        const wallet = await Wallet.findOne({ driverId });
        const bankDetail = await DriverBankDetail.findOne({ driverId }).lean();
        const driver = await Driver.findById(driverId).lean();

        if (!wallet) {
            return res.status(200).json({ success: false, message: 'Driver wallet not found.' });
        }

        if (!bankDetail || !driver?.personalInfo) {
            return res.status(200).json({ success: false, message: 'Driver or bank details not found.' });
        }

        // ✅ Check balance
        if (wallet.balance < Number(amount)) {
            return res.status(200).json({ success: false, message: 'Insufficient wallet balance' });
        }


        const driverData = {
            _id: driver._id,
            name: driver.personalInfo.fullName || 'Driver',
            email: driver.personalInfo.email || 'noemail@example.com',
            mobile: driver.personalInfo.mobile || '0000000000',
            accountHolderName: bankDetail.accountHolderName,
            ifscCode: bankDetail.ifscCode,
            accountNumber: bankDetail.accountNumber
        };

        const contactId = await createDriverContact(driverData);
        const fundAccountId = await createDriverFundAccount(contactId, driverData);
        const payout = await createPayoutToDriver(fundAccountId, amount, virtualAccountNumber);

        return res.status(200).json({ success: true, message: 'Payout successful', payout });

    } catch (error) {
        const errorData = error?.response?.data;
        console.error('❌ RazorpayX Error:', JSON.stringify(errorData, null, 2));

        // Handle RazorpayX "This transaction is prohibited" error
        if (errorData?.error?.description === 'This transaction is prohibited. Contact Support for help.') {
            return res.status(403).json({
                success: false,
                message: 'Transaction is blocked by Razorpay. Please contact Razorpay support to activate bank transfers.'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Payout failed',
            error: errorData || error.message
        });
    }
};

module.exports = { walletTranfer };
