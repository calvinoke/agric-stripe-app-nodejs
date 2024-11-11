const express = require('express');
const Product = require('../models/Product');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { authenticate, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');  // Specify the folder to save images
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname); // Unique file name
    }
});

const upload = multer({ storage });

// Customer: Fetch all products
router.get('/products', authenticate, async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Customer: Fetch a single product by ID
router.get('/products/:id', authenticate, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Create a product
router.post('/products', authenticate, isAdmin, upload.single('image'), (req, res) => {
    const { name, price, description } = req.body;
    const image = req.file ? req.file.filename : null;

    const newProduct = new Product({
        name,
        price,
        description,
        image // Save the image file path
    });

    newProduct.save()
        .then(product => res.json(product))
        .catch(err => res.status(400).json('Error: ' + err));
});

// Admin: Update a product by ID, with image upload
router.put('/products/:id', authenticate, isAdmin, upload.single('image'), async (req, res) => {
    try {
        const { name, price, description } = req.body;
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // If a new image is uploaded, delete the old image file from the server
        if (req.file) {
            const oldImagePath = path.join(__dirname, '../uploads/', product.image);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath); // Remove the old image
            }
            product.image = req.file.filename; // Update to the new image
        }

        // Update other fields
        product.name = name;
        product.price = price;
        product.description = description;

        const updatedProduct = await product.save();
        res.json(updatedProduct);

    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Admin: Delete a product by ID and remove the associated image
router.delete('/products/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Delete the product's image from the server
        const imagePath = path.join(__dirname, '../uploads/', product.image);
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath); // Remove the image file
        }

        await product.remove();
        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
