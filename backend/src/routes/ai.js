const express = require('express');
const { protect } = require('../middleware/auth');
const { runAIChat } = require('../utils/aiAgent');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const router = express.Router();

// ── Intent detectors ────────────────────────────────────────────────────────
const isCartView     = t => /\b(cart|what.*bought|what.*added|my items|my cart|total|what do i have)\b/i.test(t)
const isAddIntent   = t => /\b(add|put|buy|get|order|want|take)\b/i.test(t)
const isRemoveIntent = t => /\b(remove|delete|take out|cancel|drop|clear)\b/i.test(t)
const isSearchIntent = t => /\b(show|find|search|recommend|suggest|list|any|have|got|under|below|outfit|look|need|want|looking for|pillow|cushion|home|decor)\b/i.test(t)
const isOutfitIntent = t => /\b(outfit|combination|combo|dress up|wear|interview|party|casual|formal|occasion|event|look)\b/i.test(t)

// Extract max price from message
function extractMaxPrice(text) {
  const m = text.match(/(?:under|below|less than|within|upto?|max|₹|rs\.?)\s*(\d[\d,]*)/i)
  return m ? Number(m[1].replace(/,/g, '')) : null
}

// Map text to product category
function detectCategory(text) {
  if (/shirt|t-shirt|kurti|saree|jacket|trouser|pant|dress|kurta|blazer|jeans|chino|anarkali|ethnic/i.test(text)) return 'Clothing'
  if (/shoe|sneaker|boot|sandal|oxford|flip flop|running shoe|footwear/i.test(text)) return 'Footwear'
  if (/earphone|headphone|electronic|cable|charger|speaker|smartwatch|power bank|mobile/i.test(text)) return 'Electronics'
  if (/grocery|snack|beverage|food|chips|juice|noodle|cola|chocolate/i.test(text)) return 'Grocery'
  if (/pillow|cushion|throw|home|decor|neck pillow|velvet|living room|bedroom/i.test(text)) return 'Home'
  if (/sport|gym|fitness|yoga|athletic|activewear/i.test(text)) return 'Sports'
  return null
}

// Search products from DB
async function searchProducts(text, maxPrice) {
  const filter = { isActive: true }
  if (maxPrice) filter.price = { $lte: maxPrice }

  const cat = detectCategory(text)
  if (cat) filter.category = cat

  // Text search first
  const clean = text
    .replace(/[₹,]/g, ' ')
    .replace(/\d+/g, ' ')
    .replace(/\b(add|put|buy|get|show|find|me|a|an|the|some|any|please|under|below|within|rs|inr|want|need|looking|for|i|is|are|do|you|have)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  let products = []
  if (clean.length > 1) {
    try { products = await Product.find({ ...filter, $text: { $search: clean } }).limit(5).lean() } catch {}
  }
  if (!products.length) {
    products = await Product.find(filter).sort({ discountPrice: 1, price: 1 }).limit(5).lean()
  }
  return products
}

// Find best product match for "add X" intent
async function findProduct(text) {
  const clean = text
    .replace(/\b(add|put|buy|get|please|the|a|an|to|my|cart|want|need|one|more|take)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  let product = null

  if (clean.length > 1) {
    try {
      const r = await Product.find({ isActive: true, $text: { $search: clean } }).limit(1).lean()
      if (r.length) product = r[0]
    } catch {}
  }
  if (!product && clean.length > 1) {
    product = await Product.findOne({ isActive: true, name: { $regex: clean, $options: 'i' } }).lean()
  }
  return product
}

// Build outfit recommendation context
async function buildOutfitContext(text) {
  const parts = []
  const maxPrice = extractMaxPrice(text)

  // Get clothing items
  const clothingFilter = { isActive: true, category: 'Clothing' }
  if (maxPrice) clothingFilter.price = { $lte: maxPrice }

  // Formal outfit
  if (/formal|interview|office|meeting|business|professional/i.test(text)) {
    const shirts = await Product.find({ ...clothingFilter, tags: 'formal' }).limit(2).lean()
    const shoes = await Product.find({ isActive: true, category: 'Footwear', tags: 'formal', ...(maxPrice ? { price: { $lte: maxPrice } } : {}) }).limit(1).lean()
    const allItems = [...shirts, ...shoes]
    if (allItems.length) {
      const list = allItems.map((p, i) => `${i + 1}. ${p.name} — ₹${p.discountPrice || p.price} (${p.category})`).join('\n')
      parts.push(`<CONTEXT>\nFormal/Interview outfit suggestion:\n${list}\nTell the user these items make a great professional look and ask if they want to add any.\n</CONTEXT>`)
    }
  }
  // Casual outfit
  else if (/casual|everyday|hangout|chill|weekend/i.test(text)) {
    const tops = await Product.find({ ...clothingFilter, tags: 'casual' }).limit(2).lean()
    const shoes = await Product.find({ isActive: true, category: 'Footwear', tags: 'casual', ...(maxPrice ? { price: { $lte: maxPrice } } : {}) }).limit(1).lean()
    const allItems = [...tops, ...shoes]
    if (allItems.length) {
      const list = allItems.map((p, i) => `${i + 1}. ${p.name} — ₹${p.discountPrice || p.price} (${p.category})`).join('\n')
      parts.push(`<CONTEXT>\nCasual outfit suggestion:\n${list}\nSuggest these work well together for a casual look.\n</CONTEXT>`)
    }
  }
  // Party outfit
  else if (/party|evening|event|night out/i.test(text)) {
    const partywear = await Product.find({ ...clothingFilter, tags: 'party' }).limit(2).lean()
    const shoes = await Product.find({ isActive: true, category: 'Footwear', ...(maxPrice ? { price: { $lte: maxPrice } } : {}) }).limit(1).lean()
    const allItems = [...partywear, ...shoes]
    if (allItems.length) {
      const list = allItems.map((p, i) => `${i + 1}. ${p.name} — ₹${p.discountPrice || p.price} (${p.category})`).join('\n')
      parts.push(`<CONTEXT>\nParty outfit suggestion:\n${list}\n</CONTEXT>`)
    }
  }
  // Generic outfit
  else {
    const clothing = await Product.find(clothingFilter).limit(3).lean()
    const shoes = await Product.find({ isActive: true, category: 'Footwear', ...(maxPrice ? { price: { $lte: maxPrice } } : {}) }).limit(1).lean()
    const allItems = [...clothing, ...shoes]
    if (allItems.length) {
      const list = allItems.map((p, i) => `${i + 1}. ${p.name} — ₹${p.discountPrice || p.price} (${p.category})`).join('\n')
      parts.push(`<CONTEXT>\nOutfit combination from our catalog:\n${list}\nSuggest how these items go together.\n</CONTEXT>`)
    }
  }
  return parts.join('\n')
}

// POST /api/ai/chat
router.post('/chat', protect, async (req, res) => {
  try {
    const { messages } = req.body
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: 'Messages array required' })
    }

    const userId = req.user._id
    const userBudget = req.user.budget
    const lastMsg = [...messages].reverse().find(m => m.role === 'user')?.content || ''
    const maxPrice = extractMaxPrice(lastMsg)

    let contextParts = []
    if (userBudget) contextParts.push(`User's shopping budget: ₹${userBudget}`)

    // ── 1. View cart ─────────────────────────────────────────────────────────
    if (isCartView(lastMsg) && !isAddIntent(lastMsg)) {
      const cart = await Cart.findOne({ userId })
      if (!cart || !cart.items.length) {
        contextParts.push('<CONTEXT>\nCart is empty. Encourage the user to start shopping.\n</CONTEXT>')
      } else {
        const lines = cart.items.map(i => `• ${i.name} ×${i.quantity} = ₹${(i.price * i.quantity).toFixed(0)}`)
        contextParts.push(`<CONTEXT>\nCart (${cart.items.length} items, subtotal ₹${cart.total.toFixed(0)}, total with 18% GST ≈ ₹${(cart.total * 1.18).toFixed(0)}):\n${lines.join('\n')}\n</CONTEXT>`)
        if (userBudget && cart.total * 1.18 > userBudget) {
          contextParts.push(`<CONTEXT>\nWARNING: Cart total (₹${(cart.total * 1.18).toFixed(0)}) exceeds user budget of ₹${userBudget}. Gently alert the user.\n</CONTEXT>`)
        }
      }
    }

    // ── 2. Remove from cart ──────────────────────────────────────────────────
    else if (isRemoveIntent(lastMsg) && !isSearchIntent(lastMsg)) {
      const product = await findProduct(lastMsg)
      if (product) {
        const cart = await Cart.findOne({ userId })
        if (cart) {
          const before = cart.items.length
          cart.items = cart.items.filter(i => i.productId.toString() !== product._id.toString())
          await cart.save()
          if (cart.items.length < before) {
            contextParts.push(`<CONTEXT>\nSuccessfully removed "${product.name}" from cart. New cart: ${cart.items.length} items, subtotal ₹${cart.total.toFixed(0)}\n</CONTEXT>`)
          } else {
            contextParts.push(`<CONTEXT>\n"${product.name}" was not in the cart.\n</CONTEXT>`)
          }
        }
      } else {
        contextParts.push('<CONTEXT>\nCould not find that item in the cart. Ask the user to be more specific.\n</CONTEXT>')
      }
    }

    // ── 3. Outfit recommendation ─────────────────────────────────────────────
    else if (isOutfitIntent(lastMsg) && !isAddIntent(lastMsg)) {
      const outfitCtx = await buildOutfitContext(lastMsg)
      if (outfitCtx) contextParts.push(outfitCtx)
    }

    // ── 4. Add to cart ───────────────────────────────────────────────────────
    else if (isAddIntent(lastMsg)) {
      const products = await searchProducts(lastMsg, maxPrice)
      const product = products[0] || await findProduct(lastMsg)

      if (product) {
        let cart = await Cart.findOne({ userId })
        if (!cart) cart = await Cart.create({ userId, items: [] })
        const idx = cart.items.findIndex(i => i.productId.toString() === product._id.toString())
        if (idx > -1) { cart.items[idx].quantity += 1 }
        else {
          cart.items.push({
            productId: product._id, name: product.name,
            price: product.discountPrice || product.price,
            image: product.image, category: product.category, quantity: 1,
          })
        }
        await cart.save()
        const budgetWarning = userBudget && cart.total * 1.18 > userBudget
          ? ` NOTE: Cart (₹${(cart.total * 1.18).toFixed(0)}) now exceeds budget of ₹${userBudget}.`
          : ''
        contextParts.push(`<CONTEXT>\nAdded "${product.name}" (₹${product.discountPrice || product.price}) to cart.\nNew cart: ${cart.items.length} items, subtotal ₹${cart.total.toFixed(0)}${budgetWarning}\n</CONTEXT>`)
      } else if (products.length) {
        const list = products.map((p, i) => `${i + 1}. ${p.name} — ₹${p.discountPrice || p.price}${p.discountPrice ? ` (was ₹${p.price})` : ''}`).join('\n')
        contextParts.push(`<CONTEXT>\nSeveral products match. Ask the user which one to add:\n${list}\n</CONTEXT>`)
      } else {
        contextParts.push('<CONTEXT>\nNo matching products found. Suggest the user browse our catalog or try different keywords.\n</CONTEXT>')
      }
    }

    // ── 5. Search / Show products ────────────────────────────────────────────
    else if (isSearchIntent(lastMsg)) {
      const products = await searchProducts(lastMsg, maxPrice)
      if (products.length) {
        const list = products.map((p, i) =>
          `${i + 1}. ${p.name} — ₹${p.discountPrice || p.price}${p.discountPrice ? ` (save ₹${p.price - p.discountPrice})` : ''} | ${p.brand || p.category}`
        ).join('\n')
        contextParts.push(`<CONTEXT>\nProducts found (${products.length} results):\n${list}\n</CONTEXT>`)
      } else {
        contextParts.push('<CONTEXT>\nNo products found matching that query. Suggest alternatives or broader keywords.\n</CONTEXT>')
      }
    }

    // ── 6. Call AI with context (single call) ────────────────────────────────
    const context = contextParts.join('\n')
    const content = await runAIChat(messages, context)
    res.json({ content, toolsUsed: [] })

  } catch (err) {
    console.error('AI chat error:', err.message)
    res.status(500).json({ message: 'AI service error: ' + err.message })
  }
})

module.exports = router
