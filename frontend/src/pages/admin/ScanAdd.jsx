import { useState, useRef, useEffect } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { ScanLine, CheckCircle, X, Camera, ImageUp, Package, Save, Loader, AlertCircle, RefreshCw } from 'lucide-react'
import api from '../../api/axios'

const CATEGORIES = ['Clothing', 'Electronics', 'Grocery', 'Footwear', 'Accessories', 'Beauty', 'Sports', 'Home']
const EMPTY = {
  name: '', description: '', category: 'Home', price: '', discountPrice: '',
  barcode: '', rfid: '', stock: '100', brand: '', tags: '', isActive: true, image: ''
}

export default function AdminScanAdd() {
  const [scanning, setScanning] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [status, setStatus] = useState(null) // { type: 'success'|'error'|'info', msg }
  const [saving, setSaving] = useState(false)
  const [scanned, setScanned] = useState(false)
  const [lookingUp, setLookingUp] = useState(false)
  const scannerRef = useRef(null)
  const html5QrRef = useRef(null)
  const fileInputRef = useRef(null)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // Start camera scanner
  const startScanner = async () => {
    setScanning(true)
    setStatus(null)
    await new Promise(r => setTimeout(r, 300))
    try {
      html5QrRef.current = new Html5Qrcode('admin-barcode-scanner')
      await html5QrRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 280, height: 120 } },
        async (code) => {
          await stopScanner()
          handleBarcodeDetected(code)
        },
        () => {}
      )
    } catch (err) {
      setScanning(false)
      setStatus({ type: 'error', msg: 'Camera not available. Use image upload instead.' })
    }
  }

  const stopScanner = async () => {
    try {
      await html5QrRef.current?.stop()
      html5QrRef.current?.clear()
    } catch {}
    setScanning(false)
  }

  useEffect(() => () => { stopScanner() }, [])

  // Scan barcode from image file
  const scanFromFile = async (file) => {
    if (!file) return
    setLookingUp(true)
    setStatus({ type: 'info', msg: 'Reading barcode from image…' })
    let code = null
    // Try BarcodeDetector first
    if ('BarcodeDetector' in window) {
      try {
        const url = URL.createObjectURL(file)
        const img = new Image()
        await new Promise(r => { img.onload = r; img.src = url })
        const canvas = document.createElement('canvas')
        canvas.width = img.width; canvas.height = img.height
        canvas.getContext('2d').drawImage(img, 0, 0)
        URL.revokeObjectURL(url)
        const det = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a'] })
        const hits = await det.detect(canvas)
        if (hits.length) code = hits[0].rawValue
      } catch {}
    }
    // Fallback: Html5Qrcode
    if (!code) {
      const qr = new Html5Qrcode('admin-file-scanner-hidden')
      try { code = await qr.scanFile(file, false); qr.clear() } catch { qr.clear() }
    }
    if (code) {
      handleBarcodeDetected(code)
    } else {
      setLookingUp(false)
      setStatus({ type: 'error', msg: 'Could not read barcode from this image. Try scanning below or enter manually.' })
    }
  }

  const handleBarcodeDetected = async (code) => {
    setScanned(true)
    set('barcode', code)
    setLookingUp(true)
    setStatus({ type: 'info', msg: `Barcode ${code} detected! Checking database…` })

    // Check if product already exists
    try {
      const res = await api.get(`/products/barcode/${encodeURIComponent(code)}`)
      if (res.data?._id) {
        setForm({
          name: res.data.name || '',
          description: res.data.description || '',
          category: res.data.category || 'Home',
          price: String(res.data.price || ''),
          discountPrice: String(res.data.discountPrice || ''),
          barcode: code,
          rfid: res.data.rfid || '',
          stock: String(res.data.stock || '100'),
          brand: res.data.brand || '',
          tags: res.data.tags?.join(', ') || '',
          isActive: res.data.isActive !== false,
          image: res.data.image || '',
        })
        if (res.data.image) setImagePreview(res.data.image)
        setStatus({ type: 'success', msg: `Product found: "${res.data.name}" — update details below` })
      } else {
        setStatus({ type: 'info', msg: `New product! Barcode: ${code} — fill in the details below` })
      }
    } catch {
      setStatus({ type: 'info', msg: `New product! Barcode: ${code} — fill in the details below` })
    } finally {
      setLookingUp(false)
    }
  }

  const handleImageChange = (file) => {
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = e => {
      setImagePreview(e.target.result)
      set('image', e.target.result) // store as base64
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.barcode) return setStatus({ type: 'error', msg: 'A barcode is required' })
    if (!form.name) return setStatus({ type: 'error', msg: 'Product name is required' })
    if (!form.price) return setStatus({ type: 'error', msg: 'Price is required' })

    setSaving(true)
    setStatus(null)
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        discountPrice: form.discountPrice ? Number(form.discountPrice) : null,
        stock: Number(form.stock) || 100,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      }
      // Check if exists to decide PUT vs POST
      try {
        const check = await api.get(`/products/barcode/${encodeURIComponent(form.barcode)}`)
        if (check.data?._id) {
          await api.put(`/admin/products/${check.data._id}`, payload)
          setStatus({ type: 'success', msg: `✓ "${form.name}" updated successfully!` })
        } else {
          throw new Error('not found')
        }
      } catch {
        await api.post('/admin/products', payload)
        setStatus({ type: 'success', msg: `✓ "${form.name}" added to store!` })
      }
      setTimeout(() => {
        setForm(EMPTY)
        setImagePreview(null)
        setImageFile(null)
        setScanned(false)
        setStatus(null)
      }, 2500)
    } catch (err) {
      setStatus({ type: 'error', msg: err.response?.data?.message || 'Failed to save product' })
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setForm(EMPTY); setImagePreview(null); setImageFile(null)
    setScanned(false); setStatus(null); stopScanner()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ScanLine className="w-6 h-6 text-primary" />
            Scan & Add Product
          </h1>
          <p className="text-sm text-slate-500 mt-1">Scan a barcode to auto-fill product details</p>
        </div>
        {scanned && (
          <button onClick={reset} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-all">
            <RefreshCw className="w-4 h-4" /> Reset
          </button>
        )}
      </div>

      {/* Status banner */}
      {status && (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-xl mb-5 text-sm border ${
          status.type === 'success' ? 'bg-primary/10 border-primary/30 text-primary'
          : status.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400'
          : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
        }`}>
          {status.type === 'success' ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
           : status.type === 'error' ? <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
           : <Loader className="w-4 h-4 mt-0.5 flex-shrink-0 animate-spin" />}
          {status.msg}
        </div>
      )}

      {/* ── Step 1: Scan ── */}
      {!scanned && (
        <div className="card p-5 mb-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-primary text-dark text-xs font-bold rounded-full flex items-center justify-center">1</span>
            Scan Barcode
          </h2>

          {/* Camera scanner area */}
          {scanning ? (
            <div className="relative">
              <div id="admin-barcode-scanner" ref={scannerRef} className="w-full rounded-xl overflow-hidden" />
              <button onClick={stopScanner} className="mt-3 w-full py-2.5 rounded-xl border border-dark-border text-slate-400 hover:text-white text-sm transition-all flex items-center justify-center gap-2">
                <X className="w-4 h-4" /> Stop Camera
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button onClick={startScanner}
                className="w-full py-3.5 btn-primary flex items-center justify-center gap-2 rounded-xl font-medium">
                <Camera className="w-5 h-5" /> Open Camera to Scan
              </button>

              <div className="relative flex items-center">
                <div className="flex-1 border-t border-dark-border" />
                <span className="px-3 text-xs text-slate-600">or upload barcode image</span>
                <div className="flex-1 border-t border-dark-border" />
              </div>

              <label className="w-full py-3 rounded-xl border border-dashed border-dark-border flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white hover:border-primary/40 cursor-pointer transition-all">
                <ImageUp className="w-4 h-4" />
                Upload photo of barcode
                <input type="file" accept="image/*" className="hidden" onChange={e => scanFromFile(e.target.files[0])} />
              </label>

              <div className="relative flex items-center">
                <div className="flex-1 border-t border-dark-border" />
                <span className="px-3 text-xs text-slate-600">or enter manually</span>
                <div className="flex-1 border-t border-dark-border" />
              </div>

              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Enter barcode number…"
                  value={form.barcode}
                  onChange={e => set('barcode', e.target.value)}
                />
                <button
                  onClick={() => form.barcode && handleBarcodeDetected(form.barcode)}
                  disabled={!form.barcode || lookingUp}
                  className="btn-primary px-4 rounded-xl flex items-center gap-2 disabled:opacity-50"
                >
                  {lookingUp ? <Loader className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                  Lookup
                </button>
              </div>
            </div>
          )}
          <div id="admin-file-scanner-hidden" className="hidden" />
        </div>
      )}

      {/* ── Step 2: Product Details Form ── */}
      {(scanned || form.barcode) && (
        <form onSubmit={handleSave} className="card p-5 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <span className="w-6 h-6 bg-primary text-dark text-xs font-bold rounded-full flex items-center justify-center">2</span>
            Product Details
            {form.barcode && <span className="ml-auto text-xs text-slate-500 font-normal font-mono">#{form.barcode}</span>}
          </h2>

          {/* Image upload */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Product Image</label>
            <div className="flex gap-4 items-start">
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="preview" className="w-24 h-24 rounded-xl object-cover border border-dark-border" />
                  <button type="button" onClick={() => { setImagePreview(null); setImageFile(null); set('image', '') }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ) : (
                <label className="w-24 h-24 rounded-xl border-2 border-dashed border-dark-border flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/40 transition-all text-slate-500 hover:text-primary">
                  <ImageUp className="w-5 h-5" />
                  <span className="text-xs">Upload</span>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => handleImageChange(e.target.files[0])} />
                </label>
              )}
              <div className="flex-1">
                <input className="input text-sm" placeholder="Or paste image URL…" value={imagePreview?.startsWith('data:') ? '' : (form.image || '')}
                  onChange={e => { set('image', e.target.value); setImagePreview(e.target.value || null) }} />
                <p className="text-xs text-slate-600 mt-1">Upload a file or paste a URL</p>
              </div>
            </div>
          </div>

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
              <input className="input" value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="e.g. Ulinacs" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">MRP (₹) *</label>
              <input type="number" className="input" required min="0" value={form.price} onChange={e => set('price', e.target.value)} placeholder="499" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Sale Price (₹)</label>
              <input type="number" className="input" min="0" value={form.discountPrice} onChange={e => set('discountPrice', e.target.value)} placeholder="399" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Stock</label>
              <input type="number" className="input" min="0" value={form.stock} onChange={e => set('stock', e.target.value)} placeholder="100" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">RFID Tag</label>
              <input className="input" value={form.rfid} onChange={e => set('rfid', e.target.value)} placeholder="RFC001" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-slate-400 mb-1.5">Description</label>
              <textarea className="input resize-none" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe the product…" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-slate-400 mb-1.5">Tags (comma-separated)</label>
              <input className="input" value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="shirt, formal, blue, cotton" />
            </div>
          </div>

          <button type="submit" disabled={saving}
            className="w-full btn-primary py-3 flex items-center justify-center gap-2 rounded-xl font-semibold mt-2 disabled:opacity-60">
            {saving ? <><Loader className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save to Store</>}
          </button>
        </form>
      )}
    </div>
  )
}
