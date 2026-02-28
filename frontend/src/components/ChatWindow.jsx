import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Sparkles, Loader, User, Bot, X, Minimize2, Maximize2 } from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

const QUICK_CHIPS = [
  'Show me deals',
  'Build an outfit',
  "What's in my cart?",
  'Check my budget',
]

export default function ChatWindow({ onClose }) {
  const { user } = useAuth()
  const { fetchCart } = useCart()
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi ${user?.name?.split(' ')[0] || 'there'}! I'm your FlashCart AI assistant. How can I help you shop today?`,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!minimized) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, minimized])

  const sendMessage = useCallback(async (text) => {
    const userText = (text || input).trim()
    if (!userText || loading) return

    const userMsg = { role: 'user', content: userText }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
      const res = await api.post('/ai/chat', { messages: history })
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.content }])
      if (res.data.toolsUsed?.includes('add_to_cart') || res.data.toolsUsed?.includes('remove_from_cart')) {
        fetchCart()
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error — please try again.' }])
    } finally {
      setLoading(false)
      if (!minimized) inputRef.current?.focus()
    }
  }, [input, messages, loading, fetchCart, minimized])

  return (
    <div className={`fixed z-50 shadow-2xl shadow-black/50 overflow-hidden border border-dark-border transition-all duration-300 flex flex-col
      inset-0 rounded-none
      sm:inset-auto sm:bottom-24 sm:right-6 sm:w-96 sm:rounded-2xl sm:max-w-[calc(100vw-24px)]
      ${minimized ? 'sm:h-14 h-full' : 'h-full sm:h-[500px]'}`}>
      {/* Header */}
      <div className="bg-dark-card border-b border-dark-border px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary/20 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-sm">FlashCart AI</span>
          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMinimized(p => !p)}
            className="hidden sm:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-muted transition-all">
            {minimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-muted transition-all">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-dark p-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 items-start animate-fade-in ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-primary/20' : 'bg-dark-card border border-dark-border'
                }`}>
                  {msg.role === 'user'
                    ? <User className="w-3.5 h-3.5 text-primary" />
                    : <Bot className="w-3.5 h-3.5 text-primary" />}
                </div>
                <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-primary text-dark font-medium rounded-tr-sm'
                    : 'bg-dark-card border border-dark-border text-slate-200 rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 items-start">
                <div className="w-6 h-6 rounded-lg bg-dark-card border border-dark-border flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="bg-dark-card border border-dark-border px-3 py-2 rounded-xl rounded-tl-sm flex gap-1 items-center">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce-dot"
                      style={{ animationDelay: `${i * 0.16}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick chips */}
          <div className="flex gap-1.5 overflow-x-auto px-3 py-2 bg-dark border-t border-dark-border scrollbar-none">
            {QUICK_CHIPS.map(chip => (
              <button key={chip} onClick={() => sendMessage(chip)} disabled={loading}
                className="px-2.5 py-1 bg-dark-card border border-dark-border rounded-full text-xs text-slate-400 hover:text-primary hover:border-primary/40 whitespace-nowrap transition-all disabled:opacity-50">
                {chip}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-2 p-3 bg-dark border-t border-dark-border">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendMessage() } }}
              placeholder="Ask AI anything…"
              disabled={loading}
              className="input flex-1 py-2 text-xs"
            />
            <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
              className="btn-primary px-3 py-2 flex-shrink-0 rounded-xl disabled:opacity-50">
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
