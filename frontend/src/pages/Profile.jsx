import { useState } from 'react'
import { User, Mail, Phone, Wallet, Tag, Loader, CheckCircle, LogOut } from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const PREFERENCE_OPTIONS = ['Clothing', 'Electronics', 'Footwear', 'Grocery', 'Accessories', 'Sports', 'Home', 'Beauty']

export default function Profile() {
  const { user, updateUser, logout } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    budget: user?.budget || '',
    preferences: user?.preferences || [],
  })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const togglePref = (pref) => {
    setForm(p => ({
      ...p,
      preferences: p.preferences.includes(pref)
        ? p.preferences.filter(x => x !== pref)
        : [...p.preferences, pref]
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await api.put('/auth/me', { ...form, budget: Number(form.budget) || 0 })
      updateUser(res.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <User className="w-6 h-6 text-primary" />
        My Profile
      </h1>

      <div className="card p-6 mb-4">
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-dark-border">
          <div className="w-16 h-16 bg-primary/10 border-2 border-primary/30 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div>
            <p className="font-semibold text-lg">{user?.name}</p>
            <p className="text-slate-500 flex items-center gap-1.5 text-sm mt-1">
              <Mail className="w-3.5 h-3.5" />
              {user?.email}
            </p>
            <span className={`badge mt-1 inline-block ${user?.role === 'admin' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'badge-green'}`}>
              {user?.role}
            </span>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Full Name
            </label>
            <input className="input" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Phone Number
            </label>
            <input className="input" placeholder="+91 98765 43210" value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" /> Shopping Budget (₹)
            </label>
            <input type="number" className="input" placeholder="e.g. 5000" value={form.budget}
              onChange={e => setForm(p => ({ ...p, budget: e.target.value }))} />
            <p className="text-xs text-slate-600 mt-1">AI will alert you when your cart exceeds this amount</p>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-3 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> Shopping Preferences
            </label>
            <div className="flex flex-wrap gap-2">
              {PREFERENCE_OPTIONS.map(pref => (
                <button type="button" key={pref} onClick={() => togglePref(pref)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    form.preferences.includes(pref)
                      ? 'bg-primary text-dark'
                      : 'bg-dark-muted border border-dark-border text-slate-400 hover:text-white'
                  }`}>
                  {pref}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              saved
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'btn-primary'
            }`}>
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : null}
            {saved ? 'Saved!' : loading ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>

      <button onClick={handleLogout}
        className="btn-danger w-full flex items-center justify-center gap-2">
        <LogOut className="w-4 h-4" />
        Log Out
      </button>
    </div>
  )
}
