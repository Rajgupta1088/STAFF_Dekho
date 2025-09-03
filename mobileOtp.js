const axios = require('axios');
const https = require('https');

function sendOtp({ mobile, otp }) {
    const template_id = '6808ca80d6fc054bef421352'; // Replace with your actual OTP template ID
    const authkey = '444881AGhSNFD7zMI6822f745P1';

    const formattedMobile = mobile.startsWith('+') ? mobile.replace('+', '') : mobile;

    const url = `https://control.msg91.com/api/v5/otp?otp=${otp}&otp_expiry=5&template_id=${template_id}&mobile=${formattedMobile}&authkey=${authkey}&realTimeResponse=1`;

    return axios.post(url, {}, {
        headers: { 'Content-Type': 'application/json' }
    })
        .then(response => {
            console.log('✅ OTP sent:', response.data);
            return response.data;
        })
        .catch(error => {
            console.error('❌ OTP sending failed:', error.response ? error.response.data : error.message);
            return false;
        });
}


function sendTransactionalSMS({ mobile, var1, var2 }) {
    const flow_id = '6888a3cbd6fc053d3021b492'; // Replace with your approved Flow ID
    const authkey = '444881AGhSNFD7zMI6822f745P1';

    const postData = JSON.stringify({
        flow_id: flow_id,
        sender: 'ONPNT',  // Your approved sender ID
        mobiles: mobile.startsWith('+') ? mobile.replace('+', '') : mobile,
        var1: var1,
        var2: var2
    });

    const options = {
        hostname: 'control.msg91.com',
        path: '/api/v5/flow/',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            authkey: authkey
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log('✅ Transactional SMS Response:', data);
        });
    });

    req.on('error', (e) => {
        console.error('❌ Request error:', e.message);
    });

    req.write(postData);
    req.end();
}

// Send OTP
sendOtp({
    mobile: '+919354978804',
    otp: '123456'
});

// Send Transactional SMS
sendTransactionalSMS({
    mobile: '+919354978804',
    var1: ' OPL000508 ',
    var2: ' Out For Delivery '
});
