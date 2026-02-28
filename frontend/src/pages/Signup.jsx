import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Scan, Eye, EyeOff, Loader } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '', budget: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      await register(form.name, form.email, form.password, Number(form.budget) || 0)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 border border-primary/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Scan className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Flash<span className="text-primary">Cart</span></h1>
          <p className="text-slate-500 mt-2 text-sm">Join the future of retail</p>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-semibold mb-6">Create account</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Full Name</label>
              <input type="text" required className="input" placeholder="Your name"
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Email</label>
              <input type="email" required className="input" placeholder="you@example.com"
                value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} required className="input pr-12"
                  placeholder="Min 6 characters"
                  value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Shopping Budget (₹) <span className="text-slate-600">optional</span>
              </label>
              <input type="number" className="input" placeholder="e.g. 5000"
                value={form.budget} onChange={e => setForm(p => ({ ...p, budget: e.target.value }))} />
              <p className="text-xs text-slate-600 mt-1">AI will warn you if your cart exceeds this budget</p>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
              {loading && <Loader className="w-4 h-4 animate-spin" />}
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:text-primary-light font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
