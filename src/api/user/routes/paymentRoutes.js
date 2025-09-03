
const express = require('express');
const router = express.Router();

const { addPaymentDetail, verifyPayment, estimatePriceCalculation, ftlOrderInitiate, ftlVerifyPayment, biddingDetail, acceptingRequest, ftlIntiatePayment, ftlFinalPayment, addTwoWheeler } = require('../controllers/paymentController')

router.post('/initiatePayment', addPaymentDetail);
router.post('/verifyPayment', verifyPayment);
router.post('/estimatePrice', estimatePriceCalculation);
router.post('/ftlOrderInitiate', ftlOrderInitiate);
router.post('/ftlVerifyPayment', ftlVerifyPayment);
router.post('/biddingDetail', biddingDetail);
router.post('/acceptBidding', acceptingRequest);
router.post('/ftlIntiatePayment', ftlIntiatePayment);
router.post('/ftlFinalPayment', ftlFinalPayment);
router.post('/twoWheelerOrderInitiate', addTwoWheeler);

module.exports = router;
