const express = require('express');
const router = express.Router();

const loginRoutes = require('../routes/login/loginRoutes'); // Ensure correct path
const dashboardRoutes = require('../routes/dashboard/dashboardRoutes'); // Ensure correct path
const rolesRoutes = require('../routes/rolesManagement/rolesRoutes'); // Ensure correct path

const checkLoggedIn = require('../middleware/login/checkLoggedIn'); // Ensure correct path
const logoutRoutes = require('../routes/login/logoutRoutes'); // Ensure correct path

// Use a base path for login routes

router.use('/login', loginRoutes);
router.get('/logout', logoutRoutes);

router.use(checkLoggedIn);
router.use('/dashboard', dashboardRoutes);
router.use('/roles', rolesRoutes);

module.exports = router;
