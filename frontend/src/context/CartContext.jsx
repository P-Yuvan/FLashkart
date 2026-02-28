import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import { useAuth } from './AuthContext'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const { user } = useAuth()
  const [cart, setCart] = useState({ items: [], total: 0 })
  const [loading, setLoading] = useState(false)

  const fetchCart = useCallback(async () => {
    if (!user) { setCart({ items: [], total: 0 }); return }
    try {
      setLoading(true)
      const res = await api.get('/cart')
      setCart(res.data)
    } catch (e) {
      console.error('Failed to fetch cart', e)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchCart() }, [fetchCart])

  const addToCart = useCallback(async (productId, quantity = 1) => {
    const res = await api.post('/cart/add', { productId, quantity })
    setCart(res.data)
    return res.data
  }, [])

  const updateQuantity = useCallback(async (productId, quantity) => {
    const res = await api.put('/cart/update', { productId, quantity })
    setCart(res.data)
  }, [])

  const removeFromCart = useCallback(async (productId) => {
    const res = await api.delete(`/cart/remove/${productId}`)
    setCart(res.data)
  }, [])

  const clearCart = useCallback(async () => {
    await api.delete('/cart/clear')
    setCart({ items: [], total: 0 })
  }, [])

  const itemCount = cart.items?.reduce((s, i) => s + i.quantity, 0) || 0

  return (
    <CartContext.Provider value={{ cart, loading, itemCount, addToCart, updateQuantity, removeFromCart, clearCart, fetchCart }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
