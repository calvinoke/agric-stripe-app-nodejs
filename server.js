const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

// Import routes
const authRoutes = require('./api/auth');
const productRoutes = require('./api/products');
const paymentRoutes = require('./api/Payments');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
require('./config/db');

// Use routes
app.use('/api', authRoutes);
app.use('/api', productRoutes);
app.use('/api', paymentRoutes);


//app.get("/", (req, res) => {
//  res.json({ message: "Hello World, from Ethan, Calvin and Sarah and their animals, and house and bussines!"})
//});

// Start HTTP server
app.listen(PORT, () => {
  console.log(`HTTP Server is running on http://0.0.0.0:${PORT}`);
});
