const crypto = require('crypto');
const https = require('https');


const generateOTP = () => {
    return crypto.randomInt(100000, 999999).toString(); // 6-digit OTP
}

const isOTPValid = (otpExpiry) => {
    return otpExpiry && otpExpiry > Date.now();
};


const sendTransactionalSMS = async (mobile, var1, var2) => {
    const flow_id = process.env.FLOW_ID;
    const authkey = process.env.AUTH_KEY;
    console.log(mobile)

    const postData = JSON.stringify({
        flow_id,
        sender: 'ONPNT',
        mobiles: mobile.startsWith('+') ? mobile.replace('+', '') : mobile,
        var1,
        var2
    });

    const options = {
        hostname: 'control.msg91.com',
        path: '/api/v5/flow/',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            authkey
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log('✅ Transactional SMS Response:', data);
                resolve(data);
            });
        });

        req.on('error', (e) => {
            console.error('❌ Request error:', e.message);
            reject(e);
        });

        req.write(postData);
        req.end();
    });
};

// const generateInvoiceNumber = async () => {
//     const now = new Date();
//     const invoiceNo = "INV" +
//         now.getFullYear().toString() +
//         (now.getMonth() + 1).toString().padStart(2, '0') +
//         now.getDate().toString().padStart(2, '0') +
//         now.getHours().toString().padStart(2, '0') +
//         now.getMinutes().toString().padStart(2, '0') +
//         now.getSeconds().toString().padStart(2, '0');

//     console.log(invoiceNo); // Example: INV20250901183545
//     return invoiceNo; // Example: INV20250901183545

// }

const generateInvoiceNumber = () => {
    const now = new Date();
    return `INV${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}${now.getMilliseconds().toString().padStart(3, '0')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
};

// Usage
const invoiceNo = generateInvoiceNumber(); // No await needed




module.exports = { generateOTP, isOTPValid, sendTransactionalSMS, generateInvoiceNumber };
