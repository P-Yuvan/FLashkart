const express = require('express');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const RfidTag = require('../models/RfidTag');
const { protect } = require('../middleware/auth');
const router = express.Router();

// POST /api/orders/checkout
router.post('/checkout', protect, async (req, res) => {
  try {
    const { paymentMethod = 'UPI' } = req.body;
    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart || cart.items.length === 0)
      return res.status(400).json({ message: 'Cart is empty' });

    const subtotal = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const tax = parseFloat((subtotal * 0.18).toFixed(2));
    const total = parseFloat((subtotal + tax).toFixed(2));

    const order = await Order.create({
      userId: req.user._id,
      items: cart.items,
      subtotal,
      tax,
      total,
      paymentMethod,
      paymentStatus: 'completed',
    });

    // Mark RFID tags as PAID for all purchased products
    const productIds = cart.items.map(i => i.productId);
    const products = await Product.find({ _id: { $in: productIds } });

    const rfidOps = [];
    for (const item of cart.items) {
      const product = products.find(p => p._id.toString() === item.productId.toString());
      if (product && product.rfid) {
        rfidOps.push({
          updateOne: {
            filter: { rfidTagId: product.rfid },
            update: {
              $set: {
                rfidTagId:     product.rfid,
                productId:     product._id,
                productName:   product.name,
                orderId:       order._id,
                paymentStatus: 'PAID',
                paidAt:        new Date(),
              },
            },
            upsert: true,
          },
        });
      }
    }
    if (rfidOps.length > 0) await RfidTag.bulkWrite(rfidOps);

    cart.items = [];
    await cart.save();

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/orders
router.get('/', protect, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/orders/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
