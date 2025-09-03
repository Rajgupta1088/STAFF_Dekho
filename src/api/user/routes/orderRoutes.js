
const express = require('express');
const router = express.Router();

const { getOrderList, singleOrderDetail, ftlOrderCancel, ftlOrderList, ftlSingleOrderDetail, ptlOrderCancel, twoWheelerOrderCancel } = require('../controllers/orderController')

router.get('/myOrder', getOrderList);
router.post('/orderDetail', singleOrderDetail);
router.post('/ptlOrderCancel', ptlOrderCancel);

router.post('/ftlCancelOrder', ftlOrderCancel);
router.get('/ftlOrderList', ftlOrderList);
router.post('/ftlSingleOrderDetail', ftlSingleOrderDetail);

router.post('/twoWheelerCancelOrder', twoWheelerOrderCancel);

module.exports = router;

