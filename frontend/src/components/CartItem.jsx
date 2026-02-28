import { Minus, Plus, Trash2 } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useState } from 'react'

export default function CartItem({ item }) {
  const { updateQuantity, removeFromCart } = useCart()
  const [loading, setLoading] = useState(false)

  const handleQty = async (delta) => {
    try {
      setLoading(true)
      const newQty = item.quantity + delta
      if (newQty <= 0) {
        await removeFromCart(item.productId)
      } else {
        await updateQuantity(item.productId, newQty)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-3 sm:p-4">
      {/* Top row: image + product info + delete */}
      <div className="flex items-start gap-3">
        <img
          src={item.image || 'https://placehold.co/80x80/1a2332/00ff88?text=IMG'}
          alt={item.name}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover flex-shrink-0"
          onError={e => { e.target.src = 'https://placehold.co/80x80/1a2332/00ff88?text=IMG' }}
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-white text-sm leading-snug line-clamp-2">{item.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{item.category}</p>
          <p className="text-primary font-semibold text-sm mt-1">
            ₹{item.price} <span className="text-slate-500 text-xs font-normal">each</span>
          </p>
        </div>
        <button onClick={() => removeFromCart(item.productId)}
          className="text-red-400/50 hover:text-red-400 transition-all flex-shrink-0 p-1">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom row: qty controls + total price */}
      <div className="flex items-center justify-between mt-2.5 pl-[68px] sm:pl-[76px]">
        <div className="flex items-center gap-1.5 bg-dark-muted rounded-xl p-1">
          <button onClick={() => handleQty(-1)} disabled={loading}
            className="w-7 h-7 rounded-lg bg-dark-card hover:bg-dark-border flex items-center justify-center transition-all">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
          <button onClick={() => handleQty(1)} disabled={loading}
            className="w-7 h-7 rounded-lg bg-dark-card hover:bg-dark-border flex items-center justify-center transition-all">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="font-bold text-white text-base">₹{(item.price * item.quantity).toFixed(0)}</p>
      </div>
    </div>
  )
}
