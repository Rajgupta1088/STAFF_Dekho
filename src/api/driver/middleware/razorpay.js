const Wallet = require('../../user/models/walletModal');

const walletAuthentication = async (req, res, next) => {
    const driverId = req.headers['driverid'];

    let wallet = await Wallet.findOne({ driverId: driverId });
    if (!wallet) {
        wallet = await Wallet.create({ driverId: driverId });
    }
    req.wallet = wallet;
    next();
};

module.exports = { walletAuthentication }