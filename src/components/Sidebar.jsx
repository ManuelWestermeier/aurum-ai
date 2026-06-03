import React, { useState } from 'react'
import { useStore } from '../store'
import {
  MessageSquare, Plus, Pin, Trash2, Edit3, Check, X,
  ChevronDown, Search, Sparkles, BookOpen, BarChart2,
  Mic, FileText, Image, Settings, History
} from 'lucide-react'

const NAV_ITEMS = [
  { id: 'chat', icon: MessageSquare, label: 'Chat' },
  { id: 'vision', icon: Image, label: 'Vision' },
  { id: 'audio', icon: Mic, label: 'Audio' },
  { id: 'document', icon: FileText, label: 'Document' },
  { id: 'diagram', icon: BarChart2, label: 'Diagrams' },
  { id: 'learn', icon: BookOpen, label: 'Learn' },
]

export default function Sidebar({ activeMode, onModeChange }) {
  const { conversations, activeConversationId, sidebarOpen,
    newConversation, deleteConversation, setActiveConversation,
    pinConversation, renameConversation, clearHistory } = useStore()

  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  if (!sidebarOpen) return null

  const sorted = [...conversations]
    .filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.pinned - a.pinned) || (b.updatedAt - a.updatedAt))

  const pinned = sorted.filter(c => c.pinned)
  const recent = sorted.filter(c => !c.pinned)

  const handleNew = () => {
    const id = newConversation()
    onModeChange('chat')
  }

  const startEdit = (c, e) => {
    e.stopPropagation()
    setEditingId(c.id)
    setEditTitle(c.title)
  }

  const commitEdit = (id) => {
    if (editTitle.trim()) renameConversation(id, editTitle.trim())
    setEditingId(null)
  }

  const ConvItem = ({ c }) => (
    <div
      onClick={() => { setActiveConversation(c.id); onModeChange('chat') }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
        borderRadius: 4, cursor: 'pointer', position: 'relative',
        background: activeConversationId === c.id ? 'rgba(201,168,76,0.08)' : 'transparent',
        border: activeConversationId === c.id ? '1px solid rgba(201,168,76,0.15)' : '1px solid transparent',
        transition: 'all 0.15s',
        marginBottom: 1
      }}
      onMouseEnter={e => e.currentTarget.style.background = activeConversationId === c.id ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.03)'}
      onMouseLeave={e => e.currentTarget.style.background = activeConversationId === c.id ? 'rgba(201,168,76,0.08)' : 'transparent'}
    >
      {editingId === c.id ? (
        <input
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commitEdit(c.id); if (e.key === 'Escape') setEditingId(null) }}
          autoFocus
          onClick={e => e.stopPropagation()}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--white)', fontSize: 13, fontFamily: 'var(--font-sans)'
          }}
        />
      ) : (
        <span style={{ flex: 1, fontSize: 13, color: activeConversationId === c.id ? 'var(--white)' : 'var(--white-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {c.pinned && <span style={{ color: 'var(--gold)', marginRight: 4, fontSize: 10 }}>✦</span>}
          {c.title}
        </span>
      )}
      <div className="conv-actions" style={{ display: 'flex', gap: 2, opacity: 0, transition: 'opacity 0.15s' }}>
        {editingId === c.id ? (
          <>
            <IconBtn icon={Check} size={12} onClick={e => { e.stopPropagation(); commitEdit(c.id) }} />
            <IconBtn icon={X} size={12} onClick={e => { e.stopPropagation(); setEditingId(null) }} />
          </>
        ) : (
          <>
            <IconBtn icon={Edit3} size={12} onClick={e => startEdit(c, e)} />
            <IconBtn icon={Pin} size={12} onClick={e => { e.stopPropagation(); pinConversation(c.id) }} gold={c.pinned} />
            <IconBtn icon={Trash2} size={12} onClick={e => { e.stopPropagation(); deleteConversation(c.id) }} danger />
          </>
        )}
      </div>
      <style>{`.conv-actions { opacity: 0 } div:hover > .conv-actions { opacity: 1 !important }`}</style>
    </div>
  )

  return (
    <aside style={{
      width: 240, minWidth: 240, height: '100vh', background: 'var(--black-soft)',
      borderRight: '1px solid var(--black-border)', display: 'flex', flexDirection: 'column',
      overflow: 'hidden', position: 'relative'
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--black-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--gold)', fontSize: 20 }}>✦</span>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 20, letterSpacing: '0.05em', color: 'var(--white)' }}>Aurum</span>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--gold)', fontStyle: 'italic' }}>AI</span>
        </div>
      </div>

      {/* Mode Nav */}
      <div style={{ padding: '12px 8px', borderBottom: '1px solid var(--black-border)' }}>
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => { onModeChange(id); if (id === 'chat' && !activeConversationId) newConversation() }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 10px', borderRadius: 4, border: 'none', cursor: 'pointer',
              background: activeMode === id ? 'var(--gold-faint)' : 'transparent',
              color: activeMode === id ? 'var(--gold)' : 'var(--white-muted)',
              fontSize: 13, fontFamily: 'var(--font-sans)', fontWeight: 300,
              transition: 'all 0.15s', textAlign: 'left', marginBottom: 1
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* New Conversation */}
      <div style={{ padding: '10px 8px 4px' }}>
        <button onClick={handleNew} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 10px', borderRadius: 4, border: '1px dashed var(--black-border)',
          background: 'transparent', color: 'var(--white-muted)', cursor: 'pointer',
          fontSize: 13, fontFamily: 'var(--font-sans)', transition: 'all 0.15s'
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold-dim)'; e.currentTarget.style.color = 'var(--gold)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--black-border)'; e.currentTarget.style.color = 'var(--white-muted)' }}
        >
          <Plus size={14} /> New conversation
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '6px 8px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--white-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search history..."
            style={{
              width: '100%', background: 'var(--black-mid)', border: '1px solid var(--black-border)',
              borderRadius: 4, padding: '6px 8px 6px 28px', color: 'var(--white-dim)',
              fontSize: 12, fontFamily: 'var(--font-sans)', outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Conversations */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
        {pinned.length > 0 && (
          <>
            <div style={{ fontSize: 10, color: 'var(--white-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '8px 4px 4px' }}>Pinned</div>
            {pinned.map(c => <ConvItem key={c.id} c={c} />)}
          </>
        )}
        {recent.length > 0 && (
          <>
            <div style={{ fontSize: 10, color: 'var(--white-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '8px 4px 4px' }}>Recent</div>
            {recent.map(c => <ConvItem key={c.id} c={c} />)}
          </>
        )}
        {sorted.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--white-muted)', fontSize: 12, padding: '24px 0' }}>
            No conversations yet
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 8px', borderTop: '1px solid var(--black-border)' }}>
        {showClearConfirm ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--white-muted)', flex: 1 }}>Clear all history?</span>
            <button onClick={() => { clearHistory(); setShowClearConfirm(false) }} style={dangerBtn}>Yes</button>
            <button onClick={() => setShowClearConfirm(false)} style={ghostBtn}>No</button>
          </div>
        ) : (
          <button onClick={() => setShowClearConfirm(true)} style={{ ...ghostBtn, width: '100%', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <History size={12} /> Clear all history
          </button>
        )}
      </div>
    </aside>
  )
}

function IconBtn({ icon: Icon, size = 14, onClick, gold, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 3, borderRadius: 3,
        color: danger ? '#ef4444' : gold ? 'var(--gold)' : 'var(--white-muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
    >
      <Icon size={size} />
    </button>
  )
}

const ghostBtn = {
  background: 'none', border: '1px solid var(--black-border)', borderRadius: 4,
  color: 'var(--white-muted)', padding: '4px 10px', cursor: 'pointer',
  fontSize: 12, fontFamily: 'var(--font-sans)'
}
const dangerBtn = {
  ...ghostBtn, borderColor: '#ef444440', color: '#ef4444'
}
