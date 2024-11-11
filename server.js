const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

// Connect to MongoDB
require('./config/db');

// Use routes
app.use('/api', require('./api/auth'));
app.use('/api', require('./api/products'));
app.use('/api', require('./api/Payments'));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
