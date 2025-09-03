const User = require('../../../api/user/models/userModal');
const { uploadImage } = require("../../utils/uploadHelper"); // Import helper for file upload
const multiparty = require('multiparty');
const moment = require('moment'); // For date manipulation
const { generateLogs } = require('../../utils/logsHelper');


const userList = async (req, res) => {
    const isVendor = req.session.admin?.isVendor == 1 ? 1 : 0;
    const adminType = req.session.admin?.admin_type;
    const adminid = req.session.admin?.id;

    try {
        const {
            start = 0,
            length = 10,
            draw,
            search,
            columns = [],
            order = [],
            fullName,
            emailAddress,
            mobileNumber,
            status,
            deviceType,
            createdAt
        } = req.body;

        const query = {
            status: { $ne: 3 } // soft delete exclusion
        };

        // Vendor filter
        if (isVendor == 1) {
            query.isVendor = 1;
            query.vendorId = adminid;


        }



        // Regex safe search
        const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

        if (fullName) query.fullName = new RegExp(escapeRegex(fullName), 'i');
        if (emailAddress) query.emailAddress = new RegExp(escapeRegex(emailAddress), 'i');
        if (mobileNumber) query.mobileNumber = new RegExp(escapeRegex(mobileNumber), 'i');
        if (status) query.status = parseInt(status);
        if (deviceType) query.deviceType = parseInt(deviceType);

        if (createdAt) {
            const startDate = moment(createdAt).startOf('day').toDate();
            const endDate = moment(createdAt).endOf('day').toDate();
            query.createdAt = { $gte: startDate, $lte: endDate };
        }

        // Sorting logic
        const sort = {};
        if (order.length > 0) {
            const sortField = columns?.[order[0].column]?.data;
            const sortDirection = order[0].dir === 'asc' ? 1 : -1;
            if (sortField) {
                sort[sortField] = sortDirection;
            }
        }
        if (Object.keys(sort).length === 0) {
            sort.createdAt = -1; // default fallback sort
        }

        // Fetch data
        const [users, totalRecords, filteredRecords] = await Promise.all([
            User.find(query)
                .skip(Number(start))
                .limit(Number(length))
                .sort(sort)
                .lean(),
            User.countDocuments(query),
            User.countDocuments(query)
        ]);

        res.json({
            draw,
            recordsTotal: totalRecords,
            recordsFiltered: filteredRecords,
            data: users,
        });

    } catch (error) {
        console.error("Error in userList:", error);
        res.status(500).json({ error: error.message });
    }
};

const userPage = (req, res) => {
    res.render('pages/usersManagement/users');
}

const saveUserData = async (req, res) => {
    const admin = req.session.admin || {};
    const isVendor = admin?.isVendor == 1 ? 1 : 0;
    const adminId = admin.id || null;

    const form = new multiparty.Form();

    form.parse(req, async (err, fields, files) => {
        if (err) {
            console.error("Error parsing form data:", err);
            return res.status(500).json({ error: "Failed to parse form data" });
        }

        const getField = (key) => fields[key]?.[0]?.trim() || '';

        const fullName = getField('fullName');
        const emailAddress = getField('emailAddress');
        const countryCode = getField('country');
        const mobileNumber = getField('mobileNumber');
        const gender = getField('gender');
        const companyName = getField('companyName');
        const gstNumber = getField('gstNumber');
        const status = getField('status');
        const deviceType = getField('deviceType');
        const isSkipPayment = getField('isSkipPayment');

        // Required field check
        if (!fullName || !emailAddress || !countryCode || !mobileNumber || !gender || !status || !deviceType) {
            return res.status(400).json({
                error: "fullName, emailAddress, countryCode, mobileNumber, gender, status & deviceType are required"
            });
        }

        try {
            const existingUser = await User.findOne({
                emailAddress,
                mobileNumber,
                status: { $ne: 3 }
            });

            if (existingUser) {
                return res.status(400).json({
                    error: "User already exists with the same email and mobile number"
                });
            }

            const file = files.profilePicture?.[0] || null;
            let imageUrl = '';

            if (file) {
                const result = await uploadImage(file);
                imageUrl = result.success
                    ? result.url
                    : `http://localhost:${process.env.PORT || 3000}${result.path}`;
            }

            const newUser = new User({
                fullName,
                emailAddress,
                countryCode,
                mobileNumber,
                gender,
                companyName,
                gstNumber,
                status,
                deviceType,
                isSkipPayment: isSkipPayment ? isSkipPayment : 0,
                isVendor,
                vendorId: isVendor ? adminId : null,
                profilePicture: imageUrl
            });

            await newUser.save();
            await generateLogs(req, 'Add', newUser);

            res.json({ success: true, message: 'User saved successfully' });
        } catch (err) {
            console.error("Error saving user:", err);
            res.status(500).json({ error: err.message || "Internal server error" });
        }
    });
};

const updateUser = async (req, res) => {
    const admin = req.session.admin || {};
    const isVendor = admin?.isVendor == 1 ? 1 : 0;
    const adminId = admin.id || null;

    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).send('User ID is required');
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).send('User not found');
        }

        const form = new multiparty.Form();

        form.parse(req, async (err, fields, files) => {
            if (err) {
                console.error("Error parsing form data:", err);
                return res.status(500).json({ error: "Failed to parse form data" });
            }

            const fullName = fields.fullName ? fields.fullName[0] : '';
            const emailAddress = fields.emailAddress ? fields.emailAddress[0] : '';
            const countryCode = fields.country ? fields.country[0] : '';
            const mobileNumber = fields.mobileNumber ? fields.mobileNumber[0] : '';
            const gender = fields.gender ? fields.gender[0] : '';
            const companyName = fields.companyName ? fields.companyName[0] : '';
            const gstNumber = fields.gstNumber ? fields.gstNumber[0] : '';
            const status = fields.status ? fields.status[0] : '';
            const deviceType = fields.deviceType ? fields.deviceType[0] : '';
            const isSkipPayment = fields.isSkipPayment ? fields.isSkipPayment[0] : 0;


            if (!fullName || !emailAddress || !countryCode || !mobileNumber || !gender || !status || !deviceType) {
                return res.status(400).json({ error: "fullName, emailAddress, countryCode, mobileNumber, gender, status & deviceType are required" });
            }

            let imageUrl = user.profilePicture; // default: keep old image

            const file = files.profilePicture ? files.profilePicture[0] : null;

            if (file.originalFilename) {
                const result = await uploadImage(file);
                imageUrl = result.success ? result.url : imageUrl;
            }

            const updatedData = {
                fullName,
                emailAddress,
                countryCode,
                mobileNumber,
                gender,
                companyName,
                gstNumber,
                status,
                deviceType,
                profilePicture: imageUrl,
                isVendor,
                isSkipPayment,
                vendorId: isVendor ? adminId : null,
            };

            await User.findByIdAndUpdate(id, updatedData, { new: true });
            await generateLogs(req, 'Edit', updatedData);

            res.json({ success: true, message: 'User updated successfully' });
        });
    } catch (error) {
        console.error("Error updating User:", error);
        res.status(500).json({ error: error.message });
    }
}

const deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await User.findByIdAndUpdate(userId, { status: 3 });
        await generateLogs(req, 'Delete', user);

        return res.json({ message: 'User deleted successfully' });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Something went wrong' });
    }
}


const getUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user', details: error.message });
    }
};

const downloadAllCsv = async (req, res) => {
    try {
        const users = await User.find({ status: { $ne: 3 } }).sort({ createdAt: -1 });

        if (users.length === 0) {
            return res.status(200).send("No users to download.");
        }

        const headers = [
            "Name",
            "Email",
            "Mobile",
            "Device Type",
            "Status",
            "Created At"
        ];

        const csvRows = users.map(user => [
            `"${user.fullName.replace(/"/g, '""').replace(/\n/g, ' ')}"`, // Handling newlines and quotes
            user.emailAddress,
            user.mobileNumber,
            user.status == '1' ? 'Active' : 'In-Active',
            user.deviceType == '1' ? 'Android' : 'IOS',
            moment(user.createdAt).format('YYYY-MM-DD HH:mm:ss')
        ].join(","));

        const csvData = [headers.join(","), ...csvRows].join("\n");

        // Set headers for downloading the CSV file
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="users_${moment().format('YYYY-MM-DD_HH-mm-ss')}.csv"`);

        res.status(200).send(csvData);

    } catch (error) {
        console.error("Error downloading all users as CSV:", error);
        res.status(500).send("Error downloading CSV file.");
    }
};


const changeStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // Expect the new status value in the request body

        if (status === undefined || status === null) {
            return res.status(400).json({ error: 'Status value is required in the request body.' });
        }

        const updatedStatus = await User.findByIdAndUpdate(id, { status }, { new: true });

        if (!updatedStatus) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        res.json({
            success: true,
            message: 'User status updated successfully',
            user: updatedStatus, // Return the updated user object
        });
    } catch (error) {
        console.error('Error updating User status:', error);

        // Handle specific errors based on error code
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Duplicate Value Found' });
        }

        // General error handling
        res.status(500).json({ message: error.message });
    }
};

module.exports = { userPage, saveUserData, userList, updateUser, deleteUser, getUser, downloadAllCsv, changeStatus }



