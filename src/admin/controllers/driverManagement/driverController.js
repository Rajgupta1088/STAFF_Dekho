// ✅ CREATE DRIVER (POST)

const Driver = require('../../../api/driver/modals/driverModal');
const DriverBankDetail = require('../../../api/driver/modals/bankDetailModal');
const Services = require('../../models/vehcileManagement/serviceManagementModel');

const FTL = require('../../../api/user/models/ftlPaymentModal');
const { uploadImage } = require("../../utils/uploadHelper"); // Import helper for file upload
const multiparty = require('multiparty');
const { generateLogs } = require('../../utils/logsHelper');
const razorpay = require('../../../api/user/utils/razorpay');
const mongoose = require('mongoose');
const Truck = require('../../models/vehcileManagement/truckManagementModel');



const uploadDocument = async (files, docField) => {
    if (files?.[docField]?.length > 0) {
        const file = files[docField][0];
        const tempFile = {
            path: file.path,
            originalFilename: file.originalFilename,
            mimetype: file.headers?.['content-type'] || 'application/octet-stream',
            size: file.size,
        };

        const result = await uploadImage(tempFile);
        if (result.success) {
            // Clean up the temporary file after successful upload
            // await fs.unlink(file.path);
            return result.url;
        } else {
            console.error(`Failed to upload ${docField}:`, result.message);
            return ''; // Or perhaps throw an error for better handling in the caller
        }
    }
    return '';
};


const saveDrivers = async (req, res) => {
    const admin = req.session.admin || {};
    const isVendor = admin?.isVendor == 1 ? 1 : 0;
    const adminId = admin.id || null;

    try {
        const form = new multiparty.Form();

        form.parse(req, async (err, fields, files) => {
            if (err) {
                console.error("Error parsing form data:", err);
                return res.status(500).json({ error: "Failed to parse form data" });
            }

            const name = fields.name?.[0] || '';
            const email = fields.email?.[0] || '';
            const dateOfBirth = fields.dateOfBirth?.[0] || '';
            const gender = fields.gender?.[0] || '';
            const mobileNumber = fields.mobileNo?.[0] || '';
            const alternateMobileNo = fields.alternateMobileNo?.[0] || '';
            const serviceType = fields.serviceType?.[0] || '';
            const countryCode = fields.countryCode?.[0] || '';
            // console.log(name)
            // console.log(email)
            // console.log(mobileNumber)
            if (!name || !email || !mobileNumber) {
                return res.status(400).json({ error: "Name, Email, and Mobile No. are required" });
            }


            const file = files.profileImage ? files.profileImage[0] : null;
            console.log('File -> ', file)

            let imageUrl = null;
            if (file.originalFilename) {
                const result = await uploadImage(file);
                if (result.success) {
                    imageUrl = result.url;
                } else {
                    console.error("Error uploading image:", result.error || result.message);
                    return res.status(500).json({ error: "Failed to upload banner image" });
                }
            } else {
                imageUrl = '';
            }
            const existingEmailDriver = await Driver.findOne({ 'personalInfo.email': email });
            if (existingEmailDriver) {
                return res.status(200).json({
                    success: false,
                    message: 'Email is already registered.',
                    data: existingEmailDriver
                });
            }

            // Check if mobile already exists
            const existingMobileDriver = await Driver.findOne({ 'personalInfo.mobile': mobileNumber });
            if (existingMobileDriver) {
                return res.status(200).json({
                    success: false,
                    message: 'Mobile number is already registered.',
                    data: existingMobileDriver
                });
            }


            const serviceDetail = await Services.findById(serviceType).select('serviceType').lean();

            const driver = new Driver({
                personalInfo: {
                    name,
                    email,
                    dob: dateOfBirth,
                    gender,
                    countryCode,
                    mobile: mobileNumber,
                    altMobile: alternateMobileNo,
                    profilePicture: imageUrl,

                },
                isVendor,
                vendorId: isVendor ? adminId : null,
                serviceId: serviceType,
                serviceType: serviceDetail?.serviceType || 0, // Optional chaining to handle null case
            });


            await driver.save();
            await generateLogs(req, 'Add', driver);

            res.status(201).json({ success: true, message: 'Driver added successfully' });
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
}


const driverList = async (req, res) => {
    const admin = req.session.admin || {};
    const isVendor = admin?.isVendor == 1 ? 1 : 0;
    const adminId = admin.id || null;
    const adminType = admin.admin_type;

    try {
        // 1. Extract DataTables parameters
        const { draw, start = 0, length = 10, search, order, columns } = req.body;
        const searchValue = search?.value || '';

        // 2. Build the filter object for searching
        const filter = {};
        if (searchValue) {
            filter.$or = [
                { name: { $regex: searchValue, $options: 'i' } },
                { email: { $regex: searchValue, $options: 'i' } },
                { mobileNo: { $regex: searchValue, $options: 'i' } },
                { alternateMobileNo: { $regex: searchValue, $options: 'i' } },
            ];
        }

        // Vendor specific filtering
        if (isVendor == 1) {
            filter.isVendor = 1;
            filter.vendorId = adminId;
        }

        // 3. Determine sorting
        const sort = { createdAt: -1 }; // default
        if (order?.[0]?.column !== undefined && order?.[0]?.dir) {
            const orderColumnIndex = order[0].column;
            const orderDirection = order[0].dir;
            const columnName = columns[orderColumnIndex]?.data;
            if (columnName) {
                // Optional: Add dynamic sorting if needed
                // sort[columnName] = orderDirection === 'asc' ? 1 : -1;
                sort.createdAt = -1;
            }
        }

        // 4. Fetch total and filtered records
        const totalRecords = await Driver.countDocuments(filter);
        const filteredRecords = await Driver.countDocuments(filter);

        // 5. Fetch raw drivers first (without populate)
        const driversRaw = await Driver.find(filter)
            .sort(sort)
            .skip(parseInt(start))
            .limit(parseInt(length))
            .lean();

        // 6. Filter out invalid ObjectIds before populating
        const validDrivers = driversRaw.filter(d =>
            d.vehicleDetail?.vehicleId &&
            mongoose.Types.ObjectId.isValid(d.vehicleDetail.vehicleId)
        );

        // 7. Populate only valid drivers
        const populatedDrivers = await Driver.populate(validDrivers, {
            path: 'vehicleDetail.vehicleId',
            select: 'name vehicleImage'
        });

        // 8. Merge populated data back with unpopulated drivers
        const drivers = driversRaw.map(d => {
            const populated = populatedDrivers.find(p => p._id.toString() === d._id.toString());
            return populated || d;
        });

        // 9. Respond with DataTables format
        res.json({
            draw: parseInt(draw),
            recordsTotal: totalRecords,
            recordsFiltered: filteredRecords,
            data: drivers
        });

    } catch (err) {
        console.error("Error fetching driver list:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

const driverPage = (req, res) => {
    res.render('pages/driverManagement/driver');
};


const driverEarningPage = (req, res) => {
    res.render('pages/driverManagement/driverEarning');
};
// ✅ GET A SINGLE DRIVER (READ)
const singleDriver = async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id);
        if (!driver) {
            return res.status(404).json({ success: false, message: 'Driver not found' });
        }
        res.json({ success: true, driver });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

const updateDriver = async (req, res) => {

    try {
        const form = new multiparty.Form();

        form.parse(req, async (err, fields, files) => {
            if (err) {
                console.error("Error parsing form data:", err);
                return res.status(500).json({ success: false, message: "Form data parsing failed" });
            }

            const handleFileUpload = async (file) => {
                console.log('kk', file)
                if (file && file.path) {
                    const result = await uploadImage(file);
                    return result.success ? result.url : false;
                }
                return null;
            };

            // Upload files
            const profileImageUrl = await handleFileUpload(files?.profileImage?.[0]);
            const aadhaarFrontUrl = await handleFileUpload(files?.aadhaarFront?.[0]);
            const aadhaarBackUrl = await handleFileUpload(files?.aadhaarBack?.[0]);
            const panCardUrl = await handleFileUpload(files?.panCard?.[0]);
            const drivingLicenseUrl = await handleFileUpload(files?.drivingLicense?.[0]);
            const vehicleRCUrl = await handleFileUpload(files?.vehicleRC?.[0]);
            const vehicleInsuranceUrl = await handleFileUpload(files?.vehicleInsurance?.[0]);
            const bankPassbookUrl = await handleFileUpload(files?.bankPassbook?.[0]);
            const registrationCertificateUrl = await handleFileUpload(files?.registrationCertificate?.[0]);
            const pollutionCertificateUrl = await handleFileUpload(files?.pollutionCertificate?.[0]);
            const insuranceCertificateUrl = await handleFileUpload(files?.insuranceCertificate?.[0]);
            console.log(profileImageUrl, aadhaarFrontUrl, aadhaarBackUrl, panCardUrl, drivingLicenseUrl);


            // Find driver
            const existingDriver = await Driver.findById(req.params.id);
            if (!existingDriver) {
                return res.status(404).json({ success: false, message: "Driver not found" });
            }

            const serviceDetail = await Services.findById(fields.serviceType?.[0]).select('serviceType').lean();

            // Personal Info
            const personal = existingDriver.personalInfo || {};
            personal.name = fields.name?.[0] || personal.name;
            personal.email = fields.email?.[0] || personal.email;
            personal.dob = fields.dateOfBirth?.[0] || personal.dob;
            personal.gender = fields.gender?.[0] || personal.gender;
            personal.mobile = fields.mobileNo?.[0] || personal.mobile;
            personal.altMobile = fields.alternateMobileNo?.[0] || personal.altMobile;
            existingDriver.serviceId = fields.serviceType?.[0] || personal.serviceId;
            existingDriver.serviceType = serviceDetail?.serviceType || personal.serviceType;
            if (profileImageUrl) personal.profilePicture = profileImageUrl;
            existingDriver.personalInfo = personal;

            // Address Info
            existingDriver.addressInfo = existingDriver.addressInfo || {};
            existingDriver.addressInfo.permanent = existingDriver.addressInfo.permanent || {};
            existingDriver.addressInfo.current = existingDriver.addressInfo.current || {};

            const p = existingDriver.addressInfo.permanent;
            p.street = fields.permanentHouseNo?.[0] || p.street;
            p.city = fields.permanentCity?.[0] || p.city;
            p.state = fields.permanentState?.[0] || p.state;
            p.pin = fields.permanentPinCode?.[0] || p.pin;

            const c = existingDriver.addressInfo.current;
            c.street = fields.currentHouseNo?.[0] || c.street;
            c.city = fields.currentCity?.[0] || c.city;
            c.state = fields.currentState?.[0] || c.state;
            c.pin = fields.currentPinCode?.[0] || c.pin;




            // Documents
            const docs = existingDriver.documents || {};
            if (aadhaarFrontUrl) docs.aadhaarFront = aadhaarFrontUrl;
            if (aadhaarBackUrl) docs.aadhaarBack = aadhaarBackUrl;
            if (panCardUrl) docs.panCard = panCardUrl;
            if (drivingLicenseUrl) docs.drivingLicense = drivingLicenseUrl;
            if (vehicleRCUrl) docs.vehicleRC = vehicleRCUrl;
            if (vehicleInsuranceUrl) docs.insuranceCopy = vehicleInsuranceUrl;
            if (bankPassbookUrl) docs.bankPassbook = bankPassbookUrl;
            existingDriver.documents = docs;

            const vehcile = existingDriver.vehicleDetail || {};

            vehcile.vehicleName = fields.vehicleName?.[0] || vehcile.vehicleName;
            vehcile.vehicleModel = fields.vehicleModel?.[0] || vehcile.vehicleModel;
            vehcile.yearOfManufacture = fields.yearOfManufacture?.[0] || vehcile.yearOfManufacture;
            vehcile.plateNumber = fields.plateNumber?.[0] || vehcile.plateNumber;
            vehcile.vin = fields.vin?.[0] || vehcile.vin;
            vehcile.capacity = fields.capacity?.[0] || vehcile.capacity;
            vehcile.fuelType = fields.fuelType?.[0] || vehcile.fuelType;
            vehcile.odometerReading = fields.odometerReading?.[0] || vehcile.odometerReading;
            vehcile.serviceType = fields.serviceType?.[0] || vehcile.serviceType;
            vehcile.vehicleId = fields.vehicleId?.[0] || vehcile.vehicleId;

            existingDriver.vehicleDetail = vehcile;

            const vechileDocs = existingDriver.vehicleDocuments || {};
            if (insuranceCertificateUrl) vechileDocs.insuranceCertificate = insuranceCertificateUrl;
            if (pollutionCertificateUrl) vechileDocs.pollutionCertificate = pollutionCertificateUrl;
            if (registrationCertificateUrl) vechileDocs.registrationCertificate = registrationCertificateUrl;
            existingDriver.vehicleDocuments = vechileDocs;


            // Save changes
            await existingDriver.save();

            return res.json({
                success: true,
                message: "Driver updated successfully",
                driver: existingDriver
            });
        });
    } catch (err) {
        console.error("Update error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ✅ DELETE DRIVER (DELETE)
const deleteDriver = async (req, res) => {
    try {
        const deletedDriver = await Driver.findByIdAndDelete(req.params.id);
        if (!deletedDriver) {
            return res.status(404).json({ success: false, message: 'Driver not found' });
        }
        res.json({ success: true, message: 'Driver deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

// POST /driver/updateApproval
const updateApproval = async (req, res) => {
    const { driverId, approved } = req.body;
    // console.log(req.session);
    // Assuming admin info is stored in req.admin from middleware or session
    const adminId = req.session.admin?.id || null;
    const adminName = req.session.admin?.name || 'Unknown';

    try {
        await Driver.updateOne(
            { _id: driverId },
            {
                $set: {
                    approvalStatus: approved,
                    approvedBy: {
                        adminId: adminId,
                        adminName: adminName,
                        approvedAt: new Date()
                    }
                }
            }
        );

        res.json({ success: true, message: 'Approval status updated successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error updating status.' });
    }
};

const driverEarningList = async (req, res) => {
    try {
        const { draw = 1, start = 0, length = 10, search = {}, order = [], columns = [], driverId } = req.body;

        if (!driverId) {
            return res.status(400).json({ error: "Driver ID missing" });
        }

        const filter = { driverId, transactionStatus: 1 };

        const totalRecords = await FTL.countDocuments(filter);
        const data = await FTL.find(filter)
            .populate({ path: 'driverId', select: 'personalInfo approvalStatus status' })
            .skip(parseInt(start))
            .limit(parseInt(length));

        return res.json({
            draw: parseInt(draw),
            recordsTotal: totalRecords,
            recordsFiltered: totalRecords,
            data: data
        });
    } catch (err) {
        console.error("DataTable error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

const fetchBankDetail = async (req, res) => {
    const { id: driverId } = req.params;
    // console.log('dddd', driverId)

    if (!driverId) {
        return res.status(200).json({
            success: false,
            message: 'Driver ID is required',
        });
    }

    try {
        const bankDetail = await DriverBankDetail.findOne({ driverId }).lean();
        // console.log('driverdetail', bankDetail)

        if (!bankDetail) {
            return res.status(200).json({
                success: false,
                message: 'Bank detail not found',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Bank detail fetched successfully',
            data: bankDetail,
        });

    } catch (error) {
        console.error('Error fetching bank detail:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};
const axios = require('axios');

const transferMoneyToBankAccount = async (req, res) => {
    const { id: driverId } = req.params;
    // console.log('uytr', driverId)

    if (!driverId) {
        return res.status(400).json({
            success: false,
            message: 'Driver ID is required',
        });
    }

    try {
        const bankDetail = await DriverBankDetail.findOne({ driverId }).lean();

        if (!bankDetail) {
            return res.status(404).json({
                success: false,
                message: 'Bank detail not found',
            });
        }

        // Your RazorpayX Test Credentials
        const key_id = process.env.PAY_KEY_ID;
        const key_secret = process.env.PAY_SECRET_KEY;
        const base64Auth = Buffer.from(`${key_id}:${key_secret}`).toString('base64');

        const payoutResponse = await axios.post(
            'https://api.razorpay.com/v1/payouts',
            {
                account_number: process.env.PAY_ACCOUNT_NO, // RazorpayX virtual account number
                fund_account: {
                    account_type: 'bank_account',
                    bank_account: {
                        name: bankDetail.accountHolderName,
                        ifsc: bankDetail.ifscCode,
                        account_number: bankDetail.accountNumber,
                    },
                },
                amount: 100, // amount in paise (₹1.00)
                currency: 'INR',
                mode: 'IMPS',
                purpose: 'payout',
                queue_if_low_balance: true,
                reference_id: `driver_payout_${driverId}`,
                narration: 'Driver payout from admin',
            },
            {
                headers: {
                    Authorization: `Basic ${base64Auth}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        return res.status(200).json({
            success: true,
            message: 'Money transferred successfully',
            data: payoutResponse.data,
        });

    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
        return res.status(500).json({
            success: false,
            message: 'Something went wrong',
            error: error.response?.data || error.message,
        });
    }
};


const getTruckData = async (req, res) => {

    const serviceId = req.header('serviceid');

    if (!serviceId)
        res.status(200).json({
            success: false,
            data: [],
            message: 'Please Provice Valid Service Id'
        });

    try {
        const truckDetail = await Truck.find({ serviceType: serviceId }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: truckDetail,
            message: truckDetail.length > 0 ? "Vehicle Detail Fetch Successfully" : "No Vechicle Found In this Service"
        });
    } catch (err) {
        console.error('Error fetching Truck data:', err);
        res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
};


module.exports = { saveDrivers, updateDriver, deleteDriver, driverList, getTruckData, driverEarningPage, driverPage, singleDriver, updateApproval, driverEarningList, fetchBankDetail, transferMoneyToBankAccount }