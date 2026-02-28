import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Package, ChevronDown, ChevronUp, ShoppingBag } from 'lucide-react'
import api from '../api/axios'

function OrderRow({ order }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between p-5 hover:bg-dark-muted/30 transition-all text-left">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-white">Order #{order.receiptId}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              {' · '}{order.items.length} item{order.items.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="font-bold text-primary">₹{order.total.toFixed(0)}</p>
            <span className="badge-green text-xs">{order.paymentStatus}</span>
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-dark-border p-5 animate-fade-in">
          <div className="space-y-3 mb-4">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <img src={item.image || 'https://placehold.co/40x40/1a2332/00ff88?text=IMG'} alt={item.name}
                  className="w-10 h-10 rounded-lg object-cover"
                  onError={e => { e.target.src = 'https://placehold.co/40x40/1a2332/00ff88?text=IMG' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{item.name}</p>
                  <p className="text-xs text-slate-500">×{item.quantity} @ ₹{item.price}</p>
                </div>
                <span className="text-sm font-medium text-slate-300">₹{(item.price * item.quantity).toFixed(0)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-dark-border pt-3 flex justify-between items-center">
            <span className="text-sm text-slate-400">via {order.paymentMethod}</span>
            <Link to={`/receipt/${order._id}`}
              className="text-primary text-sm hover:text-primary-light transition-colors">
              View Receipt →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/orders')
      .then(r => setOrders(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-16 flex justify-center">
      <div className="flex gap-2">
        {[0,1,2].map(i => (
          <div key={i} className="w-3 h-3 bg-primary rounded-full animate-bounce-dot"
            style={{ animationDelay: `${i * 0.16}s` }} />
        ))}
      </div>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <Package className="w-6 h-6 text-primary" />
        Order History
      </h1>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingBag className="w-20 h-20 text-slate-700 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
          <p className="text-slate-500 mb-6">Your completed orders will appear here.</p>
          <Link to="/" className="btn-primary inline-flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => <OrderRow key={order._id} order={order} />)}
        </div>
      )}
    </div>
  )
}
