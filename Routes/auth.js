const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const nodemailer = require('nodemailer'); // For sending emails
require('dotenv').config(); // Load environment variables

const router = express.Router();

// Simple in-memory token blacklist (use a database in production)
const tokenBlacklist = new Set();

// Setup nodemailer transport
const transporter = nodemailer.createTransport({
    service: 'Gmail', // Replace with your email service provider
    auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS, // Your email password
    },
});

router.post('/register', async (req, res) => {
    try {
      const { username, email, password, role } = req.body;
  
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email is already registered' });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({ username, email, password: hashedPassword, role });
      const result = await newUser.save();
  
      res.status(201).json({ message: 'User registered successfully', user: result });
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
router.use(isTokenBlacklisted); // Use middleware to check blacklisted tokens

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
    const token = req.headers['authorization']?.split(' ')[1]; // Get token from Authorization header
    if (token) {
        tokenBlacklist.add(token); // Add token to blacklist
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

    // Create a password reset token
    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // Send email with the reset link
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

        // Hash the new password and save
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.json({ message: 'Password has been reset successfully' });
    } catch (error) {
        res.status(400).json({ message: 'Invalid or expired token' });
    }
});

module.exports = router;
