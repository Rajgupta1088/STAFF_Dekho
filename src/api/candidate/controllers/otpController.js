const twilio = require('twilio');

const jwt = require('jsonwebtoken');
const { generateOTP } = require('../utils/generateOtp');
const { sendSms } = require('../utils/sendOtp');
const { isValidPhoneNumber, parsePhoneNumber } = require('libphonenumber-js');
const Candidate = require('../modals/candidateProfileModel');


const accountSid = process.env.SMS_ACCOUNT_ID;
const authToken = process.env.SMS_AUTH_TOKEN;
const twilioPhoneNumber = process.env.SMS_TWILIO_PHONE_NO;
const secretKey = process.env.JWT_SECRET;

const client = new twilio(accountSid, authToken);

const otpStorage = {}; // Use Redis for production
const nodemailer = require('nodemailer');

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

const sendOtp = async (req, res) => {
    try {
        const { countryCode, mobileNumber, isEmailLogin, email } = req.body;

        // const otp = generateOTP(); // 6-digit OTP
        const otp = 123456;
        let recipientInfo = "";

        if (isEmailLogin == 1) {
            if (!email) {
                return res.status(200).json({ success: false, message: 'Email is required for email login.' });
            }

            // Store OTP using email as key
            otpStorage[email] = otp;

            // Send OTP via Email
            const transporter = nodemailer.createTransport({
                service: 'Gmail', // or use SMTP config
                auth: {
                    user: 'rajgupta10881088@gmail.com',
                    pass: 'Rajgupta1088@@',
                },
            });

            const mailOptions = {
                from: '"AppDekho" <rajgupta10881088@gmail.com',
                to: 'rajkeshri10881088@gmail.com',
                subject: 'Your OTP for Login',
                text: `Your OTP for login is: ${otp}`,
            };

            await transporter.sendMail(mailOptions);
            console.log(`OTP sent to email: ${email} => ${otp}`);

            recipientInfo = email;
        } else {
            if (!countryCode || !mobileNumber) {
                return res.status(200).json({ success: false, message: 'Country code and mobile number are required.' });
            }

            const parsed = formatMobile(countryCode, mobileNumber);
            if (!parsed || !isValidPhoneNumber(parsed.formatted)) {
                return res.status(200).json({ success: false, message: 'Invalid mobile number format.' });
            }

            otpStorage[parsed.formatted] = otp;
            console.log(`Generated OTP for ${parsed.formatted}: ${otp}`);

            // Uncomment when integrating with actual SMS
            // await sendSms({ otp: otp, mobile: parsed.formatted })

            recipientInfo = parsed.formatted;
        }

        return res.status(200).json({
            success: true,
            message: 'OTP sent successfully to ' + recipientInfo,
            otp: otp // ⚠️ Don't send OTP in production
        });

    } catch (error) {
        console.error('sendOtp Error:', error);
        return res.status(500).json({ success: false, message: 'Unexpected error in sending OTP.' });
    }
};

const verifyOtp = async (req, res) => {
    try {
        const { countryCode, mobileNumber, otp } = req.body;

        if (!countryCode || !mobileNumber || !otp) {
            return res.status(200).json({
                success: false,
                message: "Country code, mobile number and OTP are required.",
                isRegistered: false
            });
        }

        const parsed = formatMobile(countryCode, mobileNumber);

        if (!parsed || !isValidPhoneNumber(parsed.formatted)) {
            return res.status(200).json({ success: false, message: "Invalid mobile number format.", isRegistered: false });
        }

        const storedOTP = otpStorage[parsed.formatted];

        if (!storedOTP) {
            return res.status(200).json({ success: false, message: "OTP expired or not found.", isRegistered: false });
        }

        // OTP validation
        if (!(otp === storedOTP || otp === "123456")) {
            return res.status(200).json({ success: false, message: "Invalid OTP.", isRegistered: false });
        }

        // OTP is valid, delete from storage
        delete otpStorage[parsed.formatted];
        console.log(`OTP verified for ${parsed.formatted}`);

        // Look for candidate in DB
        const candidate = await Candidate.findOne({
            "personalDetails.countryCode": countryCode,
            "personalDetails.mobile": mobileNumber, // ensure schema field matches
            status: { $ne: 3 }
        });

        if (candidate) {
            const token = jwt.sign(
                { candidateId: candidate._id, mobile: candidate.personalDetails.mobile },
                secretKey,
                { expiresIn: "30d" }
            );

            const deviceToken = req.header("devicetoken");
            await Candidate.findByIdAndUpdate(candidate._id, { $set: { deviceToken } }, { new: true });

            return res.status(200).json({
                success: true,
                message: "OTP verified and login successful.",
                token,
                isRegistered: true,
                data: candidate
            });
        } else {
            return res.status(200).json({
                success: true,
                message: "OTP verified but mobile number is not registered.",
                isRegistered: false,
                data: {}
            });
        }
    } catch (error) {
        console.error("verifyOtp Error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unexpected error in OTP verification.",
            msg: error.message,
            isRegistered: false,
        });
    }
};


module.exports = { sendOtp, verifyOtp };
