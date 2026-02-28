import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Edit, Trash2, Search, X, Loader, CheckCircle, Package, ImageUp, Link } from 'lucide-react'
import api from '../../api/axios'

const CATEGORIES = ['Clothing', 'Electronics', 'Grocery', 'Footwear', 'Accessories', 'Beauty', 'Sports', 'Home']
const EMPTY_FORM = { name: '', description: '', category: 'Clothing', price: '', discountPrice: '', barcode: '', rfid: '', stock: '', image: '', tags: '', brand: '', isActive: true }

function ProductModal({ product, onSave, onClose }) {
  const [form, setForm] = useState(product
    ? { ...product, tags: product.tags?.join(', ') || '', discountPrice: product.discountPrice || '' }
    : EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [imageMode, setImageMode] = useState('url')  // 'url' | 'upload'
  const [uploadPreview, setUploadPreview] = useState(product?.image || '')
  const imgInputRef = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        discountPrice: form.discountPrice ? Number(form.discountPrice) : null,
        stock: Number(form.stock),
        tags: form.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
      }
      if (product?._id) {
        const res = await api.put(`/admin/products/${product._id}`, payload)
        onSave(res.data, 'edit')
      } else {
        const res = await api.post('/admin/products', payload)
        onSave(res.data, 'add')
      }
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save product')
    } finally {
      setLoading(false)
    }
  }

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }))

  const handleImageFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = ev.target.result
      setUploadPreview(base64)
      set('image', base64)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-dark-border sticky top-0 bg-dark-card z-10">
          <h2 className="font-semibold text-lg">{product ? 'Edit Product' : 'Add Product'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-muted"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm text-slate-400 mb-1.5">Product Name *</label>
              <input className="input" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Blue Formal Shirt" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Category *</label>
              <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Brand</label>
              <input className="input" value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="e.g. Levis" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Price (₹) *</label>
              <input type="number" className="input" required min="0" value={form.price} onChange={e => set('price', e.target.value)} placeholder="1299" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Discount Price (₹)</label>
              <input type="number" className="input" min="0" value={form.discountPrice} onChange={e => set('discountPrice', e.target.value)} placeholder="999" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Barcode *</label>
              <input className="input" required value={form.barcode} onChange={e => set('barcode', e.target.value)} placeholder="8901234567890" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">RFID</label>
              <input className="input" value={form.rfid} onChange={e => set('rfid', e.target.value)} placeholder="RFC001" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Stock</label>
              <input type="number" className="input" min="0" value={form.stock} onChange={e => set('stock', e.target.value)} placeholder="100" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Status</label>
              <select className="input" value={form.isActive} onChange={e => set('isActive', e.target.value === 'true')}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm text-slate-400">Product Image</label>
                <div className="flex rounded-lg overflow-hidden border border-dark-border text-xs">
                  <button type="button" onClick={() => setImageMode('url')}
                    className={`px-2.5 py-1 flex items-center gap-1 transition-all ${
                      imageMode === 'url' ? 'bg-primary text-dark font-medium' : 'bg-dark-muted text-slate-400 hover:text-white'
                    }`}>
                    <Link className="w-3 h-3" />URL
                  </button>
                  <button type="button" onClick={() => setImageMode('upload')}
                    className={`px-2.5 py-1 flex items-center gap-1 transition-all ${
                      imageMode === 'upload' ? 'bg-primary text-dark font-medium' : 'bg-dark-muted text-slate-400 hover:text-white'
                    }`}>
                    <ImageUp className="w-3 h-3" />Upload
                  </button>
                </div>
              </div>
              {imageMode === 'url' ? (
                <input className="input" value={form.image} onChange={e => { set('image', e.target.value); setUploadPreview(e.target.value) }} placeholder="https://..." />
              ) : (
                <div>
                  <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
                  <button type="button" onClick={() => imgInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-700 text-slate-400 text-sm hover:border-primary/50 hover:text-primary transition-all">
                    <ImageUp className="w-4 h-4" />
                    {uploadPreview && uploadPreview.startsWith('data:') ? 'Change image' : 'Click to upload image'}
                  </button>
                </div>
              )}
              {(uploadPreview || form.image) && (
                <div className="mt-2 flex items-center gap-3">
                  <img src={uploadPreview || form.image} alt="preview"
                    className="w-16 h-16 rounded-xl object-cover border border-dark-border"
                    onError={e => { e.target.style.display = 'none' }} />
                  <span className="text-xs text-slate-500">Image preview</span>
                </div>
              )}
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-slate-400 mb-1.5">Tags (comma-separated)</label>
              <input className="input" value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="formal, shirt, blue, men" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-slate-400 mb-1.5">Description</label>
              <textarea className="input" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Product description..." />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              {loading && <Loader className="w-4 h-4 animate-spin" />}
              {loading ? 'Saving…' : product ? 'Save Changes' : 'Add Product'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null) // null | 'add' | product object
  const [deleting, setDeleting] = useState(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 15 }
      if (search) params.q = search
      const res = await api.get('/admin/products', { params })
      setProducts(res.data.products)
      setTotal(res.data.total)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [search, page])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const handleSave = (saved, action) => {
    if (action === 'add') { fetchProducts() }
    else { setProducts(prev => prev.map(p => p._id === saved._id ? saved : p)) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return
    setDeleting(id)
    try {
      await api.delete(`/admin/products/${id}`)
      setProducts(prev => prev.filter(p => p._id !== id))
      setTotal(t => t - 1)
    } catch (e) { alert(e.response?.data?.message || 'Delete failed') }
    finally { setDeleting(null) }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {modal && (
        <ProductModal
          product={modal === 'add' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="w-6 h-6 text-primary" />
          Products
          <span className="text-slate-500 text-lg font-normal">({total})</span>
        </h1>
        <button onClick={() => setModal('add')} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input className="input pl-9" placeholder="Search products…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-dark-muted/50 border-b border-dark-border">
              <tr>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Product</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Category</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Price</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Stock</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Barcode</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    {Array(7).fill(0).map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-3 bg-dark-muted rounded-full animate-pulse w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-500">No products found</td></tr>
              ) : products.map(product => (
                <tr key={product._id} className="hover:bg-dark-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={product.image || 'https://via.placeholder.com/40'} alt={product.name}
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        onError={e => { e.target.src = 'https://via.placeholder.com/40' }} />
                      <div>
                        <p className="font-medium text-white max-w-36 truncate">{product.name}</p>
                        <p className="text-xs text-slate-500">{product.brand}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="badge-green">{product.category}</span></td>
                  <td className="px-4 py-3">
                    <span className="text-primary font-semibold">₹{product.discountPrice || product.price}</span>
                    {product.discountPrice && (
                      <span className="text-slate-600 line-through text-xs ml-1.5">₹{product.price}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={product.stock <= 10 ? 'text-orange-400' : 'text-slate-300'}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{product.barcode}</td>
                  <td className="px-4 py-3">
                    <span className={product.isActive ? 'badge-green' : 'badge-red'}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setModal(product)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-all">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(product._id)} disabled={deleting === product._id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all">
                        {deleting === product._id
                          ? <Loader className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {total > 15 && (
        <div className="flex justify-center items-center gap-3 mt-4">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary px-4 py-2 text-sm disabled:opacity-40">Prev</button>
          <span className="text-sm text-slate-500">Page {page} of {Math.ceil(total / 15)}</span>
          <button disabled={page >= Math.ceil(total / 15)} onClick={() => setPage(p => p + 1)} className="btn-secondary px-4 py-2 text-sm disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  )
}
