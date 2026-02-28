const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: String,
  price: Number,
  image: String,
  category: String,
  barcode: String,
  quantity: Number,
}, { _id: false });

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],
  subtotal: { type: Number, required: true },
  tax: { type: Number, required: true },
  total: { type: Number, required: true },
  paymentMethod: {
    type: String,
    enum: ['UPI', 'Card', 'Cash', 'Wallet'],
    default: 'UPI',
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'completed',
  },
  receiptId: { type: String, default: () => uuidv4().slice(0, 8).toUpperCase() },
  deliveryMode: { type: String, enum: ['self-checkout', 'counter'], default: 'self-checkout' },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
