import React, { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useStore } from '../store'
import { streamChat, enhancePrompt } from '../api'
import {
  Send, Sparkles, Copy, Check, RotateCcw, Trash2,
  Zap, ChevronDown, Loader2, Wand2, StopCircle
} from 'lucide-react'

const SUGGESTIONS = [
  'Erkläre Quantencomputing einfach', 'Schreibe einen Business-Plan für eine SaaS-Idee',
  'Analysiere die Stärken und Schwächen von Remote Work', 'Erstelle ein Python-Skript zum CSV-Analysieren',
  'Was sind die wichtigsten KI-Trends 2025?', 'Schreibe einen professionellen E-Mail-Entwurf'
]

export default function ChatPanel() {
  const { model, activeConversationId, newConversation, addMessage, updateLastAssistantMessage, deleteMessage, getActiveConversation } = useStore()
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [enhancing, setEnhancing] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const abortRef = useRef(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  const conv = getActiveConversation()
  const messages = conv?.messages || []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = useCallback(async (userText) => {
    const text = (userText || input).trim()
    if (!text || streaming) return

    let convId = activeConversationId
    if (!convId) convId = newConversation()

    addMessage(convId, { role: 'user', content: text })
    addMessage(convId, { role: 'assistant', content: '' })
    setInput('')
    setStreaming(true)
    abortRef.current = false

    const conv = useStore.getState().getActiveConversation()
    const history = (conv?.messages || [])
      .filter(m => m.content)
      .slice(-20)
      .map(m => ({ role: m.role, content: m.content }))

    try {
      await streamChat({
        messages: [...history.slice(0, -1), { role: 'user', content: text }],
        model,
        onDelta: (full) => {
          if (abortRef.current) return
          updateLastAssistantMessage(convId, full)
        }
      })
    } catch (err) {
      updateLastAssistantMessage(convId, `*Error: ${err.message}*`)
    }
    setStreaming(false)
  }, [input, streaming, activeConversationId, model])

  const handleEnhance = async () => {
    if (!input.trim() || enhancing) return
    setEnhancing(true)
    try {
      const { enhanced } = await enhancePrompt({ prompt: input })
      setInput(enhanced)
    } catch {}
    setEnhancing(false)
    textareaRef.current?.focus()
  }

  const copyMsg = (id, content) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', position: 'relative' }}>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 24px' }}>
        {isEmpty ? (
          <EmptyState onSuggest={handleSubmit} />
        ) : (
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 0' }}>
            {messages.map((msg, i) => (
              <MessageBubble
                key={msg.id || i}
                msg={msg}
                isLast={i === messages.length - 1}
                streaming={streaming && i === messages.length - 1 && msg.role === 'assistant'}
                copiedId={copiedId}
                onCopy={copyMsg}
                onDelete={() => deleteMessage(conv.id, msg.id)}
                onRetry={msg.role === 'user' ? () => handleSubmit(msg.content) : null}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 24px 20px', background: 'linear-gradient(to top, var(--black) 70%, transparent)',
        borderTop: '1px solid var(--black-border)'
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{
            background: 'var(--black-soft)', border: '1px solid var(--black-border)',
            borderRadius: 8, overflow: 'hidden', transition: 'border-color 0.2s',
            position: 'relative'
          }}
            onFocus={() => {}}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask anything..."
              rows={1}
              style={{
                width: '100%', background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--white)', padding: '14px 16px 10px', fontSize: 14,
                fontFamily: 'var(--font-sans)', resize: 'none', lineHeight: 1.6,
                maxHeight: 200, overflowY: 'auto', minHeight: 52
              }}
              onInput={e => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', padding: '6px 12px 10px', gap: 6 }}>
              {/* Enhance prompt */}
              <button
                onClick={handleEnhance}
                disabled={!input.trim() || enhancing}
                title="Enhance prompt with AI"
                style={{
                  background: 'none', border: '1px solid var(--black-border)', borderRadius: 4,
                  color: enhancing ? 'var(--gold)' : 'var(--white-muted)', padding: '4px 10px',
                  cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5,
                  fontFamily: 'var(--font-sans)', transition: 'all 0.15s', opacity: input.trim() ? 1 : 0.4
                }}
              >
                {enhancing ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Wand2 size={12} />}
                Enhance
              </button>

              <div style={{ flex: 1 }} />

              <span style={{ fontSize: 11, color: 'var(--white-muted)', opacity: 0.5 }}>⏎ Send · ⇧⏎ Newline</span>

              {/* Stop / Send */}
              {streaming ? (
                <button onClick={() => { abortRef.current = true; setStreaming(false) }} style={sendBtnStyle(true)}>
                  <StopCircle size={16} />
                </button>
              ) : (
                <button onClick={() => handleSubmit()} disabled={!input.trim()} style={sendBtnStyle(false, !input.trim())}>
                  <Send size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ msg, isLast, streaming, copiedId, onCopy, onDelete, onRetry }) {
  const isUser = msg.role === 'user'
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="fade-in"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        marginBottom: 24, display: 'flex', flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start'
      }}
    >
      {/* Role label */}
      <div style={{ fontSize: 11, color: 'var(--white-muted)', marginBottom: 6, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
        {isUser ? (
          <span style={{ color: 'var(--gold)', fontFamily: 'var(--font-serif)' }}>You</span>
        ) : (
          <><span style={{ color: 'var(--gold)' }}>✦</span><span style={{ fontFamily: 'var(--font-serif)' }}>Aurum</span></>
        )}
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth: isUser ? '80%' : '100%',
        background: isUser ? 'var(--gold-faint)' : 'transparent',
        border: isUser ? '1px solid rgba(201,168,76,0.15)' : 'none',
        borderRadius: 6, padding: isUser ? '10px 14px' : '0',
        position: 'relative'
      }}>
        {isUser ? (
          <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--white-dim)', whiteSpace: 'pre-wrap' }}>{msg.content}</p>
        ) : (
          <div className="markdown-body">
            {msg.content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
            ) : streaming ? (
              <span style={{ color: 'var(--gold)', animation: 'shimmer 1.2s ease-in-out infinite' }}>●●●</span>
            ) : null}
          </div>
        )}
      </div>

      {/* Actions */}
      {hovered && msg.content && (
        <div className="fade-in" style={{ display: 'flex', gap: 4, marginTop: 6 }}>
          <MsgBtn icon={copiedId === msg.id ? Check : Copy} label="Copy" gold={copiedId === msg.id} onClick={() => onCopy(msg.id, msg.content)} />
          {onRetry && <MsgBtn icon={RotateCcw} label="Retry" onClick={onRetry} />}
          <MsgBtn icon={Trash2} label="Delete" danger onClick={onDelete} />
        </div>
      )}
    </div>
  )
}

function MsgBtn({ icon: Icon, label, onClick, gold, danger }) {
  return (
    <button onClick={onClick} title={label} style={{
      background: 'none', border: '1px solid var(--black-border)', borderRadius: 4,
      color: gold ? 'var(--gold)' : danger ? '#ef4444' : 'var(--white-muted)',
      padding: '3px 8px', cursor: 'pointer', fontSize: 11, display: 'flex',
      alignItems: 'center', gap: 4, fontFamily: 'var(--font-sans)', transition: 'all 0.15s'
    }}>
      <Icon size={11} /> {label}
    </button>
  )
}

function EmptyState({ onSuggest }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh', padding: 24 }}>
      <div style={{ marginBottom: 8, color: 'var(--gold)', fontSize: 36 }}>✦</div>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--white)', fontWeight: 300, marginBottom: 8 }}>Aurum AI</h1>
      <p style={{ color: 'var(--white-muted)', fontSize: 14, marginBottom: 40 }}>Your premium AI assistant</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 560, width: '100%' }}>
        {SUGGESTIONS.map((s, i) => (
          <button key={i} onClick={() => onSuggest(s)} style={{
            background: 'var(--black-soft)', border: '1px solid var(--black-border)',
            borderRadius: 6, padding: '12px 16px', textAlign: 'left', cursor: 'pointer',
            color: 'var(--white-dim)', fontSize: 13, fontFamily: 'var(--font-sans)',
            transition: 'all 0.15s', lineHeight: 1.5
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold-dim)'; e.currentTarget.style.color = 'var(--white)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--black-border)'; e.currentTarget.style.color = 'var(--white-dim)' }}
          >{s}</button>
        ))}
      </div>
    </div>
  )
}

const sendBtnStyle = (isStop, disabled) => ({
  background: isStop ? 'rgba(239,68,68,0.1)' : 'var(--gold-faint)',
  border: `1px solid ${isStop ? 'rgba(239,68,68,0.3)' : 'rgba(201,168,76,0.3)'}`,
  borderRadius: 4, color: isStop ? '#ef4444' : 'var(--gold)',
  padding: '6px 10px', cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  opacity: disabled ? 0.4 : 1, transition: 'all 0.15s'
})
