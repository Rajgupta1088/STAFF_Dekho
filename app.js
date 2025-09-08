const express = require('express');
const session = require('express-session');
const path = require('path');
const http = require('http'); // For socket integration
const expressLayouts = require('express-ejs-layouts');
const compression = require('compression');
const morgan = require('morgan');
const responseTime = require('response-time');
require('dotenv').config(); // ✅ Load .env before anything else

const connectDB = require('./config/db');
const indexRoutes = require('./src/admin/routes/indexRoutes');
const { setGlobalPermissions } = require('./src/admin/middleware/login/checkPermission');

const app = express();
const server = http.createServer(app); // create HTTP server

// ✅ Connect to DB (after dotenv is loaded)
connectDB();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(compression());
app.use(morgan('dev'));
app.use(responseTime());

app.use(session({
    secret: process.env.SESSION_SECRET || 'mySuperSecretKey',  // ✅ Fallback secret
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 day
}));

// Global middleware
app.use(setGlobalPermissions);

// View engine setup
app.use(expressLayouts);
app.set('views', path.join(__dirname, 'src/admin', 'views'));
app.set('view engine', 'ejs');
app.set('layout', 'layouts/main');

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Session available to views
app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
});

// Routes
app.use('/', indexRoutes);

// Server Listen
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
