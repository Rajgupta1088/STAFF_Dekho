const Notification = require('../../driver/modals/notificationModal');


const getNotification = async (req, res) => {

    try {
        const userId = req.header('userid');

        const notificationDetail = await Notification.find({ recipientId: userId, recipientType: 'user' }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: notificationDetail,
            message: notificationDetail.length > 0 ? 'Notification Fetch Successfully' : 'No Notification Found'
        });

    } catch (err) {
        console.error('Error fetching Notification data:', err);
        res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
};
module.exports = { getNotification }