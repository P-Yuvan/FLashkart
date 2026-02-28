import { useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import ChatWindow from './ChatWindow'
import { useAuth } from '../context/AuthContext'

export default function FloatingAIButton() {
  const [open, setOpen] = useState(false)
  const { user } = useAuth()

  // Admin doesn't get AI shopping assistant
  if (user?.role === 'admin') return null

  return (
    <>
      {open && <ChatWindow onClose={() => setOpen(false)} />}
      <button
        onClick={() => setOpen(p => !p)}
        className={`floating-ai fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl items-center justify-center shadow-lg transition-all duration-300 ${
          open
            ? 'hidden'
            : 'flex bg-primary text-dark hover:bg-primary-dark animate-pulse-green'
        }`}
        title={open ? 'Close AI Assistant' : 'Open AI Assistant'}>
        {open
          ? <X className="w-5 h-5" />
          : <Sparkles className="w-6 h-6" />}
      </button>
    </>
  )
}
