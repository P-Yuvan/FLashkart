import { useEffect, useRef, useState, useCallback } from 'react'
import { X, CheckCircle2, AlertCircle, ShoppingCart, Loader } from 'lucide-react'
import api from '../api/axios'
import { useCart } from '../context/CartContext'

function playBeep(freq = 1800, dur = 0.1) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
    osc.start(); osc.stop(ctx.currentTime + dur)
    osc.onended = () => ctx.close()
  } catch {}
}

export default function WalmartScanner({ onClose }) {
  const videoRef    = useRef(null)
  const streamRef   = useRef(null)
  const rafRef      = useRef(null)
  const readerRef   = useRef(null)      // ZXing reader
  const detectorRef = useRef(null)      // BarcodeDetector (desktop)
  const lastCodeRef = useRef('')
  const cartFnRef   = useRef(null)

  const [status,  setStatus]  = useState('loading')
  const [errMsg,  setErrMsg]  = useState('')
  const [flash,   setFlash]   = useState(false)
  const [toast,   setToast]   = useState(null)
  const [history, setHistory] = useState([])

  const { addToCart, fetchCart } = useCart()
  useEffect(() => { cartFnRef.current = { addToCart, fetchCart } }, [addToCart, fetchCart])

  const showToast = useCallback((type, msg, product = null) => {
    setToast({ type, msg, product })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const handleCode = useCallback(async (code) => {
    if (!code || code === lastCodeRef.current) return
    lastCodeRef.current = code
    setTimeout(() => { lastCodeRef.current = '' }, 3000)
    playBeep(1800, 0.08); setTimeout(() => playBeep(2200, 0.07), 90)
    setFlash(true); setTimeout(() => setFlash(false), 180)
    try {
      let product
      for (const url of [`/products/barcode/${encodeURIComponent(code)}`, `/products/scan/${encodeURIComponent(code)}`]) {
        try { const r = await api.get(url); product = r.data; break } catch {}
      }
      if (!product?._id) throw new Error()
      await cartFnRef.current.addToCart(product._id, 1)
      await cartFnRef.current.fetchCart()
      setHistory(h => [{ product, ts: Date.now() }, ...h.slice(0, 4)])
      showToast('ok', `Added: ${product.name}`, product)
    } catch {
      playBeep(400, 0.25)
      showToast('err', `Not found: ${code}`)
    }
  }, [showToast])

  // ── Start camera (shared by both paths) ──────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      const vid = videoRef.current
      if (!vid) return
      vid.srcObject = stream
      await vid.play()
      return true
    } catch {
      setStatus('error')
      setErrMsg('Camera access denied. Go to iPhone Settings → Safari → Camera → Allow.')
      return false
    }
  }, [])

  // ── Setup: BarcodeDetector (desktop) or ZXing (iOS/Firefox) ──────────────
  useEffect(() => {
    let cancelled = false

    const setup = async () => {
      const ok = await startCamera()
      if (!ok || cancelled) return

      if ('BarcodeDetector' in window) {
        // ── Desktop: use native BarcodeDetector ──────────────────────────
        detectorRef.current = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'qr_code', 'code_128', 'code_39', 'upc_a', 'upc_e', 'itf'],
        })
        if (!cancelled) setStatus('ready')

      } else {
        // ── iOS / Firefox: use ZXing ──────────────────────────────────────
        try {
          const { BrowserMultiFormatReader } = await import('@zxing/browser')
          // DecodeHintType numeric values: POSSIBLE_FORMATS=2, TRY_HARDER=3
          const hints = new Map()
          hints.set(3, true)  // TRY_HARDER — enables multi-angle, rotated barcode detection
          const reader = new BrowserMultiFormatReader(hints)
          readerRef.current = reader
          if (!cancelled) setStatus('ready')
        } catch {
          // ZXing import failed — fallback: try without hints
          try {
            const { BrowserMultiFormatReader } = await import('@zxing/browser')
            readerRef.current = new BrowserMultiFormatReader()
            if (!cancelled) setStatus('ready')
          } catch {
            setStatus('error')
            setErrMsg('Barcode decoder failed to load. Please refresh.')
          }
        }
      }
    }

    setup()

    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      readerRef.current = null
    }
  }, [startCamera])

  // ── BarcodeDetector scan loop (desktop) ───────────────────────────────────
  useEffect(() => {
    if (status !== 'ready' || !detectorRef.current) return
    const loop = async () => {
      const vid = videoRef.current
      if (vid?.readyState >= 2) {
        try {
          const hits = await detectorRef.current.detect(vid)
          if (hits.length) await handleCode(hits[0].rawValue)
        } catch {}
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [status, handleCode])

  // ── ZXing scan loop (iOS) — canvas-based for reliability ─────────────────
  useEffect(() => {
    if (status !== 'ready' || !readerRef.current) return
    const vid = videoRef.current
    if (!vid) return

    let active = true
    const canvas = document.createElement('canvas')
    const loop = async () => {
      if (!active) return
      try {
        if (vid.readyState >= 2 && vid.videoWidth > 0) {
          canvas.width  = vid.videoWidth
          canvas.height = vid.videoHeight
          canvas.getContext('2d').drawImage(vid, 0, 0)
          const result = await readerRef.current.decodeFromCanvas(canvas)
          if (result && active) await handleCode(result.getText())
        }
      } catch {}
      if (active) setTimeout(loop, 250)
    }

    loop()
    return () => { active = false }
  }, [status, handleCode])

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  return (
    <>
      <style>{`
        @keyframes scan-line {
          0%   { top: 4px }
          100% { top: calc(100% - 4px) }
        }
        @keyframes toast-in {
          from { opacity:0; transform:translate(-50%,-8px) }
          to   { opacity:1; transform:translate(-50%,0) }
        }
        @keyframes wm-spin { to { transform:rotate(360deg) } }
      `}</style>

      <div
        onClick={e => e.target === e.currentTarget && onClose()}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}
      >
        <div style={{
          width: '100%', maxWidth: 680, background: '#0b1120', borderRadius: 16,
          border: '1px solid rgba(0,255,136,0.2)', overflow: 'hidden',
          position: 'relative', boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
        }}>

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 8, height: 8, borderRadius: 4,
                background: status === 'ready' ? '#00ff88' : status === 'error' ? '#ef4444' : '#facc15',
                boxShadow: status === 'ready' ? '0 0 8px #00ff88' : 'none',
              }} />
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Barcode Scanner</span>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
                {status === 'ready' ? '— point at any barcode' : status === 'error' ? '— error' : '— starting…'}
              </span>
            </div>
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, width: 32, height: 32, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            }}><X size={16} /></button>
          </div>

          {/* Video */}
          <div style={{ position: 'relative', background: '#000', aspectRatio: '16/9', overflow: 'hidden' }}>
            <video ref={videoRef} autoPlay playsInline muted
              style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />

            {status === 'ready' && (
              <div style={{
                position: 'absolute', left: 0, right: 0, height: 2, zIndex: 2,
                background: 'linear-gradient(90deg,transparent,#00ff88,transparent)',
                boxShadow: '0 0 12px #00ff88',
                animation: 'scan-line 2s linear infinite', pointerEvents: 'none',
              }} />
            )}

            {flash && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 3,
                background: 'rgba(0,255,136,0.2)', pointerEvents: 'none',
              }} />
            )}

            {status === 'loading' && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 5,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 10, background: '#000',
              }}>
                <Loader size={32} color="#00ff88" style={{ animation: 'wm-spin 1s linear infinite' }} />
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>Starting camera…</p>
              </div>
            )}

            {status === 'error' && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 5,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 10, background: '#000', padding: 24,
              }}>
                <AlertCircle size={36} color="#ef4444" />
                <p style={{ color: '#ef4444', fontSize: 13, textAlign: 'center', maxWidth: 320, lineHeight: 1.6, margin: 0 }}>
                  {errMsg}
                </p>
              </div>
            )}

            {toast && (
              <div style={{
                position: 'absolute', top: 12, left: '50%', zIndex: 10,
                animation: 'toast-in 0.18s ease-out forwards', pointerEvents: 'none',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 14px', borderRadius: 10, whiteSpace: 'nowrap',
                  background: toast.type === 'ok' ? 'rgba(0,15,8,0.95)' : 'rgba(25,0,0,0.95)',
                  border: `1px solid ${toast.type === 'ok' ? '#00ff88' : '#ef4444'}`,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
                }}>
                  {toast.type === 'ok' ? <CheckCircle2 size={16} color="#00ff88" /> : <AlertCircle size={16} color="#ef4444" />}
                  <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0 }}>{toast.msg}</p>
                  {toast.type === 'ok' && <ShoppingCart size={14} color="#00ff88" />}
                </div>
              </div>
            )}
          </div>

          {/* Scan history */}
          {history.length > 0 && (
            <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 6px' }}>
                Scanned
              </p>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
                {history.map(h => (
                  <div key={h.ts} style={{
                    flexShrink: 0, padding: '5px 10px', borderRadius: 8,
                    background: 'rgba(0,255,136,0.07)', border: '1px solid rgba(0,255,136,0.15)',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <CheckCircle2 size={12} color="#00ff88" />
                    <span style={{ color: '#fff', fontSize: 11, fontWeight: 600, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {h.product.name}
                    </span>
                    <span style={{ color: '#00ff88', fontSize: 11 }}>₹{h.product.discountPrice || h.product.price}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{
            padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>
              <kbd style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, padding: '1px 4px' }}>Esc</kbd> to close
            </span>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>Auto-adds to cart on scan</span>
          </div>
        </div>
      </div>
    </>
  )
}
