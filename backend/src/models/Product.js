const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  category: {
    type: String,
    required: true,
    enum: ['Clothing', 'Electronics', 'Grocery', 'Footwear', 'Accessories', 'Beauty', 'Sports', 'Home'],
  },
  price: { type: Number, required: true, min: 0 },
  discountPrice: { type: Number, default: null },
  barcode: { type: String, required: true, unique: true, trim: true },
  rfid: { type: String, default: '', trim: true },
  stock: { type: Number, default: 100, min: 0 },
  image: { type: String, default: '' },
  tags: [{ type: String, lowercase: true }],
  brand: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

productSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Product', productSchema);
