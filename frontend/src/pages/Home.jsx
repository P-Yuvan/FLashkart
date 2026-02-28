import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Scan, Sparkles, TrendingUp, ShoppingBag, Zap, ChevronRight } from 'lucide-react'
import api from '../api/axios'
import ProductCard from '../components/ProductCard'
import { useAuth } from '../context/AuthContext'

const CATEGORIES = ['All', 'Clothing', 'Electronics', 'Footwear', 'Grocery', 'Accessories', 'Sports', 'Home']

export default function Home() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      const params = { page, limit: 12 }
      if (category !== 'All') params.category = category
      if (search) params.q = search
      const res = await api.get('/products', { params })
      setProducts(res.data.products)
      setTotal(res.data.total)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [category, search, page])

  useEffect(() => { setPage(1) }, [category, search])
  useEffect(() => { fetchProducts() }, [fetchProducts])

  const totalPages = Math.ceil(total / 12)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Hero */}
      <div className="relative overflow-hidden card p-8 mb-8 bg-gradient-to-br from-dark-card via-dark-card to-primary/5 border-primary/20">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-primary" />
            <span className="text-primary text-sm font-medium">AI-Powered Shopping</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            Welcome back,<br />
            <span className="text-primary">{user?.name?.split(' ')[0] || 'Shopper'}</span>
          </h1>
          <p className="text-slate-400 mb-6 max-w-md">
            Scan products, get AI recommendations, and checkout in seconds — no queues.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/scanner" className="btn-primary flex items-center gap-2">
              <Scan className="w-4 h-4" />
              Start Scanning
            </Link>
            <Link to="/ai-assistant" className="btn-secondary flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Ask AI Agent
            </Link>
          </div>
        </div>
        <div className="absolute right-6 top-6 opacity-5 pointer-events-none">
          <ShoppingBag className="w-48 h-48 text-primary" />
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Products', value: String(total || '30+'), icon: ShoppingBag },
          { label: 'Categories', value: '8', icon: TrendingUp },
          { label: 'AI Ready', value: 'Yes', icon: Sparkles },
          { label: 'No Queue', value: '100%', icon: Zap },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-4 text-center">
            <Icon className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-xl font-bold text-white">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text" className="input flex-1"
          placeholder="Search products..."
          value={search}
          onChange={e => { setSearch(e.target.value) }}
        />
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                category === cat
                  ? 'bg-primary text-dark'
                  : 'bg-dark-card border border-dark-border text-slate-400 hover:text-white hover:border-primary/40'
              }`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="card h-72 animate-pulse">
              <div className="bg-dark-muted h-48 rounded-t-2xl" />
              <div className="p-4 space-y-2">
                <div className="bg-dark-muted h-3 rounded-full w-3/4" />
                <div className="bg-dark-muted h-3 rounded-full w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingBag className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500">No products found. Try a different search or category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(p => <ProductCard key={p._id} product={p} />)}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-8">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="btn-secondary px-4 py-2 text-sm disabled:opacity-40">Prev</button>
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="btn-secondary px-4 py-2 text-sm flex items-center gap-1 disabled:opacity-40">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
