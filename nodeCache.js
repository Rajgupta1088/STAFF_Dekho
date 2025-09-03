const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 60 }); // Cache valid for 60 seconds

const trackedKeys = new Map(); // Map base path -> list of full URL keys

const getBasePath = (url) => {
    const [path] = url.split('?'); // ignore query params
    return path.split('/').filter(Boolean).slice(0, 3).join('/'); // e.g. 'api/products'
};

const cacheMiddleware = (req, res, next) => {
    const method = req.method;
    const url = req.originalUrl || req.url;

    const key = '__express__' + url;

    const basePath = getBasePath(url);

    // ⚠️ Invalidate cache for mutations
    if (['POST', 'PUT', 'DELETE'].includes(method)) {
        const keys = trackedKeys.get(basePath) || [];
        keys.forEach(k => {
            cache.del(k);
            console.log(`Cache invalidated: ${k}`);
        });
        trackedKeys.delete(basePath);
        return next();
    }

    // ❌ Only cache GET requests
    if (method !== 'GET') return next();

    // ❌ Skip caching for logged-in admins (optional)
    if (req.session && req.session.admin) return next();

    const cachedData = cache.get(key);
    if (cachedData) {
        console.log(`Cache hit: ${key}`);
        return res.send(cachedData);
    }

    // 🧠 Cache the output from send/json
    const originalSend = res.send.bind(res);
    res.send = (body) => {
        console.log(`Caching: ${key}`);
        cache.set(key, body);

        const keys = trackedKeys.get(basePath) || [];
        if (!keys.includes(key)) {
            trackedKeys.set(basePath, [...keys, key]);
        }

        return originalSend(body);
    };

    next();
};

module.exports = { cacheMiddleware };
