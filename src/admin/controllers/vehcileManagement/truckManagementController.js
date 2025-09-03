
const Vehcile = require('../../models/vehcileManagement/truckManagementModel'); // Assuming you have a Vehicle model
const Service = require('../../models/vehcileManagement/serviceManagementModel'); // Assuming you have a Vehicle model
const { uploadImage } = require("../../utils/uploadHelper"); // Import helper for file upload
const multiparty = require('multiparty');
const { generateLogs } = require('../../utils/logsHelper');

const vechiclePage = (req, res) => {
    res.render('pages/vehcileManagement/truckManagement');
}

const saveVehicle = async (req, res) => {
    try {
        const form = new multiparty.Form();

        form.parse(req, async (err, fields, files) => {
            if (err) {
                console.error("Error parsing form data:", err);
                return res.status(500).json({ error: "Failed to parse form data" });
            }

            const name = fields.name ? fields.name[0] : '';
            const status = fields.status ? fields.status[0] : '';
            const bodyType = fields.bodyType ? fields.bodyType[0] : '';
            const serviceType = fields.serviceType ? fields.serviceType[0] : '';
            const capacity = fields.capacity ? fields.capacity[0] : '';
            const tireType = fields.tireType ? fields.tireType[0] : '';

            if (!name) {
                return res.status(400).json({ error: "Truck Name is required" });
            }

            const file = files.vehicleImage ? files.vehicleImage[0] : null;

            let vehicleImageUrl = null;
            if (file.originalFilename) {
                const result = await uploadImage(file);
                if (result.success) {
                    vehicleImageUrl = result.url;
                } else {
                    console.error("Error uploading image:", result.error || result.message);
                    return res.status(500).json({ error: "Failed to upload banner image" }); // Return error if image upload fails
                }
            } else {
                vehicleImageUrl = ''; // Or handle the case where no file is uploaded based on your requirements
            }

            const vehicleData = {
                name,
                status,
                bodyType,
                serviceType,
                vehicleImage: vehicleImageUrl,
                tireType,
                capacity

            };


            const vehicle = new Vehcile(vehicleData);
            await vehicle.save();
            await generateLogs(req, 'Add', vehicle);

            res.status(201).json({ success: true, message: 'Vehicle added successfully' });
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const vehicleList = async (req, res) => {
    try {
        const { draw, start = 0, length = 10, search, order, columns } = req.body;

        // Custom search filters from form
        const {
            searchName,
            searchBodyType,
            searchServiceTypes,
            searchStatus,
            searchCreatedAt
        } = req.body;

        // Initialize filter
        const filter = {};

        // Apply custom filters
        if (searchName) {
            filter.name = { $regex: searchName, $options: 'i' };
        }

        if (searchBodyType) {
            filter.bodyType = searchBodyType;
        }

        if (searchServiceTypes) {
            filter.serviceType = searchServiceTypes;
        }

        if (searchStatus) {
            filter.status = parseInt(searchStatus);
        }

        if (searchCreatedAt) {
            const startDate = new Date(searchCreatedAt);
            const endDate = new Date(searchCreatedAt);
            endDate.setDate(endDate.getDate() + 1); // next day
            filter.createdAt = { $gte: startDate, $lt: endDate };
        }

        // Global DataTables search (optional)
        const searchValue = search?.value;
        if (searchValue) {
            filter.$or = [
                { name: { $regex: searchValue, $options: 'i' } },
                { bodyType: { $regex: searchValue, $options: 'i' } },
            ];
        }

        // Sorting
        const sortableFields = ['name', 'bodyType', 'createdAt']; // Define allowed fields

        let sort = { createdAt: -1 }; // default sort

        if (order?.[0]) {
            const colIndex = order[0].column;
            const colName = columns[colIndex]?.data;
            const sortDir = order[0].dir === 'asc' ? 1 : -1;

            // Only apply if colName is valid
            if (sortableFields.includes(colName)) {
                sort = { [colName]: sortDir };
            }
        }

        // Total & filtered counts
        const totalRecords = await Vehcile.countDocuments();
        const filteredRecords = await Vehcile.countDocuments(filter);

        // Fetch data
        const vehicles = await Vehcile.find(filter)
            .populate({ path: 'serviceType', select: 'serviceName' })
            .sort(sort)
            .skip(parseInt(start))
            .limit(parseInt(length));

        res.json({
            draw: parseInt(draw),
            recordsTotal: totalRecords,
            recordsFiltered: filteredRecords,
            data: vehicles
        });

    } catch (err) {
        console.error("Error fetching vehicle list:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};


const singleVehcile = async (req, res) => {
    try {
        const vehicle = await Vehcile.findById(req.params.id);
        if (!vehicle) {
            return res.status(404).json({ success: false, message: 'vehicle not found' });
        }
        res.json({ success: true, data: vehicle });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

const deleteVehicle = async (req, res) => {
    try {
        const { id } = req.params;
        await Vehcile.findByIdAndDelete(id);
        res.json({ success: true, message: 'Vehicle deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};



const updateVehicle = async (req, res) => {
    try {
        const form = new multiparty.Form();

        form.parse(req, async (err, fields, files) => {
            if (err) {
                console.error("Error parsing form data:", err);
                return res.status(400).json({ error: "Failed to parse form data" }); // Changed status code to 400
            }
            const name = fields.name ? fields.name[0] : '';
            const status = fields.status ? fields.status[0] : '';
            const bodyType = fields.bodyType ? fields.bodyType[0] : '';
            const serviceType = fields.serviceType ? fields.serviceType[0] : '';
            const capacity = fields.capacity ? fields.capacity[0] : '';
            const tireType = fields.tireType ? fields.tireType[0] : '';
            const { id } = req.params;

            const vehicleDetail = await Vehcile.findById(id).lean(); // Corrected model name to Banner


            if (!name) {
                return res.status(400).json({ error: "Truck Name is required" });
            }

            const file = files.vehicleImage ? files.vehicleImage[0] : null;

            let vehicleImageUrl = vehicleDetail.vehicleImage;
            if (file.originalFilename) {
                const result = await uploadImage(file);
                if (result.success) {
                    vehicleImageUrl = result.url;
                } else {
                    console.error("Error uploading image:", result.error || result.message);
                    return res.status(500).json({ error: "Failed to upload Vehicle image" }); // Return error if image upload fails
                }
            }
            const vehicleData = {
                name,
                status,
                bodyType,
                serviceType,
                vehicleImage: vehicleImageUrl,
                tireType,
                capacity
            };


            // const vehicle = new Vehcile(vehicleData);


            await Vehcile.findByIdAndUpdate(id, vehicleData); // Corrected model name to Banner
            await generateLogs(req, 'Edit', vehicleData);

            res.json({ success: true, message: 'Banner updated successfully' });
        });
    } catch (error) {
        console.error('Error updating banner:', error); // Corrected log message
        res.status(500).json({ success: false, error: error.message });
    }
};

const getServiceData = async (req, res) => {

    try {
        const serviceData = await Service.find({ status: 1 }); // Add filter if needed

        return res.status(200).json({
            status: true,
            serviceData,
        });
    } catch (error) {
        console.error("Error fetching service data:", error);
        return res.status(500).json({
            status: false,
            message: "Internal Server Error"
        });
    }

}
module.exports = {
    vechiclePage, saveVehicle, vehicleList, singleVehcile, deleteVehicle, updateVehicle, getServiceData
}