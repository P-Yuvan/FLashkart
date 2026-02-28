import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LayoutDashboard, Users, ShoppingBag, TrendingUp, DollarSign, Package, ArrowRight, Activity } from 'lucide-react'
import api from '../../api/axios'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/analytics')
      .then(r => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center min-h-96">
      <div className="flex gap-2">
        {[0,1,2].map(i => (
          <div key={i} className="w-3 h-3 bg-primary rounded-full animate-bounce-dot"
            style={{ animationDelay: `${i * 0.16}s` }} />
        ))}
      </div>
    </div>
  )

  const statCards = [
    { label: 'Total Revenue', value: `₹${(stats?.totalRevenue || 0).toLocaleString('en-IN')}`, icon: DollarSign, color: 'text-primary' },
    { label: 'Total Orders', value: stats?.totalOrders || 0, icon: Package, color: 'text-blue-400' },
    { label: 'Orders Today', value: stats?.ordersToday || 0, icon: Activity, color: 'text-orange-400' },
    { label: 'Products', value: stats?.totalProducts || 0, icon: ShoppingBag, color: 'text-purple-400' },
    { label: 'Users', value: stats?.totalUsers || 0, icon: Users, color: 'text-pink-400' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-primary" />
          Admin Dashboard
        </h1>
        <div className="flex gap-3">
          <Link to="/admin/products" className="btn-primary px-4 py-2 text-sm flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            Manage Products
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <Icon className={`w-6 h-6 ${color} mb-3`} />
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Category breakdown */}
        <div className="card p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Products by Category
          </h2>
          <div className="space-y-3">
            {(stats?.categoryStats || []).map(({ _id, count }) => {
              const total = stats?.totalProducts || 1
              const pct = Math.round((count / total) * 100)
              return (
                <div key={_id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">{_id}</span>
                    <span className="text-slate-500">{count} products</span>
                  </div>
                  <div className="h-2 bg-dark-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent orders */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Recent Orders
            </h2>
            <Link to="/admin/transactions" className="text-primary text-sm hover:text-primary-light flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-3">
            {(stats?.recentOrders || []).length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No orders yet</p>
            ) : (
              stats.recentOrders.map(order => (
                <div key={order._id} className="flex items-center justify-between py-2 border-b border-dark-border/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-white">#{order.receiptId}</p>
                    <p className="text-xs text-slate-500">{order.userId?.name || 'Unknown'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary">₹{order.total.toFixed(0)}</p>
                    <span className="badge-green text-xs">{order.paymentStatus}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
