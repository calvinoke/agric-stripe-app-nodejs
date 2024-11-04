const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const ngrok = require('ngrok');

// Import routes
const authRoutes = require('./Routes/auth');
const productRoutes = require('./Routes/products');
const paymentRoutes = require('./Routes/Payments');

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
require('./config/db');

// Use routes
app.use('/api', authRoutes);
app.use('/api', productRoutes);
app.use('/api', paymentRoutes);

// Start HTTP server and tunnel with ngrok
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`HTTP Server is running on http://0.0.0.0:${PORT}`);
  
  try {
    const url = await ngrok.connect(PORT);
    console.log(`Ngrok tunnel established at: ${url}`);
  } catch (error) {
    console.error('Error starting ngrok:', error);
  }
});
