const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to check authentication and extract user role
const authenticate = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id);

    if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
    }

    next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// Middleware to check if the user is an admin
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        return next();
    }
    return res.status(403).json({ message: 'Admin access required' });
};

module.exports = { authenticate, isAdmin };
