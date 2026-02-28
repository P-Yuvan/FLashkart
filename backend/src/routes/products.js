const express = require('express');
const Product = require('../models/Product');
const router = express.Router();

// GET /api/products - search, filter, paginate
router.get('/', async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice, sort, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true };

    if (q) filter.$text = { $search: q };
    if (category) filter.category = category;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    let sortObj = { createdAt: -1 };
    if (sort === 'price_asc') sortObj = { price: 1 };
    else if (sort === 'price_desc') sortObj = { price: -1 };
    else if (sort === 'name') sortObj = { name: 1 };

    const skip = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      Product.find(filter).sort(sortObj).skip(skip).limit(Number(limit)),
      Product.countDocuments(filter),
    ]);

    res.json({ products, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/products/scan/:barcode  (legacy alias kept)
// GET /api/products/barcode/:code  (new standard endpoint)
async function findByBarcode(req, res) {
  try {
    const code = req.params.barcode || req.params.code;
    const product = await Product.findOne({ barcode: code, isActive: true });
    if (!product) return res.status(404).json({ message: 'Product not found for this barcode' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
router.get('/scan/:barcode', findByBarcode);
router.get('/barcode/:code', findByBarcode);

// GET /api/products/categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Product.distinct('category', { isActive: true });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
