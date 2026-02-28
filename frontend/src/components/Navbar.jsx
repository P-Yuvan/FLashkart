import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ShoppingCart, Scan, Home, Package, User, LogOut, LayoutDashboard, Bot, ShoppingBag, BarChart3, ScanLine } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { itemCount } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const isAdmin = user?.role === 'admin'

  const handleLogout = () => { logout(); navigate('/login') }

  const userNavLinks = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/scanner', icon: Scan, label: 'Scanner' },
    { to: '/orders', icon: Package, label: 'Orders' },
    { to: '/ai-assistant', icon: Bot, label: 'AI' },
  ]

  const adminNavLinks = [
    { to: '/admin', icon: BarChart3, label: 'Dashboard', exact: true },
    { to: '/admin/products', icon: ShoppingBag, label: 'Products' },
    { to: '/admin/transactions', icon: Package, label: 'Orders' },
    { to: '/admin/scan-add', icon: ScanLine, label: 'Scan & Add' },
  ]

  const navLinks = isAdmin ? adminNavLinks : userNavLinks
  const isActive = (to, exact) => exact ? location.pathname === to : location.pathname.startsWith(to) && (to !== '/admin' || location.pathname === '/admin')

  if (!user) return null

  return (
    <nav className="sticky top-0 z-40 bg-dark-card/95 backdrop-blur-md border-b border-dark-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={isAdmin ? '/admin' : '/'} className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center group-hover:shadow-[0_0_12px_rgba(0,255,136,0.5)] transition-all">
              <Scan className="w-5 h-5 text-dark" />
            </div>
            <span className="text-xl font-bold">Flash<span className="text-primary">Cart</span></span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, icon: Icon, label, exact }) => (
              <Link key={to} to={to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive(to, exact)
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-400 hover:text-white hover:bg-dark-muted/50'
                }`}>
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {!isAdmin && (
              <Link to="/cart" className="relative p-2 rounded-xl hover:bg-dark-muted transition-all">
                <ShoppingCart className="w-5 h-5 text-slate-300" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-dark text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </Link>
            )}
            <Link to="/profile" className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-dark-muted transition-all">
              <div className="w-8 h-8 bg-primary/20 border border-primary/30 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <span className="hidden sm:block text-sm text-slate-300 max-w-24 truncate">
                {user.name?.split(' ')[0]}
              </span>
            </Link>
            <button onClick={handleLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile bottom nav */}
        <div className="md:hidden flex items-center justify-around pb-2">
          {navLinks.map(({ to, icon: Icon, label, exact }) => (
            <Link key={to} to={to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs transition-all ${
                isActive(to, exact) ? 'text-primary' : 'text-slate-500 hover:text-white'
              }`}>
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
