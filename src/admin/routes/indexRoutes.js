const express = require('express');
const router = express.Router();

const loginRoutes = require('../routes/login/loginRoutes'); // Ensure correct path
const dashboardRoutes = require('../routes/dashboard/dashboardRoutes'); // Ensure correct path
const rolesRoutes = require('../routes/rolesManagement/rolesRoutes'); // Ensure correct path
const candidateRoutes = require('../routes/candidateManagement/candidateRoutes');

const checkLoggedIn = require('../middleware/login/checkLoggedIn'); // Ensure correct path
const logoutRoutes = require('../routes/login/logoutRoutes'); // Ensure correct path
const faqRoutes = require('../routes/faqManagement/faqRoutes');
const appSettingRoutes = require('../routes/configuration/appSettingRoutes');

const bannerRoutes = require('../routes/websiteManagement/bannerRoutes'); // Ensure correct path
const blogsRoutes = require('../routes/websiteManagement/blogsRoutes'); // Ensure correct path
const contactRoutes = require('../routes/websiteManagement/contactUsRoutes'); // Ensure correct path
const testimonialRoutes = require('../routes/websiteManagement/testimonialRoutes'); 

// Use a base path for login routes

router.use('/login', loginRoutes);
router.get('/logout', logoutRoutes);

router.use(checkLoggedIn);
router.use('/dashboard', dashboardRoutes);
router.use('/roles', rolesRoutes);
router.use('/candidate', candidateRoutes);
router.use('/faq', faqRoutes);
router.use('/configuration', appSettingRoutes);

router.use('/banner', bannerRoutes);
router.use('/blogs', blogsRoutes);
router.use('/contactUs', contactRoutes);
router.use('/testimonial', testimonialRoutes);

module.exports = router;
