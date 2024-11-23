const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const nodemailer = require('nodemailer');
require('dotenv').config();

const router = express.Router();

// Simple in-memory token blacklist (use a database in production)
const tokenBlacklist = new Set();


// Setup nodemailer transport
const transporter = nodemailer.createTransport({
    service: 'Gmail', // Replace with your email service provider
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});


router.post('/register', async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        // Check if the email is already registered
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email is already registered' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user
        const newUser = new User({ username, email, password: hashedPassword, role });
        const result = await newUser.save();

        // Generate a JWT token
        const token = jwt.sign(
            { id: result._id, email: result.email, role: result.role },
            process.env.JWT_SECRET, // Use an environment variable for the secret key
            { expiresIn: '1h' } // Token expiration time
        );

        // Respond with user details and token
        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: result._id,
                username: result.username,
                email: result.email,
                role: result.role,
            },
            token,
        });
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ message: 'An error occurred during registration', error });
    }
});


// Login route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
});

// Middleware to check if the token is blacklisted
const isTokenBlacklisted = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (token && tokenBlacklist.has(token)) {
        return res.status(401).json({ message: 'Token is invalidated' });
    }
    next();
};


// Protect routes with token verification
router.use(isTokenBlacklisted);

// Middleware to verify if the user is an admin
const isAdmin = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Unauthorized' });
        if (decoded.role !== 'admin') return res.status(403).json({ message: 'Forbidden, Admin access only' });
        next();
    });
};

// Get all users with roles (admin only)
router.get('/users', isAdmin, async (req, res) => {
    try {
        const users = await User.find({}, 'username email role'); // Fetch users with selected fields
        res.json({ users });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users' });
    }
});


// Update user endpoint (admin only)
router.put('/users/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    const { username, email, role } = req.body;

    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.username = username || user.username;
        user.email = email || user.email;
        user.role = role || user.role;
        
        await user.save();
        res.json({ message: 'User updated successfully', user });
    } catch (error) {
        res.status(500).json({ message: 'Error updating user' });
    }
});


// Delete user endpoint (admin only)
router.delete('/users/:id', isAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await user.remove();
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user' });
    }
});


// Logout route
router.post('/logout', (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (token) {
        tokenBlacklist.add(token);
        return res.json({ message: 'User logged out successfully' });
    }
    res.status(400).json({ message: 'No token provided' });
});


// Forgot Password route
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    try {
        await transporter.sendMail({
            to: email,
            subject: 'Password Reset',
            text: `You requested a password reset. Click the link to reset your password: ${resetLink}`,
        });
        res.json({ message: 'Password reset link sent to your email' });
    } catch (error) {
        res.status(500).json({ message: 'Error sending email' });
    }
});

// Reset Password route
router.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.json({ message: 'Password has been reset successfully' });
    } catch (error) {
        res.status(400).json({ message: 'Invalid or expired token' });
    }
});


router.post('/validate-token', (req, res) => {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            valid: false,
            message: 'Authorization header missing or malformed',
        });
    }

    const token = authHeader.split(' ')[1]; // Extract token

    // Verify the token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({
                valid: false,
                message: 'Token is expired or invalid',
            });
        }

        // Return success response with limited user details
        const { id, email, role } = decoded;
        return res.status(200).json({
            valid: true,
            user: { id, email, role },
        });
    });
});




module.exports = router;
