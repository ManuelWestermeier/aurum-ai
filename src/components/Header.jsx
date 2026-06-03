import React, { useState } from 'react'
import { useStore } from '../store'
import { Menu, ChevronDown, Cpu, Zap } from 'lucide-react'

const MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', badge: 'Smart' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', badge: 'Fast' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', badge: '32K' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B', badge: 'Efficient' }
]

const MODE_LABELS = {
  chat: 'Chat', vision: 'Vision', audio: 'Audio',
  document: 'Documents', diagram: 'Diagrams', learn: 'Learn'
}

export default function Header({ activeMode }) {
  const { model, setModel, toggleSidebar } = useStore()
  const [open, setOpen] = useState(false)

  const current = MODELS.find(m => m.id === model) || MODELS[0]

  return (
    <header style={{
      height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px', borderBottom: '1px solid var(--black-border)',
      background: 'var(--black)', position: 'sticky', top: 0, zIndex: 10
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={toggleSidebar} style={iconBtn}>
          <Menu size={16} />
        </button>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--white-dim)' }}>
          {MODE_LABELS[activeMode] || 'Chat'}
        </span>
      </div>

      <div style={{ position: 'relative' }}>
        <button onClick={() => setOpen(!open)} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--black-soft)', border: '1px solid var(--black-border)',
          borderRadius: 6, padding: '6px 12px', cursor: 'pointer', color: 'var(--white-dim)',
          fontSize: 12, fontFamily: 'var(--font-sans)', transition: 'all 0.15s'
        }}>
          <Cpu size={12} style={{ color: 'var(--gold)' }} />
          {current.name}
          <span style={{ background: 'var(--gold-faint)', color: 'var(--gold)', fontSize: 10, padding: '1px 6px', borderRadius: 3 }}>{current.badge}</span>
          <ChevronDown size={12} style={{ color: 'var(--white-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>

        {open && (
          <div className="fade-in" style={{
            position: 'absolute', right: 0, top: '100%', marginTop: 6,
            background: 'var(--black-soft)', border: '1px solid var(--black-border)',
            borderRadius: 6, minWidth: 220, zIndex: 100, overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
          }}>
            {MODELS.map(m => (
              <button key={m.id} onClick={() => { setModel(m.id); setOpen(false) }} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', background: model === m.id ? 'var(--gold-faint)' : 'transparent',
                border: 'none', cursor: 'pointer', color: model === m.id ? 'var(--white)' : 'var(--white-muted)',
                fontSize: 13, fontFamily: 'var(--font-sans)', textAlign: 'left', transition: 'all 0.1s'
              }}
                onMouseEnter={e => { if (model !== m.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                onMouseLeave={e => { if (model !== m.id) e.currentTarget.style.background = 'transparent' }}
              >
                {model === m.id && <span style={{ color: 'var(--gold)', fontSize: 10 }}>✦</span>}
                <span style={{ flex: 1 }}>{m.name}</span>
                <span style={{ background: 'var(--black-border)', color: 'var(--white-muted)', fontSize: 10, padding: '1px 6px', borderRadius: 3 }}>{m.badge}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {open && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />}
    </header>
  )
}

const iconBtn = {
  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--white-muted)',
  padding: 6, borderRadius: 4, display: 'flex', alignItems: 'center', transition: 'color 0.15s'
}
