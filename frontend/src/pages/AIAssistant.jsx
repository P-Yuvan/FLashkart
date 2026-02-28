import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Sparkles, Loader, User, Bot, ShoppingCart, X, RefreshCw } from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

const QUICK_CHIPS = [
  'Show me deals under ₹500',
  'Build an interview outfit',
  "What's in my cart?",
  'Show pillows and home decor',
  'Check my budget',
  'Recommend electronics',
]

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 items-start animate-fade-in ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-primary/20 border border-primary/30' : 'bg-dark-muted border border-dark-border'
      }`}>
        {isUser
          ? <User className="w-4 h-4 text-primary" />
          : <Bot className="w-4 h-4 text-primary" />}
      </div>
      <div className={`max-w-[78%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-primary text-dark font-medium rounded-tr-sm'
            : 'bg-dark-card border border-dark-border text-slate-200 rounded-tl-sm'
        }`}>
          {msg.content}
        </div>
        <span className="text-xs text-slate-600 px-1">
          {new Date(msg.timestamp || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 items-start animate-fade-in">
      <div className="w-8 h-8 rounded-xl bg-dark-muted border border-dark-border flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-primary" />
      </div>
      <div className="bg-dark-card border border-dark-border px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1.5 items-center h-10">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-2 h-2 bg-primary/60 rounded-full animate-bounce-dot"
            style={{ animationDelay: `${i * 0.16}s` }} />
        ))}
      </div>
    </div>
  )
}

export default function AIAssistant() {
  const { user } = useAuth()
  const { fetchCart } = useCart()
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hey ${user?.name?.split(' ')[0] || 'there'}! 👋 I'm FlashCart AI, your personal shopping assistant.\n\nI can help you find products, build outfits, add items to your cart, check your budget, and navigate the store.\n\nWhat are you shopping for today?`,
      timestamp: Date.now(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = useCallback(async (text) => {
    const userText = (text || input).trim()
    if (!userText || loading) return

    const userMsg = { role: 'user', content: userText, timestamp: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
      const res = await api.post('/ai/chat', { messages: history })
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.content,
        timestamp: Date.now(),
      }])
      if (res.data.toolsUsed?.includes('add_to_cart') || res.data.toolsUsed?.includes('remove_from_cart')) {
        fetchCart()
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now(),
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [input, messages, loading, fetchCart])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: `Chat cleared. What can I help you find today?`,
      timestamp: Date.now(),
    }])
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col h-[calc(100vh-72px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 border border-primary/30 rounded-xl flex items-center justify-center animate-pulse-green">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg">FlashCart AI</h1>
            <p className="text-xs text-primary flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-primary rounded-full inline-block animate-pulse" />
              Online · FlashCart AI Agent
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={clearChat}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-dark-muted transition-all"
            title="Clear chat">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto card p-4 space-y-4 mb-4">
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Quick chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
        {QUICK_CHIPS.map(chip => (
          <button key={chip} onClick={() => sendMessage(chip)} disabled={loading}
            className="px-3 py-1.5 bg-dark-card border border-dark-border rounded-full text-xs text-slate-400 hover:text-primary hover:border-primary/40 whitespace-nowrap transition-all disabled:opacity-50">
            {chip}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-3 items-end">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything… 'Find me a black shirt under ₹1000'"
          disabled={loading}
          rows={1}
          className="input flex-1 resize-none leading-relaxed py-3 min-h-12 max-h-32"
          style={{ height: 'auto' }}
          onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px' }}
        />
        <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
          className="btn-primary px-4 py-3 flex-shrink-0 rounded-xl disabled:opacity-50">
          {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>
    </div>
  )
}
