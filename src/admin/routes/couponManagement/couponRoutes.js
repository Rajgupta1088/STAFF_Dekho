const express = require('express');
const router = express.Router();

const { coupon, createCoupon, updateCoupon, deleteCoupon, getCoupans, updateCouponStatus, getCouponById } = require('../../controllers/couponManagement/couponController');

router.get('/couponManagement', coupon);
router.post('/createCoupon', createCoupon);
router.post('/allCoupons', getCoupans);
router.patch('/updateCoupon/:id', updateCoupon);
router.get('/getCoupon/:id', getCouponById);
router.patch('/updateCoupanStatus/:id', updateCouponStatus);
router.delete('/deleteCoupon/:id', deleteCoupon);

module.exports = router;