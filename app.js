const express = require('express');
const session = require('express-session');
const path = require('path');
const http = require('http'); // For socket integration
const { Server } = require('socket.io'); // Socket.IO server
const connectDB = require('./config/db');
const indexRoutes = require('./src/admin/routes/indexRoutes');
const apiRoutes = require('./apiRoutes');
const expressLayouts = require('express-ejs-layouts');
const { setGlobalPermissions } = require('./src/admin/middleware/login/checkPermission');
const compression = require('compression');
const app = express();
const server = http.createServer(app); // create HTTP server
const morgan = require('morgan');
// const cors = require("cors");

const responseTime = require('response-time');
const { cacheMiddleware } = require('./nodeCache');
app.use('/api/banner', cacheMiddleware); // apply to hot APIs only


const io = new Server(server, {
    cors: {
        origin: "*", // Set this to your frontend domain in production
        methods: ["GET", "POST"]
    }
});

// Global access to io (optional)
global.io = io;

// Connect to DB
connectDB();

// Middleware
// app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(compression());

app.use(morgan('dev'));
app.use(responseTime());
// app.use(cacheMiddleware); // ✅ Correct usage — do not use ()


app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { maxAge: 24000 * 60 * 1000 }
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
// app.use('/vendor', vendorRoutes);
app.use('/api', apiRoutes);
app.use('/', indexRoutes);

// ✅ Socket.IO Events
io.on('connection', (socket) => {
    console.log(`✅ Socket connected: ${socket.id}`);

    // Example event: send a welcome message
    socket.emit('welcome', { message: 'Real-time socket connected.' });

    // Example: respond to ping
    socket.on('ping', (data) => {
        console.log('📩 Ping received:', data);
        socket.emit('pong', { message: 'Pong at ' + new Date().toISOString() });
    });

    socket.on('disconnect', () => {
        console.log(`❌ Socket disconnected: ${socket.id}`);
    });
});

// Server Listen
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
