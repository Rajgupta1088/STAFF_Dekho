const Subscription = require('../../models/subscription/subscriptionModel');
const moment = require('moment');
const { generateLogs } = require('../../utils/logsHelper');

// Render the Subscription management page
const subscriptionPage = (req, res) => {
    res.render('pages/subscription/subscriptionManagement');
};

// Fetch list of subscription (for DataTable)
const subscriptionList = async (req, res) => {
    try {
        const { start, length, search, order } = req.body;
        const searchValue = search?.value;
        let query = {};
        let sort = {};

        // Custom search filters
        const titleSearch = req.body.title;
        const statusSearch = req.body.status;
        const createdAtSearch = req.body.createdAt;

        if (searchValue) {
            query.$or = [
                { title: new RegExp(searchValue, 'i') },
                { description: new RegExp(searchValue, 'i') }
            ];
        } else {
            if (titleSearch) query.title = new RegExp(titleSearch, 'i');
            if (statusSearch) query.status = statusSearch;
            if (createdAtSearch) {
                const startDate = moment(createdAtSearch).startOf('day');
                const endDate = moment(createdAtSearch).endOf('day');
                query.createdAt = { $gte: startDate.toDate(), $lte: endDate.toDate() };
            }
        }

        // Sorting
        if (order && order.length > 0) {
            const columnIndex = order[0].column;
            const sortDirection = order[0].dir === 'asc' ? 1 : -1;
            switch (parseInt(columnIndex)) {
                case 1: sort.title = sortDirection; break;
                case 3: sort.status = sortDirection; break;
                case 4: sort.createdAt = sortDirection; break;
                default: sort.createdAt = -1; break;
            }
        } else {
            sort.createdAt = -1;
        }

        const subscription = await Subscription.find(query).skip(Number(start)).limit(Number(length)).sort(sort);
        const totalRecords = await Subscription.countDocuments();
        const filteredRecords = await Subscription.countDocuments(query);

        res.json({
            draw: req.body.draw,
            recordsTotal: totalRecords,
            recordsFiltered: filteredRecords,
            data: subscription
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create FAQ
const createSubscription = async (req, res) => {
    try {
        const { title, actualPrice, estimatePrice, planValidity, discount, status, subscriptionType, features } = req.body;

        if (!title || !actualPrice || !estimatePrice || !planValidity || !discount || !status || !subscriptionType || !features) {
            return res.status(400).json({ error: "Title, actualPrice, estimatePrice , planValidity , discount , status , subscriptionType and features are required" });
        }

        const saveSubs = new Subscription({ title, actualPrice, estimatePrice, planValidity, discount, status, subscriptionType, features });
        await saveSubs.save();
        await generateLogs(req, 'Add', saveSubs);

        res.json({ success: true, message: 'Subscription saved successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get specific FAQ
const getSubscription = async (req, res) => {
    try {
        const subscription = await Subscription.findById(req.params.id);
        if (!subscription) return res.status(404).json({ message: 'Subscription not found' });
        res.json(subscription);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching Subscription', details: error.message });
    }
};

// Update FAQ
const updateSubscription = async (req, res) => {
    try {
        const { title, actualPrice, estimatePrice, planValidity, discount, status, subscriptionType, features } = req.body;

        if (!title || !actualPrice || !estimatePrice || !planValidity || !discount || !status || !subscriptionType || !features) {
            return res.status(400).json({ error: "Title, actualPrice, estimatePrice , planValidity , discount , status , subscriptionType and features are required" });
        }
        const { id } = req.params;



        const updateData = { title, actualPrice, estimatePrice, planValidity, discount, status, subscriptionType, features };
        await Subscription.findByIdAndUpdate(id, updateData);
        await generateLogs(req, 'Edit', updateData);

        res.json({ success: true, message: 'Subscription updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete FAQ
const deleteSubscription = async (req, res) => {
    try {
        const { id } = req.params;
        await Subscription.findByIdAndDelete(id);
        await generateLogs(req, 'Delete', { id: id });

        res.json({ success: true, message: 'Subscription deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Change Status
const changeStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (status === undefined || status === null) {
            return res.status(400).json({ error: 'Status value is required' });
        }

        const subscriptionData = await Subscription.findByIdAndUpdate(id, { status }, { new: true });

        if (!subscriptionData) {
            return res.status(404).json({ success: false, message: 'Subscription not found.' });
        }

        res.json({ success: true, message: 'Subscription status updated successfully', data: subscriptionData });
    } catch (error) {
        if (error.code === 11000)
            res.json({ success: false, message: 'Duplicate Value Found' });
        else
            res.status(500).json({ message: error.message });
    }
};

module.exports = {
    subscriptionPage,
    subscriptionList,
    createSubscription,
    getSubscription,
    updateSubscription,
    deleteSubscription,
    changeStatus
};
