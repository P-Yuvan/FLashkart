import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import {
  Camera, CameraOff, ShoppingCart, X, CheckCircle, Loader,
  Sparkles, ScanLine, RefreshCw, Cpu, QrCode, ImageUp, Zap
} from 'lucide-react'
import api from '../api/axios'
import { useCart } from '../context/CartContext'
import WalmartScanner from '../components/WalmartScanner'

// ─── COCO-SSD lazy loader ────────────────────────────────────────────────────
let cocoModel = null
let tfLoaded = false
async function loadCocoModel() {
  if (cocoModel) return cocoModel
  if (!tfLoaded) { await import('@tensorflow/tfjs'); tfLoaded = true }
  const cocoSsd = await import('@tensorflow-models/coco-ssd')
  cocoModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' })
  return cocoModel
}

const COCO_MAP = {
  'laptop':        { category: 'Electronics', q: 'laptop' },
  'cell phone':    { category: 'Electronics', q: 'phone' },
  'keyboard':      { category: 'Electronics', q: 'keyboard' },
  'mouse':         { category: 'Electronics', q: 'mouse' },
  'tv':            { category: 'Electronics', q: 'tv' },
  'remote':        { category: 'Electronics', q: 'remote' },
  'bottle':        { category: 'Grocery',     q: 'bottle beverage' },
  'cup':           { category: 'Grocery',     q: 'beverage' },
  'bowl':          { category: 'Grocery',     q: 'snack food' },
  'apple':         { category: 'Grocery',     q: 'fruit' },
  'banana':        { category: 'Grocery',     q: 'fruit' },
  'backpack':      { category: 'Accessories', q: 'bag backpack' },
  'handbag':       { category: 'Accessories', q: 'bag' },
  'tie':           { category: 'Clothing',    q: 'tie formal' },
  'suitcase':      { category: 'Accessories', q: 'bag' },
  'sports ball':   { category: 'Sports',      q: 'ball sports' },
  'tennis racket': { category: 'Sports',      q: 'racket' },
  'person':        { category: 'Clothing',    q: 'shirt casual' },
}

async function cocoFindProducts(detected) {
  const m = COCO_MAP[detected.class.toLowerCase()]
  const params = {}
  if (m?.category) params.category = m.category
  if (m?.q)        params.q = m.q
  for (const p of [params, { q: detected.class }, m?.category ? { category: m.category } : null]) {
    if (!p) continue
    try {
      const r = await api.get('/products', { params: { ...p, limit: 5 } })
      const items = r.data?.products || r.data
      if (items?.length) return { products: items, label: detected.class, score: detected.score, fallback: !m?.q }
    } catch {}
  }
  return null
}

// ─── Load any image file (including HEIC) into a canvas ──────────────────────
async function fileToCanvas(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width  = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d').drawImage(img, 0, 0)
      resolve(canvas)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}

// ─── File-based barcode scan: BarcodeDetector → ZXing → html5-qrcode ─────────
async function scanBarcodeFromFile(file) {
  // Step 1: render into canvas (handles HEIC on iOS/macOS Safari natively)
  const canvas = await fileToCanvas(file)

  // Step 2: BarcodeDetector — best at finding small barcodes in large photos
  if (canvas && 'BarcodeDetector' in window) {
    try {
      const det = new window.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'qr_code', 'code_128', 'code_39', 'upc_a', 'upc_e'],
      })
      const hits = await det.detect(canvas)
      if (hits.length) return hits[0].rawValue
    } catch {}
  }

  // Step 3: ZXing decodeFromCanvas
  if (canvas) {
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const result = await new BrowserMultiFormatReader().decodeFromCanvas(canvas)
      if (result) return result.getText()
    } catch {}
  }

  // Step 4: html5-qrcode fallback on canvas blob (for standard JPEG/PNG)
  const blob = canvas
    ? await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.92))
    : null
  const src = blob ? new File([blob], 'scan.jpg', { type: 'image/jpeg' }) : file
  const qr = new Html5Qrcode('fc-file-scanner-hidden')
  try {
    const code = await qr.scanFile(src, false)
    qr.clear()
    return code
  } catch { qr.clear(); return null }
}

async function lookupProduct(code) {
  for (const url of [`/products/barcode/${encodeURIComponent(code)}`, `/products/scan/${encodeURIComponent(code)}`]) {
    try { const r = await api.get(url); if (r.data?._id) return r.data } catch {}
  }
  return null
}

export default function Scanner() {
  const [tab, setTab] = useState('barcode')
  const [showWalmart, setShowWalmart] = useState(false)

  // Upload-from-image state
  const [scanningFile,  setScanningFile]  = useState(false)
  const [fileProduct,   setFileProduct]   = useState(null)
  const [fileError,     setFileError]     = useState('')
  const [fileAdded,     setFileAdded]     = useState(false)
  const [fileAdding,    setFileAdding]    = useState(false)
  const uploadRef = useRef(null)

  // Object detect state
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const modelRef  = useRef(null)
  const [modelLoading, setModelLoading] = useState(false)
  const [modelReady,   setModelReady]   = useState(false)
  const [camActive,    setCamActive]    = useState(false)
  const [camError,     setCamError]     = useState('')
  const [detecting,    setDetecting]    = useState(false)
  const [detectResult, setDetectResult] = useState(null)
  const [selProduct,   setSelProduct]   = useState(null)
  const [facing,       setFacing]       = useState('environment')
  const [error,        setError]        = useState('')
  const [adding,       setAdding]       = useState(false)
  const [added,        setAdded]        = useState(false)
  const { addToCart, fetchCart } = useCart()

  // ── Upload barcode image ─────────────────────────────────────────────────
  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setFileError(''); setFileProduct(null); setFileAdded(false)
    setScanningFile(true)
    try {
      const code = await scanBarcodeFromFile(file)
      if (!code) { setFileError('Could not read barcode from image. Try a clearer photo.'); return }
      const product = await lookupProduct(code)
      if (product) {
        setFileProduct(product)
      } else {
        setFileError(`Barcode "${code}" — no matching product found.`)
      }
    } finally {
      setScanningFile(false)
    }
  }, [])

  const handleFileAddToCart = async () => {
    if (!fileProduct) return
    setFileAdding(true)
    try {
      await addToCart(fileProduct._id, 1)
      await fetchCart()
      setFileAdded(true)
      setTimeout(() => { setFileAdded(false); setFileProduct(null) }, 2500)
    } catch { setFileError('Failed to add to cart') }
    finally { setFileAdding(false) }
  }

  // ── COCO-SSD detect tab ───────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCamError('')
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
      setCamActive(true)
    } catch { setCamError('Camera access denied.') }
  }, [facing])

  useEffect(() => {
    if (tab !== 'detect') { streamRef.current?.getTracks().forEach(t => t.stop()); setCamActive(false); return }
    setModelLoading(true)
    loadCocoModel().then(m => { modelRef.current = m; setModelReady(true) })
      .catch(() => setError('Failed to load AI model.'))
      .finally(() => setModelLoading(false))
    startCamera()
    return () => streamRef.current?.getTracks().forEach(t => t.stop())
  }, [tab, startCamera])

  const captureAndDetect = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || detecting || !modelRef.current) return
    setError(''); setDetectResult(null); setSelProduct(null)
    const video = videoRef.current, canvas = canvasRef.current
    canvas.width = video.videoWidth; canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    setDetecting(true)
    try {
      const preds = await modelRef.current.detect(canvas)
      if (!preds?.length) { setError('No objects detected. Try better lighting.'); return }
      const sorted = preds.sort((a, b) => b.score - a.score)
      let result = null
      for (const pred of sorted) { result = await cocoFindProducts(pred); if (result) break }
      if (result) { setDetectResult(result); setSelProduct(result.products[0]) }
      else setError(`Detected: ${sorted.map(p => p.class).join(', ')} — no matching products.`)
    } catch { setError('Detection failed. Please try again.') }
    finally { setDetecting(false) }
  }, [detecting])

  const flipCamera = () => { setFacing(f => f === 'environment' ? 'user' : 'environment'); setDetectResult(null); setSelProduct(null) }

  const handleAdd = async (product) => {
    if (!product) return
    try {
      setAdding(true)
      await addToCart(product._id, 1)
      await fetchCart()
      setAdded(true)
      setTimeout(() => { setAdded(false); setDetectResult(null); setSelProduct(null) }, 2200)
    } catch { setError('Failed to add to cart') }
    finally { setAdding(false) }
  }

  const handleReset = () => { setDetectResult(null); setSelProduct(null); setError(''); setAdded(false) }

  const price       = selProduct ? (selProduct.discountPrice || selProduct.price) : 0
  const hasDiscount = selProduct?.discountPrice && selProduct.discountPrice < selProduct.price

  return (
    <>
      {/* Full-screen Walmart Scanner overlay */}
      {showWalmart && <WalmartScanner onClose={() => setShowWalmart(false)} />}

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-5">
          <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
            <QrCode className="w-6 h-6 text-primary" />
            Smart Scanner
          </h1>
          <p className="text-slate-500 text-sm mt-1">Scan barcodes or detect products with AI</p>
        </div>

        {/* Mode tabs */}
        <div className="flex rounded-xl overflow-hidden border border-slate-800 mb-5">
          {[
            { id: 'barcode', icon: QrCode, label: 'Barcode / QR' },
            { id: 'detect',  icon: Cpu,    label: 'Object Detect' },
          ].map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => { handleReset(); setTab(id) }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all ${
                tab === id ? 'bg-primary text-dark' : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {/* ── BARCODE TAB ───────────────────────────────────────────────── */}
        {tab === 'barcode' && (
          <div className="space-y-4">
            {/* Launch Walmart Scanner */}
            <button
              onClick={() => setShowWalmart(true)}
              className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-primary/30 hover:border-primary/60 transition-all group"
              style={{ padding: '28px 24px' }}
            >
              {/* Animated corner glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'radial-gradient(ellipse at center, rgba(0,255,136,0.08) 0%, transparent 70%)' }} />
              <div className="relative flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,255,136,0.12)', border: '2px solid rgba(0,255,136,0.3)' }}>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,255,136,0.2)' }}>
                    <QrCode className="w-7 h-7 text-primary" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-lg">Open Camera Scanner</p>
                  <p className="text-slate-400 text-sm mt-1">Walmart-style full-screen barcode scanner</p>
                  <div className="flex items-center justify-center gap-4 mt-3">
                    {[
                      { icon: Zap, label: 'Auto-add to cart' },
                      { icon: CheckCircle, label: 'Beep + vibration' },
                      { icon: ScanLine, label: 'Real-time scan' },
                    ].map(({ icon: Icon, label }) => (
                      <div key={label} className="flex items-center gap-1 text-xs text-slate-500">
                        <Icon className="w-3 h-3 text-primary" />{label}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="px-8 py-2.5 rounded-xl bg-primary text-dark text-sm font-bold">
                  Tap to Scan
                </div>
              </div>
            </button>

            {/* Upload barcode image */}
            <div>
              {/* Hidden div required by html5-qrcode scanFile */}
              <div id="fc-file-scanner-hidden" className="hidden" />
              <input ref={uploadRef} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={handleFileUpload} />
              <button
                onClick={() => { setFileProduct(null); setFileError(''); uploadRef.current?.click() }}
                disabled={scanningFile}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-700 text-slate-400 text-sm font-medium hover:border-primary/40 hover:text-primary transition-all disabled:opacity-50"
              >
                {scanningFile
                  ? <><Loader className="w-4 h-4 animate-spin" /> Reading barcode…</>
                  : <><ImageUp className="w-4 h-4" /> Upload Barcode Image</>}
              </button>
              <p className="text-xs text-slate-600 text-center mt-1">Upload a photo of any product barcode</p>
            </div>

            {/* File scan result */}
            {fileError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
                <span>{fileError}</span>
                <button onClick={() => setFileError('')}><X className="w-4 h-4" /></button>
              </div>
            )}
            {fileProduct && (
              <div className="card p-4 border-primary/40 animate-slide-up">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  <span className="text-primary text-sm font-medium">Barcode matched</span>
                  <span className="text-xs text-slate-600 font-mono ml-auto">{fileProduct.barcode}</span>
                </div>
                <div className="flex items-start gap-3">
                  <img src={fileProduct.image || 'https://placehold.co/64x64/1a2332/00ff88?text=IMG'} alt={fileProduct.name}
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                    onError={e => { e.target.src = 'https://placehold.co/64x64/1a2332/00ff88?text=IMG' }} />
                  <div className="flex-1">
                    <span className="badge-green text-xs mb-1 inline-block">{fileProduct.category}</span>
                    <h3 className="font-bold text-white">{fileProduct.name}</h3>
                    <p className="text-primary font-bold mt-1">₹{fileProduct.discountPrice || fileProduct.price}</p>
                  </div>
                </div>
                <button onClick={handleFileAddToCart} disabled={fileAdding || fileAdded}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium mt-3 transition-all ${fileAdded ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-primary text-dark'}`}>
                  {fileAdding ? <Loader className="w-4 h-4 animate-spin" />
                    : fileAdded ? <CheckCircle className="w-4 h-4" />
                    : <ShoppingCart className="w-4 h-4" />}
                  {fileAdded ? 'Added!' : fileAdding ? 'Adding…' : 'Add to Cart'}
                </button>
                {fileAdded && <p className="text-center text-primary text-xs mt-2 flex items-center justify-center gap-1"><Sparkles className="w-3 h-3 animate-bounce" /> Item added to cart!</p>}
              </div>
            )}

            {/* Manual entry */}
            <div className="card p-4">
              <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                <ScanLine className="w-3.5 h-3.5" /> Or enter barcode manually:
              </p>
              <form onSubmit={async (e) => {
                e.preventDefault()
                const val = e.target.code.value.trim()
                if (!val) return
                setFileError('')
                const product = await lookupProduct(val)
                if (product) { setFileProduct(product) }
                else setFileError(`No product found for: ${val}`)
              }} className="flex gap-2">
                <input name="code" className="input flex-1 text-sm" placeholder="e.g. 8904132948549" />
                <button type="submit" className="btn-primary px-4 py-2 text-sm">Search</button>
              </form>
            </div>
          </div>
        )}

        {/* ── OBJECT DETECT TAB ────────────────────────────────────────────── */}
        {tab === 'detect' && (
          <div>
            <div className="card overflow-hidden mb-4 relative bg-black">
              <video ref={videoRef} autoPlay playsInline muted
                className="w-full aspect-video object-cover"
                style={{ display: camActive ? 'block' : 'none' }} />
              <canvas ref={canvasRef} className="hidden" />

              {!camActive && !camError && (
                <div className="aspect-video flex items-center justify-center">
                  <Loader className="w-8 h-8 text-primary animate-spin" />
                </div>
              )}
              {camError && (
                <div className="aspect-video flex flex-col items-center justify-center gap-3 p-6">
                  <CameraOff className="w-12 h-12 text-slate-600" />
                  <p className="text-slate-400 text-sm">{camError}</p>
                  <button onClick={startCamera} className="btn-secondary text-sm flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" /> Retry
                  </button>
                </div>
              )}

              {camActive && !detectResult && !detecting && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-64 h-48">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-lg" />
                    <div className="absolute inset-x-0 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
                  </div>
                </div>
              )}

              {detecting && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
                  <div className="flex gap-1">
                    {[0,1,2,3].map(i => (
                      <div key={i} className="w-2 h-8 bg-primary rounded-full animate-pulse"
                        style={{ animationDelay: `${i*0.15}s` }} />
                    ))}
                  </div>
                  <p className="text-primary text-sm font-medium">Detecting locally…</p>
                </div>
              )}

              {camActive && (
                <div className="absolute top-3 right-3">
                  <button onClick={flipCamera} className="p-2 bg-black/50 backdrop-blur rounded-xl text-white hover:bg-black/70 transition-all">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {modelLoading && (
              <p className="text-primary text-xs text-center mb-3 flex items-center justify-center gap-1">
                <Loader className="w-3 h-3 animate-spin" /> Loading AI model…
              </p>
            )}
            {modelReady && !detecting && !detectResult && (
              <p className="text-green-500 text-xs text-center mb-3 flex items-center justify-center gap-1">
                <CheckCircle className="w-3 h-3" /> Model ready — running locally in browser
              </p>
            )}
            {camActive && !detectResult && !detecting && (
              <button onClick={captureAndDetect} disabled={!modelReady}
                className="w-full btn-primary flex items-center justify-center gap-2 py-4 text-base font-semibold mb-4 disabled:opacity-50 disabled:cursor-not-allowed">
                <Camera className="w-5 h-5" />
                {modelReady ? 'Capture & Detect' : 'Loading Model…'}
              </button>
            )}
            {!detectResult && (
              <div className="card p-4 bg-slate-900/50">
                <p className="text-xs text-slate-500 font-medium mb-2 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Works best with
                </p>
                <ul className="text-xs text-slate-600 space-y-1">
                  <li>• Electronics: laptop, phone, keyboard, TV, remote</li>
                  <li>• Grocery: bottle, cup, food items</li>
                  <li>• Accessories: backpack, handbag, suitcase</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ── Detect: re-scan + error ──────────────────────────────────── */}
        {tab === 'detect' && (detectResult || error) && (
          <button onClick={handleReset} className="w-full btn-secondary flex items-center justify-center gap-2 py-3 mb-4">
            <ScanLine className="w-4 h-4" /> Scan Another Product
          </button>
        )}
        {tab === 'detect' && error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl mb-4 flex items-center justify-between">
            <span>{error}</span><button onClick={() => setError('')}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* ── Detect: product picker + card ──────────────────────────── */}
        {tab === 'detect' && detectResult && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-primary" />
              <span className="text-primary text-sm font-medium">
                Detected: <strong>{detectResult.label}</strong>
                <span className="text-slate-500 ml-1">({Math.round(detectResult.score * 100)}%)</span>
              </span>
              {detectResult.fallback && <span className="text-xs text-yellow-400 ml-auto">showing similar</span>}
            </div>
            {detectResult.products.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {detectResult.products.map(p => (
                  <button key={p._id} onClick={() => setSelProduct(p)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                      selProduct?._id === p._id ? 'border-primary text-primary bg-primary/10' : 'border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}>{p.name}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'detect' && selProduct && (
          <div className="card p-5 border-primary/40 animate-slide-up">
            <div className="flex items-start gap-4">
              <img src={selProduct.image || 'https://placehold.co/80x80/1a2332/00ff88?text=IMG'} alt={selProduct.name}
                className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                onError={e => { e.target.src = 'https://placehold.co/80x80/1a2332/00ff88?text=IMG' }} />
              <div className="flex-1">
                <span className="badge-green mb-1 inline-block">{selProduct.category}</span>
                <h2 className="font-bold text-lg text-white">{selProduct.name}</h2>
                <p className="text-slate-400 text-sm mt-1 line-clamp-2">{selProduct.description}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-primary font-bold text-xl">₹{price}</span>
                  {hasDiscount && <span className="text-slate-500 line-through text-sm">₹{selProduct.price}</span>}
                  {selProduct.stock <= 5 && selProduct.stock > 0 && (
                    <span className="text-orange-400 text-xs">Only {selProduct.stock} left!</span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={() => handleAdd(selProduct)} disabled={adding || added}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium mt-4 transition-all ${
                added ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-primary text-dark hover:bg-primary-dark'
              }`}>
              {adding ? <Loader className="w-4 h-4 animate-spin" />
                : added ? <CheckCircle className="w-4 h-4" />
                : <ShoppingCart className="w-4 h-4" />}
              {added ? 'Added to Cart!' : adding ? 'Adding…' : 'Add to Cart'}
            </button>
            {added && (
              <p className="text-center text-primary text-sm mt-2 flex items-center justify-center gap-1">
                <Sparkles className="w-4 h-4 animate-bounce" /> Item added — check your cart!
              </p>
            )}
          </div>
        )}
      </div>
    </>
  )
}
