import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Smartphone, Banknote, Wallet, Loader, ArrowLeft, Shield, CheckCircle } from 'lucide-react'
import api from '../api/axios'
import { useCart } from '../context/CartContext'

const PAYMENT_METHODS = [
  { id: 'UPI', label: 'UPI', icon: Smartphone, desc: 'Google Pay, PhonePe, Paytm' },
  { id: 'Card', label: 'Debit/Credit Card', icon: CreditCard, desc: 'Visa, Mastercard, RuPay' },
  { id: 'Wallet', label: 'FlashCart Wallet', icon: Wallet, desc: 'Instant, no fees' },
  { id: 'Cash', label: 'Cash on Exit', icon: Banknote, desc: 'Pay at store exit counter' },
]

function luhn(v) {
  let s = 0, a = false
  for (let i = v.replace(/\s/g,'').length - 1; i >= 0; i--) {
    let d = parseInt(v.replace(/\s/g,'')[i])
    if (a) { d *= 2; if (d > 9) d -= 9 }
    s += d; a = !a
  }
  return s % 10 === 0
}

function formatCard(v) {
  return v.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim()
}

export default function Checkout() {
  const { cart, fetchCart } = useCart()
  const navigate = useNavigate()
  const [paymentMethod, setPaymentMethod] = useState('UPI')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // UPI fields
  const [upiId, setUpiId] = useState('')

  // Card fields
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '', name: '' })

  const items = cart.items || []
  const subtotal = cart.total || 0
  const tax = parseFloat((subtotal * 0.18).toFixed(2))
  const total = parseFloat((subtotal + tax).toFixed(2))

  if (items.length === 0) {
    navigate('/cart')
    return null
  }

  const validatePayment = () => {
    if (paymentMethod === 'UPI') {
      if (!upiId.match(/^[\w.\-+]+@[\w]+$/)) return 'Please enter a valid UPI ID (e.g. name@upi)'
    }
    if (paymentMethod === 'Card') {
      const raw = card.number.replace(/\s/g,'')
      if (raw.length !== 16 || !luhn(raw)) return 'Please enter a valid 16-digit card number'
      if (!card.expiry.match(/^(0[1-9]|1[0-2])\/\d{2}$/)) return 'Enter expiry as MM/YY'
      if (!card.cvv.match(/^\d{3,4}$/)) return 'Enter a valid CVV'
      if (!card.name.trim()) return 'Enter the name on card'
    }
    return null
  }

  const handleCheckout = async () => {
    const valErr = validatePayment()
    if (valErr) { setError(valErr); return }
    try {
      setError('')
      setLoading(true)
      const res = await api.post('/orders/checkout', { paymentMethod })
      await fetchCart()
      navigate(`/receipt/${res.data._id}`, { state: { order: res.data } })
    } catch (err) {
      setError(err.response?.data?.message || 'Checkout failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6">
      <button onClick={() => navigate('/cart')}
        className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to cart
      </button>

      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Payment method */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-4 sm:p-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Select Payment Method
            </h2>
            <div className="space-y-3">
              {PAYMENT_METHODS.map(({ id, label, icon: Icon, desc }) => (
                <label key={id}
                  className={`flex items-center gap-3 p-3 sm:p-4 rounded-xl cursor-pointer border transition-all ${
                    paymentMethod === id
                      ? 'border-primary/60 bg-primary/5'
                      : 'border-dark-border hover:border-primary/30 hover:bg-dark-muted/30'
                  }`}>
                  <input type="radio" name="payment" value={id}
                    checked={paymentMethod === id}
                    onChange={() => { setPaymentMethod(id); setError('') }}
                    className="accent-primary w-4 h-4" />
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    paymentMethod === id ? 'bg-primary/20' : 'bg-dark-muted'
                  }`}>
                    <Icon className={`w-5 h-5 ${paymentMethod === id ? 'text-primary' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <p className={`font-medium text-sm ${paymentMethod === id ? 'text-white' : 'text-slate-300'}`}>
                      {label}
                    </p>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                  {paymentMethod === id && <CheckCircle className="w-4 h-4 text-primary ml-auto flex-shrink-0" />}
                </label>
              ))}
            </div>
          </div>

          {/* UPI input */}
          {paymentMethod === 'UPI' && (
            <div className="card p-4 space-y-3 animate-fade-in">
              <h3 className="font-medium text-sm text-slate-300">Enter UPI Details</h3>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">UPI ID</label>
                <input className="input" placeholder="yourname@upi" value={upiId}
                  onChange={e => setUpiId(e.target.value)} />
                <p className="text-xs text-slate-600 mt-1">e.g. mobile@paytm · 98765@ybl · name@oksbi</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-dark-muted/30 p-3 rounded-lg">
                <Smartphone className="w-4 h-4 text-primary flex-shrink-0" />
                A payment request will be sent to your UPI app.
              </div>
            </div>
          )}

          {/* Card input */}
          {paymentMethod === 'Card' && (
            <div className="card p-4 space-y-4 animate-fade-in">
              <h3 className="font-medium text-sm text-slate-300">Enter Card Details</h3>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Card Number</label>
                <input className="input font-mono tracking-widest"
                  placeholder="0000 0000 0000 0000"
                  value={card.number}
                  maxLength={19}
                  onChange={e => setCard(p => ({ ...p, number: formatCard(e.target.value) }))} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Name on Card</label>
                <input className="input" placeholder="Full name as per card"
                  value={card.name}
                  onChange={e => setCard(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Expiry (MM/YY)</label>
                  <input className="input" placeholder="MM/YY"
                    maxLength={5}
                    value={card.expiry}
                    onChange={e => {
                      let v = e.target.value.replace(/[^\d/]/g,'')
                      if (v.length === 2 && !v.includes('/') && card.expiry.length < 2) v = v + '/'
                      setCard(p => ({ ...p, expiry: v }))
                    }} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">CVV</label>
                  <input className="input" placeholder="•••" type="password"
                    maxLength={4}
                    value={card.cvv}
                    onChange={e => setCard(p => ({ ...p, cvv: e.target.value.replace(/\D/g,'') }))} />
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-dark-muted/30 p-3 rounded-lg">
                <Shield className="w-4 h-4 text-primary flex-shrink-0" />
                Simulated payment — your card details are never stored.
              </div>
            </div>
          )}

          {/* FlashCart Wallet */}
          {paymentMethod === 'Wallet' && (
            <div className="card p-4 animate-fade-in">
              <div className="flex items-center gap-3 text-sm">
                <Wallet className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-white">FlashCart Wallet Balance</p>
                  <p className="text-slate-400 text-xs mt-0.5">Available: <span className="text-primary font-semibold">₹{(total + 500).toFixed(0)}</span> — Sufficient for this order.</p>
                </div>
              </div>
            </div>
          )}

          {/* Cash */}
          {paymentMethod === 'Cash' && (
            <div className="card p-4 animate-fade-in">
              <div className="flex items-start gap-3 text-sm">
                <Banknote className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-white">Pay at Exit Counter</p>
                  <p className="text-slate-400 text-xs mt-1">Show your digital receipt at the store exit gate. Pay in cash before exiting. Amount: <span className="text-primary font-semibold">₹{total.toFixed(0)}</span></p>
                </div>
              </div>
            </div>
          )}

          <div className="card p-3 sm:p-4 flex items-center gap-3 text-sm text-slate-400">
            <Shield className="w-5 h-5 text-primary flex-shrink-0" />
            <span>All transactions are encrypted and secure. This is a simulated payment environment.</span>
          </div>
        </div>

        {/* Order summary */}
        <div className="card p-4 sm:p-5 h-fit sticky top-20">
          <h2 className="font-semibold mb-4">Order Summary</h2>
          <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
            {items.map(item => (
              <div key={item.productId} className="flex justify-between text-sm gap-2">
                <span className="text-slate-400 truncate min-w-0 flex-1">{item.name} ×{item.quantity}</span>
                <span className="text-white flex-shrink-0">₹{(item.price * item.quantity).toFixed(0)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-dark-border pt-3 space-y-2 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal</span><span className="text-white">₹{subtotal.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>GST (18%)</span><span className="text-white">₹{tax.toFixed(0)}</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t border-dark-border pt-2">
              <span>Total</span><span className="text-primary">₹{total.toFixed(0)}</span>
            </div>
          </div>
          <button onClick={handleCheckout} disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 mt-4">
            {loading && <Loader className="w-4 h-4 animate-spin" />}
            {loading ? 'Processing…' : `Pay ₹${total.toFixed(0)}`}
          </button>
          <p className="text-center text-xs text-slate-600 mt-2">via {paymentMethod}</p>
        </div>
      </div>
    </div>
  )
}
