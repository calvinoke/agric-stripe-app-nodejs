const express = require('express');
const { authenticate, isAdmin } = require('../middleware/auth');// Import the auth middleware
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Import Stripe and configure it with your secret key
const router = express.Router();
require('dotenv').config();

// Create Stripe Payment Intent - Protected route
router.post('/create-payment-intent', authenticate, async (req, res) => {
    const { amount } = req.body;

    // Check if the user is a customer
    if (req.user.role !== 'customer') {
        return res.status(403).json({ message: 'Only customers can make payments' });
    }

    try {
        // Create a PaymentIntent with the specified amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount, // Expect the amount to be in cents (e.g., 10 USD = 1000 cents)
            currency: 'usd',
            payment_method_types: ['card'], // Specify allowed payment methods
        });

        // Send the client secret to the frontend
        res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({ error: error.message });
    }
});

// Example of webhook route (optional) to handle Stripe webhooks (e.g., for successful payments)
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.log(`⚠️  Webhook signature verification failed.`, err.message);
        return res.sendStatus(400);
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
            break;
        case 'payment_method.attached':
            const paymentMethod = event.data.object;
            console.log(`PaymentMethod was attached to a customer!`);
            break;
        // ... handle other event types
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    // Return a response to acknowledge receipt of the event
    res.json({ received: true });
});

module.exports = router;
