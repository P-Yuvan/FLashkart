import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Receipt, ChevronDown, ChevronUp, ArrowLeft, SlidersHorizontal } from 'lucide-react'
import api from '../../api/axios'

export default function AdminTransactions() {
  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/transactions', { params: { page, limit: 20 } })
      setOrders(res.data.orders)
      setTotal(res.data.total)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [page])

  useEffect(() => { fetch() }, [fetch])

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin" className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-dark-muted transition-all">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Receipt className="w-6 h-6 text-primary" />
          All Transactions
          <span className="text-slate-500 text-lg font-normal">({total})</span>
        </h1>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-dark-muted/50 border-b border-dark-border">
              <tr>
                <th className="text-left px-4 py-3 text-slate-400 font-medium w-8" />
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Receipt ID</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Customer</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Date</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Items</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Total</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Payment</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    {Array(8).fill(0).map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-3 bg-dark-muted rounded-full animate-pulse w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-500">No transactions yet</td></tr>
              ) : orders.map(order => (
                <>
                  <tr key={order._id}
                    className="hover:bg-dark-muted/20 transition-colors cursor-pointer"
                    onClick={() => setExpanded(expanded === order._id ? null : order._id)}>
                    <td className="px-4 py-3">
                      {expanded === order._id
                        ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                        : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-primary">#{order.receiptId}</td>
                    <td className="px-4 py-3">
                      <p className="text-white">{order.userId?.name || 'Unknown'}</p>
                      <p className="text-xs text-slate-500">{order.userId?.email || ''}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{order.items.length}</td>
                    <td className="px-4 py-3 font-semibold text-primary">₹{order.total.toFixed(0)}</td>
                    <td className="px-4 py-3 text-slate-300">{order.paymentMethod}</td>
                    <td className="px-4 py-3">
                      <span className={order.paymentStatus === 'completed' ? 'badge-green' : 'badge-red'}>
                        {order.paymentStatus}
                      </span>
                    </td>
                  </tr>
                  {expanded === order._id && (
                    <tr key={`${order._id}-detail`} className="bg-dark-muted/10">
                      <td colSpan={8} className="px-8 py-4">
                        <div className="space-y-2">
                          {order.items.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-3">
                                <img src={item.image || 'https://via.placeholder.com/32'} alt={item.name}
                                  className="w-8 h-8 rounded-lg object-cover"
                                  onError={e => { e.target.src = 'https://via.placeholder.com/32' }} />
                                <span className="text-slate-300">{item.name}</span>
                                <span className="text-slate-600">×{item.quantity}</span>
                              </div>
                              <span className="text-slate-300">₹{(item.price * item.quantity).toFixed(0)}</span>
                            </div>
                          ))}
                          <div className="border-t border-dark-border pt-2 flex justify-between text-sm font-medium">
                            <span className="text-slate-400">Subtotal: ₹{order.subtotal.toFixed(0)} + GST: ₹{order.tax.toFixed(0)}</span>
                            <span className="text-primary">Total: ₹{order.total.toFixed(0)}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {total > 20 && (
        <div className="flex justify-center items-center gap-3 mt-4">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary px-4 py-2 text-sm disabled:opacity-40">Prev</button>
          <span className="text-sm text-slate-500">Page {page} of {Math.ceil(total / 20)}</span>
          <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)} className="btn-secondary px-4 py-2 text-sm disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  )
}
