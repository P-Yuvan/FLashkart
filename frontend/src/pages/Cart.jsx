import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Trash2, ArrowRight, ShoppingBag, AlertTriangle, Sparkles } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import CartItem from '../components/CartItem'

export default function Cart() {
  const { cart, clearCart } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()

  const items = cart.items || []
  const total = cart.total || 0
  const tax = parseFloat((total * 0.18).toFixed(2))
  const grandTotal = parseFloat((total + tax).toFixed(2))
  const budget = user?.budget || 0
  const overBudget = budget > 0 && grandTotal > budget

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <ShoppingBag className="w-20 h-20 text-slate-700 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
        <p className="text-slate-500 mb-6">Start scanning products or browse the store to add items.</p>
        <div className="flex justify-center gap-3">
          <Link to="/scanner" className="btn-primary flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Start Scanning
          </Link>
          <Link to="/" className="btn-secondary">Browse Store</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-primary" />
          Your Cart
          <span className="text-slate-500 text-lg font-normal">({items.length} items)</span>
        </h1>
        <button onClick={() => clearCart()}
          className="flex items-center gap-1.5 text-sm text-red-400/70 hover:text-red-400 transition-all">
          <Trash2 className="w-4 h-4" />
          Clear all
        </button>
      </div>

      {/* Budget warning */}
      {overBudget && (
        <div className="bg-orange-500/10 border border-orange-500/30 text-orange-400 px-4 py-3 rounded-xl mb-4 flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            Your cart (₹{grandTotal}) exceeds your budget of ₹{budget}. Consider removing some items or ask AI for cheaper alternatives.
          </span>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Items list */}
        <div className="lg:col-span-2 space-y-3">
          {items.map(item => <CartItem key={item.productId} item={item} />)}
        </div>

        {/* Order summary */}
        <div className="space-y-4">
          <div className="card p-4 sm:p-5 sticky top-20">
            <h2 className="font-semibold text-lg mb-4">Order Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal ({items.length} items)</span>
                <span className="text-white">₹{total.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>GST (18%)</span>
                <span className="text-white">₹{tax.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Delivery</span>
                <span className="text-primary font-medium">FREE</span>
              </div>
              <div className="border-t border-dark-border pt-3 flex justify-between font-semibold text-base">
                <span>Total</span>
                <span className="text-primary">₹{grandTotal.toFixed(0)}</span>
              </div>
              {budget > 0 && (
                <div className={`text-xs px-3 py-2 rounded-lg ${
                  overBudget
                    ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                    : 'bg-primary/10 text-primary border border-primary/20'
                }`}>
                  Budget: ₹{budget} | {overBudget ? `Over by ₹${(grandTotal - budget).toFixed(0)}` : `₹${(budget - grandTotal).toFixed(0)} remaining`}
                </div>
              )}
            </div>
            <button onClick={() => navigate('/checkout')}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-4">
              Checkout
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* AI help */}
          <Link to="/ai-assistant"
            className="card p-4 flex items-center gap-3 hover:border-primary/30 transition-all group">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-all">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Need help?</p>
              <p className="text-xs text-slate-500">Ask AI for alternatives or outfit combos</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-600 ml-auto group-hover:text-primary transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  )
}
