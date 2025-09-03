const vendor = require('../../models/vendorManagement/vendorModel');
const moment = require('moment'); // Ensure moment.js is installed: npm install moment
const multiparty = require('multiparty');
const { uploadImage } = require("../../utils/uploadHelper"); // Import helper for file upload
const { generateLogs } = require('../../utils/logsHelper');
const bcrypt = require('bcrypt');



const vendorPage = (req, res) => {
    const isVendor = req.session.admin?.isVendor;
    const admin_type = req.session.admin?.admin_type;
    res.render('pages/vendorManagement/vendor', { isVendor, admin_type });
}

// Fetch tracking data (for DataTable)
const vendorList = async (req, res) => {
    const admin = req.session.admin || {};
    const isVendor = admin?.isVendor == 1 ? 1 : 0;
    const adminId = admin.id || null;

    try {
        const { start, length, search, columns, order } = req.body;
        const searchValue = search?.value;
        let query = {};
        let sort = {};

        if (isVendor == 1) {
            query.isVendor = 1;
            query.vendorId = adminId;
        }


        const trackingCodeSearch = req.body.searchname;
        const vendornumnber = req.body.mobile;
        const vendoremail = req.body.email;

        const statusSearch = req.body.status;
        const dateSearch = req.body.date; // This corresponds to the frontend's searchDate

        if (searchValue) {
            query.$or = [
                { trackingId: new RegExp(searchValue, 'i') },
                { status: new RegExp(searchValue, 'i') }
                // Add more fields to the global search if needed
            ];
        } else {
            if (trackingCodeSearch) {
                query.name = new RegExp(trackingCodeSearch, 'i');
            }
            if (vendornumnber) {
                query.mobile = new RegExp(vendornumnber, 'i');
            }
            if (vendoremail) {
                query.email = new RegExp(vendoremail, 'i');
            }


            if (statusSearch) {
                query.status = parseInt(statusSearch);
            }
            if (dateSearch) {
                const searchMoment = moment(dateSearch);
                const startDate = searchMoment.clone().startOf('day');
                const endDate = searchMoment.clone().endOf('day');

                query.createdAt = { // Replace 'yourDateField' with the actual name of the date field in your model
                    $gte: startDate.toDate(),
                    $lte: endDate.toDate()
                };
            }
        }


        // Add ordering functionality
        if (order && order.length > 0) {
            const columnIndex = order[0].column;
            const sortDirection = order[0].dir === 'asc' ? 1 : -1;

            // Determine the field to sort by based on the column index
            switch (parseInt(columnIndex)) {
                case 5: // No. of Mode column
                    sort.noOfPacking = sortDirection;
                    break;
                case 7: // Delivery Date column (assuming this maps to estimateDate)
                    sort.deliveryDate = sortDirection;
                    break;
                default:
                    // Default sorting if no valid column is specified (e.g., by creation date descending)
                    sort.createdAt = -1;
                    break;
            }
        } else {
            // Default sorting if no order is specified (e.g., by creation date descending)
            sort.createdAt = -1;
        }

        const tracking = await vendor.find(query)
            .skip(Number(start))
            .limit(Number(length))
            .sort(sort); // Apply the sort order

        const totalRecords = await vendor.countDocuments(query);
        const filteredRecords = await vendor.countDocuments(query);

        res.json({
            draw: req.body.draw,
            recordsTotal: totalRecords,
            recordsFiltered: filteredRecords,
            data: tracking
        });
    } catch (error) {
        console.error('Error fetching vendor list:', error);
        res.status(500).json({ error: 'Failed to fetch vendor data' });
    }
};

const addVendor = async (req, res) => {
    const admin = req.session.admin || {};
    const isVendor = admin?.isVendor == 1 ? 1 : 0;
    const adminId = admin.id || null;

    try {
        const form = new multiparty.Form();

        form.parse(req, async (err, fields) => {
            if (err) {
                console.error("Error parsing form data:", err);
                return res.status(400).json({ error: "Failed to parse form data" });
            }

            let parsedPermissions = [];

            const name = fields.name?.[0] || '';
            const status = fields.status ? parseInt(fields.status[0]) : null;
            const mobile = fields.mobile?.[0] || '';
            const email = fields.email?.[0] || '';
            const business_name = fields.business_name?.[0] || '';
            const password = fields.password?.[0] || '';
            const business_category = fields.business_category?.[0] || '';
            const address = fields.address?.[0] || '';
            const admin_type = fields.admin_type?.[0] || '';
            const driverPercentageCut = fields.driverPercentageCut?.[0] || '';
            const permissions = fields.permissions?.[0] || '';
            parsedPermissions = JSON.parse(permissions);

            console.log('parsedPermissions', parsedPermissions);
            console.log('formdata', typeof parsedPermissions);


            // Validation
            if (!name || !status || !mobile || !email || !password) {
                return res.status(400).json({ message: 'name, status, mobile, email, and password are required' });
            }

            if (isNaN(status) || status < 1 || status > 2) {
                return res.status(400).json({ message: 'Invalid status value' });
            }

            // Check if email or mobile already exists
            const existingVendor = await vendor.findOne({
                $or: [{ email }, { mobile }]
            });

            if (existingVendor) {
                return res.status(400).json({
                    message: 'Email or mobile number already exists'
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const newVendor = new vendor({
                name,
                mobile,
                email,
                password: hashedPassword,
                business_name,
                business_category,
                address,
                status,
                admin_type,
                driverPercentageCut,
                permissions: parsedPermissions,
                isVendor,
                vendorId: isVendor ? adminId : null,
                createdAt: new Date()
            });

            await newVendor.save();
            await generateLogs(req, 'Add', newVendor);

            res.status(201).json({ message: 'Vendor added successfully', data: newVendor });
        });
    } catch (err) {
        console.error('Error adding vendor:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};



const getvendorbyId = async (req, res) => {
    try {
        const tracking = await vendor.findById(req.params.id);
        if (!tracking) {
            return res.status(404).json({ message: 'Tracking not found' });
        }
        res.json(tracking);
    } catch (error) {
        console.error('Error fetching tracking by ID:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};
const editVendor = async (req, res) => {
    try {
        const form = new multiparty.Form();

        form.parse(req, async (err, fields, files) => {
            if (err) {
                console.error("Error parsing form data:", err);
                return res.status(400).json({ error: "Failed to parse form data" });
            }

            const { id } = req.params;

            let parsedPermissions = [];


            const name = fields.name?.[0] || '';
            const status = fields.status?.[0] ? parseInt(fields.status[0]) : null;
            const mobile = fields.mobile?.[0] || '';
            const email = fields.email?.[0] || '';
            const business_name = fields.business_name?.[0] || '';
            const password = fields.password?.[0] || '';
            const business_category = fields.business_category?.[0] || '';
            const Address = fields.Address?.[0] || '';
            const admin_type = fields.admin_type?.[0] || '';
            const driverPercentageCut = fields.driverPercentageCut?.[0] || '';
            const permissions = fields.permissions?.[0] || '';
            parsedPermissions = JSON.parse(permissions);


            if (!name || !mobile || status === null || !email || !business_name || !business_category) {
                return res.status(400).json({
                    error: "Name, Mobile, Status, Email, Business Name & Category are required"
                });
            }

            const existingVendor = await vendor.findById(id);
            if (!existingVendor) {
                return res.status(404).json({ success: false, message: 'Vendor not found' });
            }


            const updatedVendor = await vendor.findByIdAndUpdate(
                id,
                {
                    name,
                    mobile,
                    email,
                    business_name,
                    business_category,
                    Address,
                    admin_type,
                    driverPercentageCut,
                    permissions: parsedPermissions,
                    status,
                },
                { new: true }
            );

            if (!updatedVendor) {
                return res.status(404).json({ message: 'Vendor update failed' });
            }

            await generateLogs(req, 'Edit', updatedVendor);

            res.json({ message: 'Vendor updated successfully', data: updatedVendor });
        });
    } catch (error) {
        console.error('Error updating vendor:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};


const deletevendor = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedTracking = await vendor.findByIdAndDelete(id);

        if (!deletedTracking) {
            return res.status(404).json({ message: 'vendor not found' });
        }
        await generateLogs(req, 'Delete', deletedTracking);

        res.json({ message: 'vendor deleted successfully' });

    } catch (error) {
        console.error('Error deleting vendor:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

const downloadTrackingCsv = async (req, res) => {
    try {
        const vendors = await vendor.find().sort({ createdAt: -1 });

        if (vendors.length === 0) {
            return res.status(200).send("No vendors to download.");
        }

        const headers = [
            "Name",
            "Status",
            "Email",
            "Mobile",
            "Business Name",
            "business_category",
            "Created At"
        ];

        const csvRows = vendors.map(vendor => [
            `"${vendor.name.replace(/"/g, '""')}"`,
            vendor.status == '1' ? 'Active' : 'In-Active', vendor.email, vendor.mobile, vendor.business_name, vendor.business_category,
            moment(vendor.createdAt).format('YYYY-MM-DD HH:mm:ss')
        ].join(","));

        const csvData = [headers.join(","), ...csvRows].join("\n");

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="vendor.csv"');

        res.status(200).send(csvData);

    } catch (error) {
        console.error("Error downloading all blogs as CSV:", error);
        res.status(500).send("Error downloading CSV file.");
    }
};

module.exports = {
    vendorPage,
    vendorList,
    addVendor,
    getvendorbyId,
    editVendor,
    deletevendor,
    downloadTrackingCsv
};
