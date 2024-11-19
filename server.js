const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Dynamic CORS configuration based on environment
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*', // Allow all origins during development
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

// MongoDB Connection
require('./config/db');

// API Routes
app.use('/api', require('./api/auth'));
app.use('/api', require('./api/products'));
app.use('/api', require('./api/Payments'));

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// OPTIONAL: Enable mobile access using the local IP address
// Uncomment this block to log the local IP address (useful for mobile devices)
/*
const getLocalIPAddress = () => {
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];
    for (const iface of interfaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
};

app.listen(PORT, () => {
  const ip = getLocalIPAddress();
  console.log(`Server running on http://${ip}:${PORT}`);
});
*/
