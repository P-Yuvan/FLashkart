import { useState } from 'react'
import { X, ShoppingCart, Check, Tag, Star, Package, ChevronDown, ChevronUp, Minus, Plus, Zap } from 'lucide-react'
import { useCart } from '../context/CartContext'

// Size options per category
const SIZES = {
  Clothing: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  Footwear: ['UK 5', 'UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
  Sports: ['XS', 'S', 'M', 'L', 'XL'],
  Accessories: ['Free Size'],
  Electronics: ['Standard'],
  Grocery: ['Standard'],
  Home: ['Standard'],
  Beauty: ['Standard'],
}

export default function ProductModal({ product, onClose }) {
  const { addToCart } = useCart()
  const [selectedSize, setSelectedSize] = useState(null)
  const [qty, setQty] = useState(1)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [showDesc, setShowDesc] = useState(true)

  const sizes = SIZES[product.category] || ['Standard']
  const needsSize = !['Electronics', 'Grocery', 'Home', 'Beauty', 'Accessories'].includes(product.category)
  const price = product.discountPrice || product.price
  const hasDiscount = product.discountPrice && product.discountPrice < product.price
  const discount = hasDiscount
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0
  const savings = hasDiscount ? product.price - product.discountPrice : 0

  const handleAdd = async () => {
    if (needsSize && !selectedSize) return
    if (adding || added) return
    try {
      setAdding(true)
      await addToCart(product._id, qty)
      setAdded(true)
      setTimeout(() => {
        setAdded(false)
        onClose()
      }, 1500)
    } catch (err) {
      console.error('Add to cart failed', err)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-dark-card border border-dark-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl animate-slide-up">
        {/* Image */}
        <div className="relative">
          <img
            src={product.image || `https://placehold.co/600x400/1a2332/00ff88?text=${encodeURIComponent(product.name)}`}
            alt={product.name}
            className="w-full h-56 sm:h-72 object-cover rounded-t-2xl sm:rounded-t-2xl"
            onError={e => { e.target.src = `https://placehold.co/600x400/1a2332/00ff88?text=${encodeURIComponent(product.name)}` }}
          />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
          {hasDiscount && (
            <span className="absolute top-3 left-3 bg-red-500 text-white text-sm font-bold px-2.5 py-1 rounded-full">
              -{discount}% OFF
            </span>
          )}
          <span className="absolute bottom-3 left-3 badge-green">{product.category}</span>
        </div>

        <div className="p-5 space-y-4">
          {/* Title + brand */}
          <div>
            {product.brand && <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{product.brand}</p>}
            <h2 className="text-xl font-bold text-white leading-tight">{product.name}</h2>
            {/* Rating (decorative) */}
            <div className="flex items-center gap-1 mt-1.5">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className={`w-3.5 h-3.5 ${s <= 4 ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`} />
              ))}
              <span className="text-xs text-slate-500 ml-1">4.0 · In stock ({product.stock})</span>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-primary">₹{price}</span>
            {hasDiscount && (
              <>
                <span className="text-lg text-slate-500 line-through">₹{product.price}</span>
                <span className="text-sm text-green-400 font-medium">Save ₹{savings}</span>
              </>
            )}
          </div>
          {hasDiscount && <p className="text-xs text-slate-500 -mt-2">Inclusive of all taxes</p>}

          {/* Size selector */}
          {needsSize && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-300">Select Size</p>
                {!selectedSize && <p className="text-xs text-red-400">Required</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {sizes.map(s => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      selectedSize === s
                        ? 'bg-primary text-dark border-primary'
                        : 'border-dark-border text-slate-400 hover:border-primary/40 hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="flex items-center gap-4">
            <p className="text-sm font-medium text-slate-300">Quantity</p>
            <div className="flex items-center gap-3 bg-dark-muted rounded-xl px-2 py-1">
              <button onClick={() => setQty(q => Math.max(1, q - 1))} className="p-1 hover:text-primary transition-colors">
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-bold text-white">{qty}</span>
              <button onClick={() => setQty(q => Math.min(product.stock || 10, q + 1))} className="p-1 hover:text-primary transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Description collapsible */}
          <div className="border border-dark-border rounded-xl overflow-hidden">
            <button
              onClick={() => setShowDesc(p => !p)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-300 hover:bg-dark-muted/50 transition-all"
            >
              <span>Product Details</span>
              {showDesc ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showDesc && (
              <div className="px-4 pb-4 space-y-2">
                <p className="text-sm text-slate-400 leading-relaxed">{product.description || 'Quality product from FlashCart store.'}</p>
                {product.barcode && (
                  <div className="flex items-center gap-2 text-xs text-slate-600 mt-2">
                    <Package className="w-3.5 h-3.5" />
                    <span>Barcode: {product.barcode}</span>
                  </div>
                )}
                {product.tags?.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap mt-2">
                    <Tag className="w-3.5 h-3.5 text-slate-600" />
                    {product.tags.map(t => (
                      <span key={t} className="text-xs text-slate-500 bg-dark-muted px-2 py-0.5 rounded-md">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleAdd}
              disabled={adding || added || (needsSize && !selectedSize)}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all ${
                added
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : (needsSize && !selectedSize)
                  ? 'bg-dark-muted text-slate-600 cursor-not-allowed'
                  : 'bg-primary text-dark hover:bg-primary-dark shadow-[0_0_20px_rgba(0,255,136,0.3)] hover:shadow-[0_0_30px_rgba(0,255,136,0.5)]'
              }`}
            >
              {added ? (
                <><Check className="w-4 h-4" /> Added to Cart!</>
              ) : adding ? (
                <><div className="w-4 h-4 border-2 border-dark/40 border-t-dark rounded-full animate-spin" /> Adding…</>
              ) : (
                <><ShoppingCart className="w-4 h-4" /> Add to Cart {qty > 1 ? `(${qty})` : ''}</>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-3.5 rounded-xl border border-dark-border text-slate-400 hover:text-white hover:border-slate-500 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Delivery info */}
          <div className="flex items-center gap-3 py-2 border-t border-dark-border/50 text-xs text-slate-500">
            <Zap className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span>Instant add · No queue checkout · Scan & go</span>
          </div>
        </div>
      </div>
    </div>
  )
}
