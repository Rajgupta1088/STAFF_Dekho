const Tracking = require('../../models/websiteManagement/trackingModel');
const fs = require('fs');
const moment = require('moment'); // Ensure moment.js is installed: npm install moment
const csv = require('csv-parser');
const multiparty = require('multiparty');
const { uploadImage } = require("../../utils/uploadHelper"); // Import helper for file upload
const statesCities = require('./states-cities.json');
const City = require('../../models/websiteManagement/cityModal');
const { generateLogs } = require('../../utils/logsHelper');


const _ = require('lodash');


const iconv = require('iconv-lite');
// const moment = require('moment');



const trackingPage = (req, res) => {
    res.render('pages/websiteManagement/tracking');
}

// Fetch tracking data (for DataTable)
const trackingList = async (req, res) => {
    try {
        const { start, length, search, columns, order } = req.body;
        const searchValue = search?.value;
        let query = {};
        let sort = {};

        const trackingCodeSearch = req.body.trackingCode;

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
                query.trackingId = new RegExp(trackingCodeSearch, 'i');
            }


            if (statusSearch) {
                query.status = parseInt(statusSearch);
            }
            if (dateSearch) {
                const searchMoment = moment(dateSearch);
                const startDate = searchMoment.clone().startOf('day');
                const endDate = searchMoment.clone().endOf('day');

                query.deliveryDate = { // Replace 'yourDateField' with the actual name of the date field in your model
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
                    // sort.noOfPacking = sortDirection;
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

        const tracking = await Tracking.find(query)
            .skip(Number(start))
            .limit(Number(length))
            .sort(sort); // Apply the sort order

        const totalRecords = await Tracking.countDocuments();
        const filteredRecords = await Tracking.countDocuments(query);

        res.json({
            draw: req.body.draw,
            recordsTotal: totalRecords,
            recordsFiltered: filteredRecords,
            data: tracking
        });
    } catch (error) {
        console.error('Error fetching tracking list:', error);
        res.status(500).json({ error: 'Failed to fetch tracking data' });
    }
};


const addTracking = async (req, res) => {

    try {
        const form = new multiparty.Form();

        form.parse(req, async (err, fields) => {
            if (err) {
                console.error("Error parsing form data:", err);
                return res.status(400).json({ error: "Failed to parse form data" }); // Changed status code to 400 for bad request
            }

            const trackingCode = fields.trackingCode ? fields.trackingCode[0] : '';
            const consignerName = fields.consignerName ? fields.consignerName[0] : '';
            const status = fields.status ? parseInt(fields.status[0]) : null;
            const pickUpLocation = fields.pickUpLocation ? fields.pickUpLocation[0] : ''; // Default to Active
            const dropLocation = fields.dropLocation ? fields.dropLocation[0] : ''; // Default to Active
            const transportMode = fields.transportMode ? fields.transportMode[0] : ''; // Default to Active
            // const noOfPacking = fields.noOfPacking ? parseInt(fields.noOfPacking[0]) : 1; // Default to Active
            const deliveryDate = fields.deliveryDate ? fields.deliveryDate[0] : ''; // Default to Active
            const estimateDate = fields.estimateDate ? fields.estimateDate[0] : ''; // Default to Active
            const currentLocation = fields.currentLocation ? fields.currentLocation[0] : ''; // Default to Active
            const transitTracking = fields.transitData ? fields.transitData : []; // not [0] if you want full array


            const consigneeName = fields.consigneeName ? fields.consigneeName[0] : '';
            const mobile = fields.mobile ? fields.mobile[0] : '';
            const consignorPincode = fields.consignorPincode ? fields.consignorPincode[0] : '';
            // const lrNo = fields.lrNo ? fields.lrNo[0] : '';
            const referenceNo = fields.referenceNo ? fields.referenceNo[0] : '';
            const invoiceNumber = fields.invoiceNumber ? fields.invoiceNumber[0] : '';
            const invoiceValue = fields.invoiceValue ? parseFloat(fields.invoiceValue[0]) : 0;
            const boxes = fields.boxes ? parseInt(fields.boxes[0]) : 0;
            const ewayBillNo = fields.ewayBillNo ? fields.ewayBillNo[0] : '';
            const invoiceDate = fields.invoiceDate ? fields.invoiceDate[0] : '';
            const connectionPartner = fields.connectionPartner ? fields.connectionPartner[0] : '';
            const partnerCnNumber = fields.partnerCnNumber ? fields.partnerCnNumber[0] : '';
            const actualWeight = fields.actualWeight ? parseFloat(fields.actualWeight[0]) : 0;
            const chargedWeight = fields.chargedWeight ? parseFloat(fields.chargedWeight[0]) : 0;
            const connectionDate = fields.connectionDate ? fields.connectionDate[0] : '';
            const tat = fields.tat ? fields.tat[0] : '';
            // const edd = fields.edd ? fields.edd[0] : '';
            const add = fields.add ? fields.add[0] : '';
            const remarks = fields.remarks ? fields.remarks[0] : '';

            const checkExistingTrackingCode = await Tracking.find({ 'trackingCode': trackingCode });

            if (!checkExistingTrackingCode) {
                return res.status(200).json({ success: false, message: 'Track Id Already Registered' });
            }
            console.log('Invoice Date -> ', invoiceDate)
            console.log('Estimate Date -> ', estimateDate)
            let parsedTransitTracking = [];
            if (transitTracking.length > 0) {
                parsedTransitTracking = transitTracking.map(item => {
                    try {
                        return JSON.parse(item); // Parse each item into an object
                    } catch (e) {
                        console.error('Error parsing transit item:', item);
                        return null; // Return null if parsing fails
                    }
                }).filter(item => item !== null); // Remove invalid items (null)
            }

            if (!trackingCode || !status) {
                return res.status(200).json({ success: false, message: 'Tracking ID, Status,  No. of Packing & Estimate Date are required' });
            }

            // Convert status to number
            const statusNumber = parseInt(status);
            if (isNaN(statusNumber) || statusNumber < 1 || statusNumber > 6) {
                return res.status(200).json({ success: false, message: 'Invalid status value' });
            }
            const statusMap = {
                1: { key: 'pickup', status: 0, deliveryDateTime: '' },
                2: { key: 'intransit', status: 0, deliveryDateTime: '', transitData: [] },
                3: { key: 'outdelivery', status: 0, deliveryDateTime: '' },
                4: { key: 'delivered', status: 0, deliveryDateTime: '' },
                5: { key: 'cancelled', status: 0, deliveryDateTime: '' },
                6: { key: 'hold', status: 0, deliveryDateTime: '' },
            };

            statusMap[status].status = 1;
            statusMap[status].deliveryDateTime = deliveryDate;


            if (status == 2 && Array.isArray(transitTracking) && transitTracking.length > 0)
                statusMap[2].transitData = parsedTransitTracking[0];

            const newTracking = new Tracking({
                trackingId: trackingCode,
                consignerName,
                status: statusNumber,
                estimateDate: estimateDate ? moment(estimateDate).toDate() : '', // Convert string to Date object using moment for consistency
                pickUpLocation: pickUpLocation || null,
                dropLocation: dropLocation || null,
                transportMode: transportMode || null,
                currentLocation: currentLocation || '',
                // noOfPacking: parseInt(noOfPacking),
                createdAt: new Date(),// Add createdAt timestamp on creation,
                deliveryStatus: statusMap,

                consigneeName,
                mobile,
                consignorPincode,
                // lrNo,
                referenceNo,
                invoiceNumber,
                invoiceValue: parseFloat(invoiceValue) || 0,
                boxes: parseInt(boxes) || 0,
                ewayBillNo,
                invoiceDate: invoiceDate ? moment(invoiceDate).toDate() : '',
                connectionPartner,
                partnerCnNumber,
                actualWeight: parseFloat(actualWeight) || 0,
                chargedWeight: parseFloat(chargedWeight) || 0,
                connectionDate: connectionDate ? moment(connectionDate).toDate() : '',
                tat,
                // edd,
                add,
                remarks,

            });

            await newTracking.save();
            await generateLogs(req, 'Add', newTracking);

            res.status(201).json({ success: true, message: 'Tracking added successfully', data: newTracking });
        });
    } catch (err) {
        console.error('Error adding tracking:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

const getTrackingById = async (req, res) => {
    try {
        const tracking = await Tracking.findById(req.params.id);
        if (!tracking) {
            return res.status(404).json({ message: 'Tracking not found' });
        }
        res.json(tracking);
    } catch (error) {
        console.error('Error fetching tracking by ID:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

const updateTracking = async (req, res) => {


    try {
        const form = new multiparty.Form();

        form.parse(req, async (err, fields, files) => {
            if (err) {
                console.error("Error parsing form data:", err);
                return res.status(400).json({ error: "Failed to parse form data" }); // Changed status code to 400 for bad request
            }
            const { id } = req.params;



            const trackingCode = fields.trackingCode ? fields.trackingCode[0] : '';
            const consignerName = fields.consignerName ? fields.consignerName[0] : '';
            const status = fields.status ? parseInt(fields.status[0]) : null;
            const pickUpLocation = fields.pickUpLocation ? fields.pickUpLocation[0] : '';
            const dropLocation = fields.dropLocation ? fields.dropLocation[0] : '';
            const transportMode = fields.transportMode ? fields.transportMode[0] : '';
            // const noOfPacking = fields.noOfPacking ? fields.noOfPacking[0] : '';
            const deliveryDate = fields.deliveryDate ? fields.deliveryDate[0] : '';
            const estimateDate = fields.estimateDate ? fields.estimateDate[0] : '';
            const currentLocation = fields.currentLocation ? fields.currentLocation[0] : '';
            const transitTracking = fields.transitData ? fields.transitData : []; // not [0] if you want full array


            const consigneeName = fields.consigneeName ? fields.consigneeName[0] : '';
            const mobile = fields.mobile ? fields.mobile[0] : '';
            const consignorPincode = fields.consignorPincode ? fields.consignorPincode[0] : '';
            // const lrNo = fields.lrNo ? fields.lrNo[0] : '';
            const referenceNo = fields.referenceNo ? fields.referenceNo[0] : '';
            const invoiceNumber = fields.invoiceNumber ? fields.invoiceNumber[0] : '';
            const invoiceValue = fields.invoiceValue ? parseFloat(fields.invoiceValue[0]) : 0;
            const boxes = fields.boxes ? parseInt(fields.boxes[0]) : 0;
            const ewayBillNo = fields.ewayBillNo ? fields.ewayBillNo[0] : '';
            const invoiceDate = fields.invoiceDate ? fields.invoiceDate[0] : '';
            const connectionPartner = fields.connectionPartner ? fields.connectionPartner[0] : '';
            const partnerCnNumber = fields.partnerCnNumber ? fields.partnerCnNumber[0] : '';
            const actualWeight = fields.actualWeight ? parseFloat(fields.actualWeight[0]) : 0;
            const chargedWeight = fields.chargedWeight ? parseFloat(fields.chargedWeight[0]) : 0;
            const connectionDate = fields.connectionDate ? fields.connectionDate[0] : '';
            const tat = fields.tat ? fields.tat[0] : '';
            // const edd = fields.edd ? fields.edd[0] : '';
            const add = fields.add ? fields.add[0] : '';
            const remarks = fields.remarks ? fields.remarks[0] : '';



            let parsedTransitTracking = [];
            if (transitTracking.length > 0) {
                parsedTransitTracking = transitTracking.map(item => {
                    try {
                        return JSON.parse(item); // Parse each item into an object
                    } catch (e) {
                        console.error('Error parsing transit item:', item);
                        return null; // Return null if parsing fails
                    }
                }).filter(item => item !== null); // Remove invalid items (null)
            }

            const file = files.pod ? files.pod[0] : null;

            if (!trackingCode || pickUpLocation === null || status === null || dropLocation === null || transportMode === null) { // Corrected the validation for bannerType and status
                return res.status(400).json({ error: "Tracking Code, status , PickUpLocation , dropLocation , transportMode  are required" });
            }

            const existingTrack = await Tracking.findById(id);
            if (!existingTrack) {
                return res.status(404).json({ success: false, message: 'Track not found' });
            }
            let imageUrl = existingTrack.pod; // Default to existing image
            if (file) {
                const result = await uploadImage(file);
                imageUrl = result.success ? result.url : imageUrl;
            }


            const existingTrackk = await Tracking.findById(id);

            if (!existingTrackk) {
                return res.status(404).json({ success: false, message: 'Track not found' });
            }

            // Clone current deliveryStatus
            let updatedDeliveryStatus = { ...existingTrackk.deliveryStatus };
            console.log(existingTrackk.deliveryStatus[4]);
            console.log('status', status);
            console.log('updatedDeliveryStatus', updatedDeliveryStatus);

            // Loop through the keys (as strings)
            for (let i = 1; i <= 6; i++) {
                const key = i;

                if (key <= status) {
                    updatedDeliveryStatus[key].status = 1;
                    if (updatedDeliveryStatus[key].deliveryDateTime === '') {
                        updatedDeliveryStatus[key].deliveryDateTime = deliveryDate;
                    }
                    if (deliveryDate) {
                        updatedDeliveryStatus[status].deliveryDateTime = deliveryDate;
                    }
                }
                else {
                    updatedDeliveryStatus[key].status = 0;
                    updatedDeliveryStatus[key].deliveryDateTime = '';
                }
            }

            if (status == 2 && Array.isArray(transitTracking) && transitTracking.length > 0)
                updatedDeliveryStatus[2].transitData = parsedTransitTracking[0];

            const updatedTracking = await Tracking.findByIdAndUpdate(
                id,
                {
                    trackingId: trackingCode,
                    consignerName,
                    status: parseInt(status), //currentstatus
                    estimateDate,
                    currentLocation,
                    pickUpLocation,
                    dropLocation,
                    transportMode,
                    // noOfPacking: parseInt(noOfPacking),
                    pod: imageUrl,
                    deliveryStatus: updatedDeliveryStatus,// ✅ save the updated object

                    consigneeName,
                    mobile,
                    consignorPincode,
                    // lrNo,
                    referenceNo,
                    invoiceNumber,
                    invoiceValue: parseFloat(invoiceValue) || 0,
                    boxes: parseInt(boxes) || 0,
                    ewayBillNo,
                    invoiceDate: invoiceDate ? moment(invoiceDate).toDate() : '',
                    connectionPartner,
                    partnerCnNumber,
                    actualWeight: parseFloat(actualWeight) || 0,
                    chargedWeight: parseFloat(chargedWeight) || 0,
                    connectionDate: connectionDate ? moment(connectionDate).toDate() : '',
                    tat,
                    // edd,
                    add,
                    remarks,
                },
                { new: true } // Return the updated document
            );

            if (!updatedTracking) {
                return res.status(404).json({ message: 'Tracking not found' });
            }

            await Tracking.findByIdAndUpdate(id, updatedTracking);
            await generateLogs(req, 'Update', updatedTracking);



            res.json({ message: 'Tracking updated successfully', data: updatedTracking });
        });
    } catch (error) {
        console.error('Error updating tracking:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }

};


const deleteTracking = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedTracking = await Tracking.findByIdAndDelete(id);

        if (!deletedTracking) {
            return res.status(404).json({ message: 'Tracking not found' });
        }
        await generateLogs(req, 'delete', deletedTracking);

        res.json({ message: 'Tracking deleted successfully' });

    } catch (error) {
        console.error('Error deleting tracking:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

const checkAndInsertCity = async (cityName) => {
    if (!cityName) return;

    const trimmed = cityName.trim();
    const exists = await City.findOne({
        name: { $regex: `^${trimmed}$`, $options: 'i' }
    });

    if (!exists) {
        const newCity = new City({ name: trimmed });
        await newCity.save();
        console.log(`Inserted new city: ${trimmed}`);
    }
};



// const defaultDeliveryStatus = {
//     1: { key: 'pickup', status: 0, deliveryDateTime: '', pod: '' },
//     2: { key: 'intransit', status: 0, deliveryDateTime: '', transitData: [], pod: '' },
//     3: { key: 'outdelivery', status: 0, deliveryDateTime: '', pod: '' },
//     4: { key: 'delivered', status: 0, deliveryDateTime: '', pod: '' },
//     5: { key: 'cancelled', status: 0, deliveryDateTime: '', pod: '' },
//     6: { key: 'hold', status: 0, deliveryDateTime: '', pod: '' }
// };

// const formatDate = (date) => {
//     if (!date || date === 'null' || date === 'undefined') return null;
//     const parsed = moment(date, ["DD-MM-YYYY", "DD-MM-YYYY", "MM-DD-YYYY"], true);
//     return parsed.isValid() ? parsed.format("DD-MM-YYYY") : null;
// };


function decodeMimeUtf7String(input) {
    return input
        .replace(/\+AC0/g, '-')     // +AC0 → -
        .replace(/\+AHw/g, '|')     // +AHw → |
        .replace(/\+AC8/g, '/')     // +AC8 → /
        .replace(/\+AC8-/g, '/')    // just in case
        .replace(/\+AC0APg-/g, '->') // +AC0APg- → ->
        .replace(/\+AC0APg/g, '->') // fallback
        .replace(/\+AC0/g, '-')     // again, in case
        .replace(/\+ADs/g, ';')     // +ADs → ;
        .replace(/\+AD0/g, '=')     // +AD0 → =
        .replace(/\+AF8/g, '_')     // +AF8 → _
        .replace(/\+ACo/g, '*')     // +ACo → *
        .replace(/\+ACI/g, '"')     // +ACI → "
        .replace(/\+ACQ/g, '$')     // +ACQ → $
        .replace(/\+AF8-/g, '_');   // +AF8- → _
}

const qp = require('quoted-printable');

function cleanCorruptedTrackingStatus(str) {
    return str
        .replace(/-APg-/g, '->')   // Replace "-APg-" with "->"
        .replace(/--/g, '-')       // Replace double dashes with single dash
        .replace(/\|-/g, '|')      // Replace "|-" with "|"
        .replace(/->cancelled/g, '->cancelled') // Ensure valid keyword spacing
        .trim();
}

// const UploadCsv = async (req, res) => {
//     try {
//         if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

//         const results = [];
//         const duplicates = [];
//         const saved = [];

//         // UTF-8 safe read + CSV parse
//         fs.createReadStream(req.file.path)
//             .pipe(iconv.decodeStream('utf8')) // 👈 Fix encoding issue here
//             .pipe(csv())
//             .on('data', (row) => {
//                 const cleanedRow = {};
//                 for (const key in row) {
//                     let value = row[key];
//                     if (typeof value === 'string') {
//                         value = decodeMimeUtf7String(value); // 💡 decode here
//                         cleanedRow[key.trim()] = value.trim();
//                     } else {
//                         cleanedRow[key.trim()] = value;
//                     }
//                 }
//                 results.push(cleanedRow);
//             })
//             .on('end', async () => {

//                 // console.log('8', deliveryStatus)

//                 // ✅ Tracking status parser function
//                 const parseTrackingStatus = (input, deliveryStatus) => {
//                     let input1 = cleanCorruptedTrackingStatus(input);
//                     console.log('input', input1)
//                     console.log('7', deliveryStatus)

//                     const keyToIndex = {
//                         pickup: 1,
//                         intransit: 2,
//                         outdelivery: 3,
//                         delivered: 4,
//                         cancelled: 5,
//                         hold: 6
//                     };

//                     const parts = input1.split('->').map(p => p.trim());
//                     let i = 0;

//                     while (i < parts.length) {
//                         const key = parts[i].toLowerCase();
//                         const value = parts[i + 1] ? parts[i + 1].trim() : '';

//                         if (keyToIndex[key]) {
//                             const index = keyToIndex[key];
//                             deliveryStatus[index].status = 1;

//                             if (key === 'intransit') {
//                                 deliveryStatus[index].transitData = value.split('|').map(item => {
//                                     const [city, date] = item.split(':').map(s => s.trim());
//                                     return { city, date };
//                                 });
//                             } else {
//                                 deliveryStatus[index].deliveryDateTime = value;
//                             }
//                             i += 2;
//                         } else {
//                             i++;
//                         }
//                     }

//                     return deliveryStatus;
//                 };

//                 for (const row of results) {
//                     try {
//                         const {
//                             trackingId,
//                             pickUpLocation,
//                             dropLocation,
//                             transportMode,
//                             status,
//                             deliveryDate,
//                             consignerName,
//                             estimateDate,
//                             currentLocation,
//                             pod,
//                             invoiceDate,
//                             connectionDate,
//                             consigneeName,
//                             mobile,
//                             consignorPincode,
//                             referenceNo,
//                             invoiceNumber,
//                             invoiceValue,
//                             boxes,
//                             ewayBillNo,
//                             connectionPartner,
//                             partnerCnNumber,
//                             actualWeight,
//                             chargedWeight,
//                             tat,
//                             add,
//                             remarks,
//                             trackingStatus
//                         } = row;

//                         if (!trackingId) continue;
//                         const trimmedTrackingId = trackingId.trim();

//                         // Ensure cities exist
//                         await Promise.all([
//                             checkAndInsertCity(pickUpLocation),
//                             checkAndInsertCity(dropLocation)
//                         ]);

//                         const existing = await Tracking.findOne({ trackingId: trimmedTrackingId });

//                         // Format dates
//                         const formattedDeliveryDate = formatDate(deliveryDate);
//                         const formattedEstimateDate = formatDate(estimateDate);
//                         const formattedInvoiceDate = formatDate(invoiceDate);
//                         const formattedConnectionDate = formatDate(connectionDate);

//                         if (existing) {
//                             const updateFields = {};

//                             if (trackingStatus) {
//                                 const modifiedStatus = parseTrackingStatus(trackingStatus, structuredClone(defaultDeliveryStatus));
//                                 if (JSON.stringify(existing.deliveryStatus || {}) !== JSON.stringify(modifiedStatus)) {
//                                     updateFields.deliveryStatus = modifiedStatus;
//                                 }
//                             }

//                             const fieldsToCompare = {
//                                 pickUpLocation,
//                                 dropLocation,
//                                 transportMode,
//                                 status: statusMapping(status),
//                                 consignerName,
//                                 currentLocation,
//                                 consigneeName,
//                                 mobile,
//                                 consignorPincode,
//                                 referenceNo,
//                                 invoiceNumber,
//                                 invoiceValue,
//                                 boxes,
//                                 ewayBillNo,
//                                 connectionPartner,
//                                 partnerCnNumber,
//                                 actualWeight,
//                                 chargedWeight,
//                                 tat,
//                                 add,
//                                 remarks
//                             };

//                             for (const field in fieldsToCompare) {
//                                 if (existing[field] !== fieldsToCompare[field]) {
//                                     updateFields[field] = fieldsToCompare[field];
//                                 }
//                             }

//                             const dateFields = {
//                                 deliveryDate: formattedDeliveryDate,
//                                 estimateDate: formattedEstimateDate,
//                                 invoiceDate: formattedInvoiceDate,
//                                 connectionDate: formattedConnectionDate
//                             };

//                             for (const field in dateFields) {
//                                 if (formatDate(existing[field]) !== dateFields[field]) {
//                                     updateFields[field] = dateFields[field];
//                                 }
//                             }

//                             if (Object.keys(updateFields).length > 0) {
//                                 await Tracking.updateOne({ trackingId: trimmedTrackingId }, { $set: updateFields });
//                                 duplicates.push({ trackingId: trimmedTrackingId, reason: 'Updated existing record' });
//                             } else {
//                                 duplicates.push({ trackingId: trimmedTrackingId, reason: 'Already exists with same data' });
//                             }
//                             continue;
//                         }

//                         // If new record
//                         const statusNum = parseInt(status) || 0;
//                         let deliveryStatus = structuredClone(defaultDeliveryStatus);

//                         if (trackingStatus) {
//                             deliveryStatus = parseTrackingStatus(trackingStatus, deliveryStatus);
//                         } else if (deliveryStatus[statusNum]) {
//                             deliveryStatus[statusNum].status = 1;
//                             deliveryStatus[statusNum].deliveryDateTime = new Date();
//                             if (statusNum === 4) {
//                                 deliveryStatus[statusNum].pod = pod || '';
//                             }
//                         }

//                         const newTracking = new Tracking({
//                             trackingId: trimmedTrackingId,
//                             pickUpLocation,
//                             dropLocation,
//                             transportMode,
//                             status: status ? statusMapping(status) : '',
//                             deliveryDate: formattedDeliveryDate,
//                             consignerName,
//                             currentLocation,
//                             estimateDate: formattedEstimateDate ? moment(formattedEstimateDate, 'DD-MM-YYYY').toDate() : '',
//                             pod: statusNum === 4 ? pod : '',
//                             invoiceDate: formattedInvoiceDate ? moment(formattedInvoiceDate, 'DD-MM-YYYY').toDate() : '',
//                             connectionDate: formattedConnectionDate ? moment(formattedConnectionDate, 'DD-MM-YYYY').toDate() : '',
//                             consigneeName,
//                             mobile,
//                             consignorPincode,
//                             referenceNo,
//                             invoiceNumber,
//                             invoiceValue,
//                             boxes,
//                             ewayBillNo,
//                             connectionPartner,
//                             partnerCnNumber,
//                             actualWeight,
//                             chargedWeight,
//                             tat,
//                             add,
//                             remarks,
//                             deliveryStatus
//                         });

//                         await newTracking.save();
//                         saved.push(trimmedTrackingId);

//                     } catch (err) {
//                         console.error(`Error saving trackingId ${row.trackingId || 'Unknown'}:`, err.message);
//                         duplicates.push({ trackingId: row.trackingId || 'Unknown', reason: err.message });
//                     }
//                 }

//                 res.status(200).json({
//                     success: true,
//                     message: "CSV uploaded and processed.",
//                     savedCount: saved.length,
//                     duplicateCount: duplicates.length,
//                     duplicates
//                 });
//             })
//             .on('error', (err) => {
//                 console.error("CSV parse error:", err.message);
//                 res.status(500).json({ success: false, message: 'CSV file processing error' });
//             });

//     } catch (err) {
//         console.error("UploadCsv error:", err.message);
//         res.status(500).json({ success: false, message: "Server error" });
//     }
// };

function formatTrackingStatus(status) {
    switch (status) {
        case 1: return 'Pickup';
        case 2: return 'InTransit';
        case 3: return 'OutForDelivery';
        case 4: return 'Delivered';
        case 5: return 'Cancelled';
        case 6: return 'Hold';
        default: return 'Unknown';
    }
}


// function statusMapping(status) {
//     switch (status) {
//         case 'Pickup': return 1;
//         case 'In Transit': return 2;
//         case 'Out For Delivery': return 3;
//         case 'Delivered': return 4;
//         case 'Cancelled': return 5;
//         case 'Hold': return 6;
//         default: return 0;
//     }
// }

function trackingStatusToString(deliveryStatus) {
    console.log('deliveryStatus', deliveryStatus)
    if (!deliveryStatus || typeof deliveryStatus !== 'object') return '';

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.trim().split('-');
        return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
    }

    const segments = [];
    const steps = Object.keys(deliveryStatus).sort((a, b) => Number(a) - Number(b));

    for (const step of steps) {
        const entry = deliveryStatus[step];
        const key = entry.key.toLowerCase();

        switch (key) {
            case 'pickup':
            case 'outdelivery':
                segments.push(key);
                segments.push(formatDate(entry.deliveryDateTime));
                break;
            case 'delivered':
                segments.push(key);
                segments.push(formatDate(entry.deliveryDateTime));
                break;

            case 'intransit':
                segments.push('intransit');
                if (Array.isArray(entry.transitData)) {
                    const transitStr = entry.transitData.map(item => {
                        return `${item.city} : ${formatDate(item.date)}`;
                    }).join(' | ');
                    segments.push(transitStr);
                } else {
                    segments.push('');
                }
                break;

            case 'cancelled':
                segments.push('cancelled');
                break;
        }
    }

    return segments.join(' -> ');
}

// Convert trackingStatus string into JSON deliveryStatus
function trackingStatusFormat(trackingStatus, deliveryStatus) {
    function formatDate(dateStr) {
        if (!dateStr) return '';
        const [day, month, year] = dateStr.split('-');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // const deliveryStatus = {};
    const segments = trackingStatus.split('->');
    let i = 0;
    let step = 1;

    while (i < segments.length) {
        const key = segments[i].trim().toLowerCase();

        switch (key) {
            case 'pickup':
                deliveryStatus[step++] = {
                    key: "pickup",
                    status: 1,
                    deliveryDateTime: formatDate(segments[i + 1])
                };
                i += 2;
                break;

            case 'intransit':
                const transitItems = (segments[i + 1] || '').split('|').map(item => {
                    const [city, date] = item.split(" : ");
                    console.log('date', date);

                    return {
                        city: city?.trim() || '',
                        date: date ? formatDate(date) : ''
                    };
                });
                deliveryStatus[step++] = {
                    key: "intransit",
                    status: 1,
                    deliveryDateTime: '',
                    transitData: transitItems
                };
                i += 2;
                break;

            case 'outdelivery':
                deliveryStatus[step++] = {
                    key: "outdelivery",
                    status: 1,
                    deliveryDateTime: formatDate(segments[i + 1])
                };
                i += 2;
                break;

            case 'delivered':
                deliveryStatus[step++] = {
                    key: "delivered",
                    status: 1,
                    deliveryDateTime: formatDate(segments[i + 1])
                };
                i += 2;
                break;

            default:
                i++;
        }
    }

    deliveryStatus[step++] = {
        key: "cancelled",
        status: 0,
        deliveryDateTime: ""
    };

    return deliveryStatus;
}

function formatDeliveryStatus(deliveryStatus) {
    const parts = [];

    for (const key in deliveryStatus) {
        const entry = deliveryStatus[key];

        // Skip if not active
        if (entry.status !== 1) continue;

        const formattedKey = entry.key.charAt(0).toUpperCase() + entry.key.slice(1);

        // If Intransit and transitData is available
        if (
            entry.key === 'intransit' &&
            Array.isArray(entry.transitData) &&
            entry.transitData.length > 0
        ) {
            const transitParts = entry.transitData.map((t) => {
                const date = new Date(t.date);
                const formattedDate = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
                return `${t.city} - ${formattedDate}`;
            });

            parts.push(`${formattedKey} -> ${transitParts.join(' | ')}`);
        }
        // For others, just use deliveryDateTime
        else if (entry.deliveryDateTime) {
            const date = new Date(entry.deliveryDateTime);
            const formattedDate = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
            parts.push(`${formattedKey} -> ${formattedDate}`);
        }
    }

    return parts.join(' -> ');
}



const states = (req, res) => {
    res.json(Object.keys(statesCities));
};

const cities = (req, res) => {
    const state = req.query.state;
    res.json(statesCities[state] || []);
};

function parseTracking(input) {
    const deliveryStatus = {
        1: { key: 'pickup', status: 0, deliveryDateTime: '' },
        2: { key: 'intransit', status: 0, deliveryDateTime: '', transitData: [] },
        3: { key: 'outdelivery', status: 0, deliveryDateTime: '' },
        4: { key: 'delivered', status: 0, deliveryDateTime: '' },
        5: { key: 'cancelled', status: 0, deliveryDateTime: '' },
        6: { key: 'hold', status: 0, deliveryDateTime: '' }
    };

    const keyToIndex = {
        pickup: 1,
        intransit: 2,
        outdelivery: 3,
        delivered: 4,
        cancelled: 5,
        hold: 6
    };

    const parts = input.split('->').map(p => p.trim());
    let i = 0;

    while (i < parts.length) {
        const key = parts[i].toLowerCase();
        const value = parts[i + 1] ? parts[i + 1].trim() : '';

        if (keyToIndex[key]) {
            const index = keyToIndex[key];
            deliveryStatus[index].status = 1;

            if (key === 'intransit') {
                const transitPoints = value.split('|').map(item => {
                    const [location, date] = item.split(':').map(s => s.trim());
                    return { location, date };
                });
                deliveryStatus[index].transitData = transitPoints;
            } else {
                deliveryStatus[index].deliveryDateTime = value;
            }
            i += 2;
        } else {
            i++;
        }
    }

    return deliveryStatus;
}


function trackingStatusToString(deliveryStatus) {
    const statusMap = {
        1: 'Pickup',
        2: 'Intransit',
        3: 'outdelivery',
        4: 'delivered',
        5: 'cancelled',
        6: 'hold'
    };

    let parts = [];

    for (const key in deliveryStatus) {
        const entry = deliveryStatus[key];
        if (entry.status === 1) {
            const statusLabel = statusMap[key];
            if (key === "2" && Array.isArray(entry.transitData) && entry.transitData.length > 0) {
                const transitStr = entry.transitData.map(t => `${t.city} : ${t.date}`).join(' | ');
                parts.push(`${statusLabel} -> ${transitStr}`);
            } else {
                parts.push(`${statusLabel} -> ${entry.deliveryDateTime}`);
            }
        }
    }

    return parts.join(' -> ');
}

// Optional: format status from int to label
function formatTrackingStatus(status) {
    const mapping = {
        1: 'Pickup',
        2: 'InTransit',
        3: 'OutForDelivery',
        4: 'Delivered',
        5: 'Cancelled',
        6: 'Hold'
    };
    return mapping[status] || '';
}

// const downloadTrackingCsv = async (req, res) => {
//     try {
//         const { trackingCode, status, date } = req.query;
//         let query = {};

//         if (trackingCode) {
//             query.trackingId = new RegExp(trackingCode, 'i');
//         }

//         if (status) {
//             query.status = parseInt(status);
//         }

//         if (date) {
//             const startDate = moment(date, 'DD-MM-YYYY').startOf('day');
//             const endDate = moment(date, 'DD-MM-YYYY').endOf('day');
//             query.estimateDate = {
//                 $gte: startDate.toDate(),
//                 $lte: endDate.toDate()
//             };
//         }

//         const trackings = await Tracking.find(query).sort({ createdAt: -1 });

//         if (trackings.length === 0) {
//             return res.status(200).send("No tracking data found for the current filters.");
//         }

//         const csvHeaders = [
//             "trackingId",
//             "pickUpLocation",
//             "dropLocation",
//             "transportMode",
//             "status",
//             "deliveryDate",
//             "consignerName",
//             "estimateDate",
//             "currentLocation",
//             "pod",
//             "invoiceDate",
//             "connectionDate",
//             "consigneeName",
//             "mobile",
//             "consignorPincode",
//             "referenceNo",
//             "invoiceNumber",
//             "invoiceValue",
//             "boxes",
//             "ewayBillNo",
//             "connectionPartner",
//             "partnerCnNumber",
//             "actualWeight",
//             "chargedWeight",
//             "tat",
//             "add",
//             "remarks",
//             "trackingStatus"
//         ];

//         const csvData = trackings.map(tracking =>
//             csvHeaders.map(key => {
//                 let value = tracking[key];

//                 if (key === 'trackingStatus') {
//                     return trackingStatusToString(tracking.deliveryStatus || {});
//                 }

//                 if (key === 'status') {
//                     return formatTrackingStatus(tracking.status);
//                 }

//                 if (value instanceof Date) {
//                     return moment(value).format('DD-MM-YYYY');
//                 }

//                 if (value === undefined || value === null) {
//                     return '';
//                 }

//                 return String(value).replace(/"/g, '""'); // escape quotes
//             })
//         );

//         const csvRows = [csvHeaders, ...csvData].map(row =>
//             row.map(val => `"${val}"`).join(',')
//         ).join('\n');

//         res.setHeader('Content-Type', 'text/csv');
//         res.setHeader('Content-Disposition', 'attachment; filename="tracking_data.csv"');
//         res.status(200).send(csvRows);

//     } catch (error) {
//         console.error('Error downloading tracking CSV:', error);
//         res.status(500).send("Error generating CSV file.");
//     }
// };

// Fix double-dash and trim
function cleanDate(dateStr) {
    return (dateStr || '').replace(/--+/g, '-').trim();
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const clean = cleanDate(dateStr);
    const m = moment(clean, ['DD-MM-YYYY', 'YYYY-MM-DD'], true);
    return m.isValid() ? m.toDate() : '';
}

function statusMapping(status) {
    switch (status) {
        case 'Pickup': return 1;
        case 'InTransit':
        case 'InTransit': return 2;
        case 'OutForDelivery':
        case 'OutForDelivery': return 3;
        case 'Delivered': return 4;
        case 'Cancelled': return 5;
        case 'Hold': return 6;
        default: return 0;
    }
}

const defaultDeliveryStatus = [
    {}, // index 0 unused
    { type: 'Pickup', status: 0, deliveryDateTime: '' },
    { type: 'InTransit', status: 0, transitData: [] },
    { type: 'OutForDelivery', status: 0, deliveryDateTime: '' },
    { type: 'Delivered', status: 0, deliveryDateTime: '', pod: '' },
    { type: 'Cancelled', status: 0, deliveryDateTime: '' },
    { type: 'Hold', status: 0, deliveryDateTime: '' },
];

// Clean InTransit/Delivery-like tracking path
function parseTrackingPhases(row) {
    const deliveryStatus = structuredClone(defaultDeliveryStatus);
    const statusFields = ['Pickup', 'InTransit', 'OutForDelivery', 'Delivered', 'Cancelled'];

    statusFields.forEach((field, index) => {
        let value = row[field] ? decodeMimeUtf7String(row[field].replace(/['"]+/g, '').trim()) : '';
        if (value) {
            deliveryStatus[index + 1].status = 1;

            if (field.toLowerCase() === 'intransit') {
                deliveryStatus[index + 1].transitData = value.split('/').map(item => {
                    const [city, date] = item.split(':').map(s => decodeMimeUtf7String(s.trim()));
                    return { city, date: formatDate(date) };
                });
            } else {
                deliveryStatus[index + 1].deliveryDateTime = formatDate(value);
            }

            if (field === 'Delivered') {
                deliveryStatus[4].pod = row.pod || '';
            }
        }
    });

    return deliveryStatus;
}


// function decodeMimeUtf7String(str) {
//     if (!str) return '';

//     return str
//         .replace(/\+AC0-/g, '-')  // dash
//         .replace(/\+ACI-/g, '"')  // double quote
//         .replace(/\+AF8-/g, '_')  // underscore
//         .replace(/\+ADs-/g, ';')  // semicolon
//         .replace(/\+AC4-/g, '.')  // dot
//         .replace(/\+AC8-/g, '/')  // slash
//         .replace(/\+ACc-/g, "'")  // single quote
//         .replace(/\+ADw-/g, '<')  // less-than
//         .replace(/\+AD4-/g, '>')  // greater-than
//         .replace(/\+ACY-/g, '&')  // ampersand
//         .replace(/"+/g, '')       // remove quotes
//         .trim();
// }
const UploadCsv = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

        const results = [];
        const duplicates = [];
        const saved = [];

        const areEqual = (a, b) => {
            if (a == null && b == null) return true;
            if (typeof a === 'number' || typeof b === 'number') return Number(a) === Number(b);
            return String(a || '').trim() === String(b || '').trim();
        };

        fs.createReadStream(req.file.path)
            .pipe(iconv.decodeStream('utf8'))
            .pipe(csv({ relax_column_count: true, skip_lines_with_empty_values: false }))
            .on('data', (row) => {
                if (!row.trackingId || isNaN(row.trackingId.trim())) return;

                const cleanedRow = {};
                for (const key in row) {
                    let value = row[key];
                    if (typeof value === 'string') {
                        value = decodeMimeUtf7String(value);
                        cleanedRow[key.trim()] = value.trim();
                    } else {
                        cleanedRow[key.trim()] = value;
                    }
                }
                results.push(cleanedRow);
            })
            .on('end', async () => {
                for (const row of results) {
                    try {
                        const trimmedTrackingId = row.trackingId.trim();
                        const existing = await Tracking.findOne({ trackingId: trimmedTrackingId });

                        // Format dates
                        const formattedDates = {
                            deliveryDate: formatDate(row.deliveryDate),
                            estimateDate: formatDate(row.estimateDate),
                            invoiceDate: formatDate(row.invoiceDate),
                            connectionDate: formatDate(row.connectionDate)
                        };

                        // Delivery status from row
                        const deliveryStatus = parseTrackingPhases(row);
                        checkAndInsertCity(row.pickUpLocation)
                        checkAndInsertCity(row.dropLocation)

                        // Fields for comparison and saving
                        const fieldsToCompare = {
                            pickUpLocation: row.pickUpLocation,
                            dropLocation: row.dropLocation,
                            transportMode: row.transportMode,
                            status: statusMapping(row.status),
                            consignerName: row.consignerName,
                            currentLocation: row.currentLocation,
                            consigneeName: row.consigneeName,
                            mobile: row.mobile,
                            consignorPincode: row.consignorPincode,
                            referenceNo: row.referenceNo,
                            invoiceNumber: row.invoiceNumber,
                            invoiceValue: row.invoiceValue,
                            boxes: row.boxes,
                            ewayBillNo: row.ewayBillNo,
                            connectionPartner: row.connectionPartner,
                            partnerCnNumber: row.partnerCnNumber,
                            actualWeight: row.actualWeight,
                            chargedWeight: row.chargedWeight,
                            tat: row.tat,
                            add: row.add,
                            remarks: row.remarks,
                            pod: row.pod || ''
                        };

                        if (existing) {
                            const updateFields = {};
                            const updatedFieldsList = [];

                            // Compare non-date fields
                            for (const field in fieldsToCompare) {
                                if (!areEqual(existing[field], fieldsToCompare[field])) {
                                    updateFields[field] = fieldsToCompare[field];
                                    updatedFieldsList.push(field);
                                }
                            }

                            // Compare date fields
                            for (const dateField in formattedDates) {
                                const newVal = formattedDates[dateField]; // Date object or null
                                const oldVal = existing[dateField] ? moment(existing[dateField]).format('DD-MM-YYYY') : null;

                                if (newVal) {
                                    const formattedNewVal = moment(newVal).format('DD-MM-YYYY');
                                    if (oldVal !== formattedNewVal) {
                                        updateFields[dateField] = newVal;
                                        updatedFieldsList.push(dateField);
                                    }
                                } else {
                                    // Clear existing date if it's now blank
                                    if (existing[dateField]) {
                                        updateFields[dateField] = null;
                                        updatedFieldsList.push(dateField);
                                    }
                                }
                            }

                            // Compare deliveryStatus
                            if (JSON.stringify(existing.deliveryStatus || {}) !== JSON.stringify(deliveryStatus)) {
                                updateFields.deliveryStatus = deliveryStatus;
                                updatedFieldsList.push('deliveryStatus');
                            }

                            if (Object.keys(updateFields).length > 0) {
                                await Tracking.updateOne({ trackingId: trimmedTrackingId }, { $set: updateFields });
                                duplicates.push({
                                    trackingId: trimmedTrackingId,
                                    reason: 'Updated existing record',
                                    updatedFields: updatedFieldsList
                                });
                                await generateLogs(req, 'Update', updateFields);

                                console.log(`✅ Updated trackingId ${trimmedTrackingId}:`, updatedFieldsList);
                            } else {
                                duplicates.push({ trackingId: trimmedTrackingId, reason: 'Already exists with same data' });
                            }
                        } else {
                            // Save new
                            const newTracking = new Tracking({
                                trackingId: trimmedTrackingId,
                                ...fieldsToCompare,
                                deliveryDate: formattedDates.deliveryDate || null,
                                estimateDate: formattedDates.estimateDate || null,
                                invoiceDate: formattedDates.invoiceDate || null,
                                connectionDate: formattedDates.connectionDate || null,
                                deliveryStatus
                            });

                            await newTracking.save();
                            saved.push(trimmedTrackingId);
                            await generateLogs(req, 'ADD', newTracking);

                        }

                    } catch (err) {
                        console.error(`❌ Error saving trackingId ${row.trackingId || 'Unknown'}:`, err.message);
                        duplicates.push({ trackingId: row.trackingId || 'Unknown', reason: err.message });
                    }
                }

                res.status(200).json({
                    success: true,
                    message: "CSV uploaded and processed.",
                    savedCount: saved.length,
                    duplicateCount: duplicates.length,
                    duplicates
                });
            })
            .on('error', (err) => {
                console.error("CSV parse error:", err.message);
                res.status(500).json({ success: false, message: 'CSV file processing error' });
            });

    } catch (err) {
        console.error("UploadCsv error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

function decodeMimeDate(str) {
    if (!str) return '';
    return str
        .replace(/\+AC0-/g, '-') // decode +AC0- as -
        .replace(/"+/g, '')      // remove quotes
        .trim();
}

// function formatDate(dateStr) {
//     if (!dateStr) return null;

//     const decoded = decodeMimeDate(dateStr);
//     const cleaned = decoded.replace(/--+/g, '-'); // fallback if double hyphens

//     const parsed = moment(cleaned, 'DD-MM-YYYY', true);
//     return parsed.isValid() ? parsed.toDate() : null;
// }
function formatDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') return null;

    const decoded = decodeMimeDate(dateStr.trim());
    if (!decoded) return null;

    const cleaned = decoded.replace(/--+/g, '-').trim();
    const parsed = moment(cleaned, ['DD-MM-YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY'], true);
    return parsed.isValid() ? parsed.toDate() : null;
}


const downloadTrackingCsv = async (req, res) => {
    try {
        const { trackingCode, status, date } = req.query;
        let query = {};

        if (trackingCode) {
            query.trackingId = new RegExp(trackingCode, 'i');
        }

        if (status) {
            query.status = parseInt(status);
        }

        if (date) {
            const startDate = moment(date, 'DD-MM-YYYY').startOf('day');
            const endDate = moment(date, 'DD-MM-YYYY').endOf('day');
            query.estimateDate = {
                $gte: startDate.toDate(),
                $lte: endDate.toDate()
            };
        }

        const trackings = await Tracking.find(query).sort({ createdAt: -1 });

        if (trackings.length === 0) {
            return res.status(200).send("No tracking data found for the current filters.");
        }

        const csvHeaders = [
            "trackingId", "pickUpLocation", "dropLocation", "transportMode", "status", "deliveryDate",
            "consignerName", "estimateDate", "currentLocation", "pod", "invoiceDate", "connectionDate",
            "consigneeName", "mobile", "consignorPincode", "referenceNo", "invoiceNumber", "invoiceValue",
            "boxes", "ewayBillNo", "connectionPartner", "partnerCnNumber", "actualWeight", "chargedWeight",
            "tat", "add", "remarks",
            "Pickup", "InTransit", "OutForDelivery", "Delivered", "Cancelled"
        ];

        const csvData = trackings.map(tracking => {
            const row = [];

            csvHeaders.forEach(key => {
                let value = tracking[key];

                // Handle delivery phases (Pickup, InTransit, etc.)
                if (["Pickup", "InTransit", "OutForDelivery", "Delivered", "Cancelled"].includes(key)) {
                    let deliveryStatus = tracking.deliveryStatus;
                    if (typeof deliveryStatus === 'string') {
                        try {
                            deliveryStatus = JSON.parse(deliveryStatus);
                        } catch (e) {
                            deliveryStatus = [];
                        }
                    }

                    const phase = Array.isArray(deliveryStatus)
                        ? deliveryStatus.find(p => p.type === key) || {}
                        : {};

                    if (key === 'InTransit' && phase.transitData) {
                        value = phase.transitData.map(t => `${t.city} : ${moment(t.date).format('DD-MM-YYYY')}`).join(' / ');
                    } else {
                        value = phase.deliveryDateTime ? moment(phase.deliveryDateTime).format('DD-MM-YYYY') : '';
                    }

                } else if (key === 'status') {
                    value = formatTrackingStatus(tracking.status);
                } else if (value instanceof Date) {
                    value = moment(value).format('DD-MM-YYYY');
                } else if (value === undefined || value === null) {
                    value = '';
                }

                row.push(`"${String(value).replace(/"/g, '""')}"`);
            });

            return row.join(',');
        });

        const csvContent = [
            csvHeaders.map(h => `"${h}"`).join(','),
            ...csvData
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="tracking_data.csv"');
        res.status(200).send(csvContent);

    } catch (error) {
        console.error('Error downloading tracking CSV:', error);
        res.status(500).send("Error generating CSV file.");
    }
};



module.exports = {
    trackingPage,
    trackingList,
    addTracking,
    getTrackingById,
    updateTracking,
    deleteTracking,
    downloadTrackingCsv,
    UploadCsv, states, cities
};