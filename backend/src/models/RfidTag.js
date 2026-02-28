const mongoose = require('mongoose');

const rfidTagSchema = new mongoose.Schema({
  rfidTagId:     { type: String, required: true, unique: true, trim: true },
  productId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName:   { type: String, default: '' },
  orderId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  paymentStatus: { type: String, enum: ['PAID', 'UNPAID'], default: 'UNPAID' },
  paidAt:        { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('RfidTag', rfidTagSchema);
