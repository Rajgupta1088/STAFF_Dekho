const express = require('express');
const router = express.Router();
const SubscriptionCtrl = require('../../controllers/subscription/subscriptionController');
const { checkCrudPermission } = require('../../middleware/permission/checkCrudPermission');

router.get('/subscriptionManagement', checkCrudPermission(), SubscriptionCtrl.subscriptionPage);
router.post('/subscriptionList', checkCrudPermission('isShow'), SubscriptionCtrl.subscriptionList);
router.post('/createSubscription', checkCrudPermission('add'), SubscriptionCtrl.createSubscription);
router.get('/getSubscription/:id', checkCrudPermission('edit'), SubscriptionCtrl.getSubscription);
router.post('/updateSubscription/:id', checkCrudPermission('edit'), SubscriptionCtrl.updateSubscription);
router.delete('/deleteSubscription/:id', checkCrudPermission('delete'), SubscriptionCtrl.deleteSubscription);
router.post('/changeStatus/:id', checkCrudPermission('edit'), SubscriptionCtrl.changeStatus);

module.exports = router;
