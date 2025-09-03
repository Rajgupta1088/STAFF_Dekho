const Logs = require('../../models/logs/logsManagementModal');


const logPage = (req, res) => {
    res.render('pages/logs/logsManagement');
};

const logsList = async (req, res) => {
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

        const logsDetail = await Logs.find(query).skip(Number(start)).limit(Number(length)).sort(sort);
        const totalRecords = await Logs.countDocuments();
        const filteredRecords = await Logs.countDocuments(query);

        res.json({
            draw: req.body.draw,
            recordsTotal: totalRecords,
            recordsFiltered: filteredRecords,
            data: logsDetail
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
module.exports = { logPage, logsList }