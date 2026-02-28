import { useEffect, useState } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { CheckCircle, Home, Package, Printer } from 'lucide-react'
import api from '../api/axios'

function printReceipt() {
  window.print()
}

export default function Receipt() {
  const { id } = useParams()
  const location = useLocation()
  const [order, setOrder] = useState(location.state?.order || null)
  const [loading, setLoading] = useState(!location.state?.order)

  useEffect(() => {
    if (!order) {
      api.get(`/orders/${id}`)
        .then(r => setOrder(r.data))
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [id, order])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-3 h-3 bg-primary rounded-full animate-bounce-dot"
              style={{ animationDelay: `${i * 0.16}s` }} />
          ))}
        </div>
      </div>
    )
  }

  if (!order) return (
    <div className="text-center py-16">
      <p className="text-slate-500">Order not found.</p>
      <Link to="/" className="btn-primary mt-4 inline-flex items-center gap-2"><Home className="w-4 h-4" />Go Home</Link>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Success header - hidden on print */}
      <div className="text-center mb-8 animate-slide-up print-hide">
        <div className="w-20 h-20 bg-primary/10 border-2 border-primary/40 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-green">
          <CheckCircle className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-white">Payment Successful!</h1>
        <p className="text-slate-400 mt-2">Your order has been placed. Thank you for shopping at FlashCart!</p>
      </div>

      {/* Receipt card — this is what gets printed */}
      <div className="card overflow-hidden print-area">
        {/* Store header — shown only on print */}
        <div className="hidden print:block text-center py-4 border-b border-dark-border">
          <p className="font-bold text-2xl tracking-wide">FlashCart</p>
          <p className="text-xs text-slate-500">AI-Powered Smart Retail</p>
        </div>

        {/* Receipt header */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-dark-border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Receipt ID</p>
              <p className="font-mono font-bold text-primary text-lg tracking-wider">#{order.receiptId}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400">Date</p>
              <p className="text-sm text-white">{new Date(order.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
              })}</p>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="p-5">
          <h3 className="text-sm font-medium text-slate-400 mb-3">Items Purchased</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto print:max-h-none print:overflow-visible">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-dark-border/50 last:border-0">
                <div className="flex items-center gap-3">
                  <img
                    src={item.image || 'https://placehold.co/40x40/f3f4f6/555?text=IMG'}
                    alt={item.name}
                    className="w-10 h-10 rounded-lg object-cover print:w-8 print:h-8"
                    onError={e => { e.target.src = 'https://placehold.co/40x40/f3f4f6/555?text=IMG' }}
                  />
                  <div>
                    <p className="text-sm text-white font-medium line-clamp-1">{item.name}</p>
                    <p className="text-xs text-slate-500">×{item.quantity} @ ₹{item.price}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-white">₹{(item.price * item.quantity).toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="border-t border-dark-border px-5 py-4 space-y-2">
          <div className="flex justify-between text-sm text-slate-400">
            <span>Subtotal</span>
            <span className="text-white">₹{order.subtotal.toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-400">
            <span>GST (18%)</span>
            <span className="text-white">₹{order.tax.toFixed(0)}</span>
          </div>
          <div className="flex justify-between font-bold text-base border-t border-dark-border pt-2 mt-1">
            <span>Total Paid</span>
            <span className="text-primary">₹{order.total.toFixed(0)}</span>
          </div>
        </div>

        {/* Payment info */}
        <div className="border-t border-dark-border px-5 py-4 flex items-center justify-between text-sm">
          <span className="text-slate-400">Payment</span>
          <span className="badge-green">{order.paymentMethod} — {order.paymentStatus}</span>
        </div>

        {/* Footer — print only */}
        <div className="hidden print:block text-center py-3 border-t border-dark-border text-xs text-slate-500">
          <p>Thank you for shopping at FlashCart!</p>
          <p>Keep this receipt for your records.</p>
        </div>
      </div>

      {/* Actions — hidden on print */}
      <div className="flex gap-3 mt-6 print-hide">
        <button onClick={printReceipt}
          className="btn-secondary flex-1 flex items-center justify-center gap-2">
          <Printer className="w-4 h-4" />
          Print Receipt
        </button>
        <Link to="/orders" className="btn-secondary flex-1 flex items-center justify-center gap-2">
          <Package className="w-4 h-4" />
          My Orders
        </Link>
        <Link to="/" className="btn-primary flex-1 flex items-center justify-center gap-2">
          <Home className="w-4 h-4" />
          Home
        </Link>
      </div>
    </div>
  )
}
