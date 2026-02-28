import { useState } from 'react'
import { ShoppingCart, Tag, Plus, Check } from 'lucide-react'
import { useCart } from '../context/CartContext'
import ProductModal from './ProductModal'

export default function ProductCard({ product, compact = false }) {
  const { addToCart } = useCart()
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const handleAddToCart = async (e) => {
    e.preventDefault()
    if (adding || added) return
    try {
      setAdding(true)
      await addToCart(product._id, 1)
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    } catch (err) {
      console.error('Failed to add to cart', err)
    } finally {
      setAdding(false)
    }
  }

  const price = product.discountPrice || product.price
  const hasDiscount = product.discountPrice && product.discountPrice < product.price
  const discount = hasDiscount
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0

  if (compact) {
    return (
      <>
        {showModal && <ProductModal product={product} onClose={() => setShowModal(false)} />}
        <div onClick={() => setShowModal(true)} className="card flex items-center gap-3 p-3 hover:border-primary/30 transition-all cursor-pointer">
          <img
            src={product.image || 'https://placehold.co/60x60/1a2332/00ff88?text=IMG'}
            alt={product.name}
            className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
            onError={e => { e.target.src = 'https://placehold.co/60x60/1a2332/00ff88?text=IMG' }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{product.name}</p>
            <p className="text-xs text-slate-500">{product.category}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-primary font-semibold text-sm">₹{price}</span>
              {hasDiscount && <span className="text-slate-500 line-through text-xs">₹{product.price}</span>}
            </div>
          </div>
          <button onClick={e => { e.stopPropagation(); handleAddToCart(e) }} disabled={adding}
            className="p-2 bg-primary/10 border border-primary/30 rounded-lg text-primary hover:bg-primary/20 transition-all flex-shrink-0">
            {added ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      {showModal && <ProductModal product={product} onClose={() => setShowModal(false)} />}
      <div
        onClick={() => setShowModal(true)}
        className="card overflow-hidden group hover:border-primary/30 hover:shadow-[0_0_24px_rgba(0,255,136,0.1)] transition-all duration-300 flex flex-col cursor-pointer"
      >
        <div className="relative overflow-hidden">
          <img
            src={product.image || 'https://placehold.co/300x200/1a2332/00ff88?text=Product'}
            alt={product.name}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
            onError={e => { e.target.src = 'https://placehold.co/300x200/1a2332/00ff88?text=Product' }}
          />
          {hasDiscount && (
            <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              -{discount}%
            </span>
          )}
          <span className="absolute top-2 right-2 badge-green">{product.category}</span>
          {/* Quick add overlay on hover */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <span className="text-white text-sm font-medium bg-black/60 px-4 py-2 rounded-full backdrop-blur-sm">
              View Details
            </span>
          </div>
        </div>
        <div className="p-4 flex-1 flex flex-col">
          {product.brand && <p className="text-xs text-slate-600 uppercase tracking-wider mb-0.5">{product.brand}</p>}
          <h3 className="font-semibold text-white text-sm mb-1 line-clamp-2 leading-5">{product.name}</h3>
          <p className="text-xs text-slate-500 mb-3 line-clamp-2 flex-1">{product.description}</p>
          {product.tags?.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap mb-3">
              <Tag className="w-3 h-3 text-slate-600" />
              {product.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-xs text-slate-500 bg-dark-muted/50 px-1.5 py-0.5 rounded-md">{tag}</span>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between mt-auto">
            <div>
              <span className="text-primary font-bold text-lg">₹{price}</span>
              {hasDiscount && <span className="text-slate-500 line-through text-sm ml-1.5">₹{product.price}</span>}
            </div>
            <button
              onClick={e => { e.stopPropagation(); handleAddToCart(e) }}
              disabled={adding || added}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                added
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-primary text-dark hover:bg-primary-dark hover:shadow-[0_0_16px_rgba(0,255,136,0.4)]'
              }`}
            >
              {added ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
              {added ? 'Added!' : adding ? '…' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
