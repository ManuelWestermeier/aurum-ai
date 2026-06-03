import React, { useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useDropzone } from 'react-dropzone'
import { analyzeImage, transcribeAudio, analyzeDocument, generateDiagram, learnTopic } from '../api'
import { Upload, Image, Mic, FileText, BarChart2, BookOpen, Loader2, AlertCircle, Check } from 'lucide-react'

// ─── Shared ──────────────────────────────────────────────────────────────────

function PanelShell({ icon: Icon, title, subtitle, children }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '40px 32px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Icon size={20} style={{ color: 'var(--gold)' }} />
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', color: 'var(--white)', fontWeight: 400 }}>{title}</h2>
        </div>
        <p style={{ color: 'var(--white-muted)', fontSize: 13, marginBottom: 32 }}>{subtitle}</p>
        {children}
      </div>
    </div>
  )
}

function DropZone({ accept, label, onFile }) {
  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop: files => files[0] && onFile(files[0]),
    accept, multiple: false
  })
  return (
    <div {...getRootProps()} style={{
      border: `1px dashed ${isDragActive ? 'var(--gold)' : 'var(--black-border)'}`,
      borderRadius: 8, padding: '32px 24px', textAlign: 'center', cursor: 'pointer',
      background: isDragActive ? 'var(--gold-faint)' : 'var(--black-soft)',
      transition: 'all 0.2s', marginBottom: 20
    }}>
      <input {...getInputProps()} />
      <Upload size={24} style={{ color: isDragActive ? 'var(--gold)' : 'var(--white-muted)', marginBottom: 10 }} />
      <p style={{ color: isDragActive ? 'var(--gold)' : 'var(--white-muted)', fontSize: 13 }}>
        {acceptedFiles[0] ? (
          <span style={{ color: 'var(--white)' }}><Check size={12} style={{ display: 'inline', marginRight: 4, color: 'var(--gold)' }} />{acceptedFiles[0].name}</span>
        ) : label}
      </p>
    </div>
  )
}

function ResultBox({ content, loading, error }) {
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 20, color: 'var(--white-muted)' }}>
      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: 'var(--gold)' }} />
      <span style={{ fontSize: 13 }}>Processing…</span>
    </div>
  )
  if (error) return (
    <div style={{ display: 'flex', gap: 8, padding: '12px 16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, color: '#ef4444', fontSize: 13 }}>
      <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
    </div>
  )
  if (!content) return null
  return (
    <div style={{ background: 'var(--black-soft)', border: '1px solid var(--black-border)', borderRadius: 8, padding: '20px 24px' }}>
      <div className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown></div>
    </div>
  )
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      background: 'var(--black-mid)', border: '1px solid var(--black-border)', borderRadius: 4,
      color: 'var(--white-dim)', padding: '6px 10px', fontSize: 13, fontFamily: 'var(--font-sans)',
      cursor: 'pointer', outline: 'none'
    }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function RunButton({ onClick, loading, label = 'Analyze' }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      background: 'var(--gold-faint)', border: '1px solid rgba(201,168,76,0.3)',
      borderRadius: 6, color: 'var(--gold)', padding: '10px 24px', cursor: loading ? 'not-allowed' : 'pointer',
      fontSize: 13, fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: 8,
      opacity: loading ? 0.6 : 1, transition: 'all 0.15s'
    }}>
      {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
      {label}
    </button>
  )
}

// ─── Vision Panel ─────────────────────────────────────────────────────────────
export function VisionPanel() {
  const [file, setFile] = useState(null)
  const [url, setUrl] = useState('')
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)

  const handleFile = (f) => { setFile(f); setPreview(URL.createObjectURL(f)) }

  const run = async () => {
    if (!file && !url.trim()) return
    setLoading(true); setError(null); setResult(null)
    try {
      const data = await analyzeImage({ file, url: url || undefined, prompt })
      setResult(data.content)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  return (
    <PanelShell icon={Image} title="Vision Analysis" subtitle="Upload an image or provide a URL — Aurum will analyze it in detail.">
      <DropZone accept={{ 'image/*': [] }} label="Drop an image, or click to browse" onFile={handleFile} />
      {preview && <img src={preview} style={{ maxHeight: 200, borderRadius: 6, marginBottom: 16, border: '1px solid var(--black-border)' }} />}
      <div style={{ marginBottom: 12 }}>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Or paste image URL…"
          style={{ width: '100%', background: 'var(--black-soft)', border: '1px solid var(--black-border)', borderRadius: 6, padding: '10px 14px', color: 'var(--white-dim)', fontSize: 13, fontFamily: 'var(--font-sans)', outline: 'none', marginBottom: 10 }} />
        <input value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Custom instruction (optional)…"
          style={{ width: '100%', background: 'var(--black-soft)', border: '1px solid var(--black-border)', borderRadius: 6, padding: '10px 14px', color: 'var(--white-dim)', fontSize: 13, fontFamily: 'var(--font-sans)', outline: 'none' }} />
      </div>
      <RunButton onClick={run} loading={loading} label="Analyze Image" />
      <div style={{ marginTop: 20 }}><ResultBox content={result} loading={loading} error={error} /></div>
    </PanelShell>
  )
}

// ─── Audio Panel ──────────────────────────────────────────────────────────────
export function AudioPanel() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const run = async () => {
    if (!file) return
    setLoading(true); setError(null); setResult(null)
    try {
      const data = await transcribeAudio({ file })
      setResult(`**Transcription** (${data.language?.toUpperCase() || '?'} · ${Math.round(data.duration || 0)}s)\n\n${data.text}`)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  return (
    <PanelShell icon={Mic} title="Audio Transcription" subtitle="Upload an audio file — Aurum transcribes it with Whisper.">
      <DropZone accept={{ 'audio/*': [] }} label="Drop audio file (.mp3, .wav, .m4a, .ogg…)" onFile={setFile} />
      {file && <p style={{ fontSize: 12, color: 'var(--white-muted)', marginBottom: 12 }}>{file.name} · {(file.size / 1e6).toFixed(1)} MB</p>}
      <RunButton onClick={run} loading={loading} label="Transcribe" />
      <div style={{ marginTop: 20 }}><ResultBox content={result} loading={loading} error={error} /></div>
    </PanelShell>
  )
}

// ─── Document Panel ───────────────────────────────────────────────────────────
export function DocumentPanel() {
  const [file, setFile] = useState(null)
  const [text, setText] = useState('')
  const [task, setTask] = useState('analyze')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleFile = (f) => {
    setFile(f)
    const reader = new FileReader()
    reader.onload = e => setText(e.target.result)
    reader.readAsText(f)
  }

  const run = async () => {
    if (!text.trim()) return
    setLoading(true); setError(null); setResult(null)
    try {
      const data = await analyzeDocument({ text, filename: file?.name, task })
      setResult(data.content)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const TASKS = [
    { value: 'analyze', label: 'Full Analysis' },
    { value: 'summarize', label: 'Summarize' },
    { value: 'extract', label: 'Extract Key Info' },
    { value: 'questions', label: 'Generate Questions' },
    { value: 'simplify', label: 'Simplify' }
  ]

  return (
    <PanelShell icon={FileText} title="Document Analysis" subtitle="Upload a text file or paste content — Aurum extracts insights.">
      <DropZone accept={{ 'text/*': [], 'application/json': [] }} label="Drop a .txt, .md, .csv, or .json file" onFile={handleFile} />
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Or paste document text here…"
        style={{ width: '100%', minHeight: 120, background: 'var(--black-soft)', border: '1px solid var(--black-border)', borderRadius: 6, padding: '12px 14px', color: 'var(--white-dim)', fontSize: 13, fontFamily: 'var(--font-sans)', resize: 'vertical', outline: 'none', marginBottom: 14 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--white-muted)' }}>Task:</span>
        <Select value={task} onChange={setTask} options={TASKS} />
      </div>
      <RunButton onClick={run} loading={loading} label="Analyze Document" />
      <div style={{ marginTop: 20 }}><ResultBox content={result} loading={loading} error={error} /></div>
    </PanelShell>
  )
}

// ─── Diagram Panel ────────────────────────────────────────────────────────────
export function DiagramPanel() {
  const [topic, setTopic] = useState('')
  const [type, setType] = useState('flowchart')
  const [loading, setLoading] = useState(false)
  const [html, setHtml] = useState(null)
  const [error, setError] = useState(null)

  const run = async () => {
    if (!topic.trim()) return
    setLoading(true); setError(null); setHtml(null)
    try {
      const data = await generateDiagram({ topic, type })
      setHtml(data.html)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const TYPES = [
    { value: 'flowchart', label: 'Flowchart' },
    { value: 'mindmap', label: 'Mind Map' },
    { value: 'chart', label: 'Chart' },
    { value: 'timeline', label: 'Timeline' },
    { value: 'comparison', label: 'Comparison Table' },
    { value: 'interactive', label: 'Interactive Widget' }
  ]

  return (
    <PanelShell icon={BarChart2} title="Diagram & Visualization" subtitle="Describe a topic — Aurum generates a beautiful interactive visual.">
      <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Machine learning pipeline, Sales funnel, Roman Empire timeline…"
        style={{ width: '100%', background: 'var(--black-soft)', border: '1px solid var(--black-border)', borderRadius: 6, padding: '12px 14px', color: 'var(--white-dim)', fontSize: 13, fontFamily: 'var(--font-sans)', outline: 'none', marginBottom: 14 }}
        onKeyDown={e => e.key === 'Enter' && run()} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--white-muted)' }}>Type:</span>
        <Select value={type} onChange={setType} options={TYPES} />
      </div>
      <RunButton onClick={run} loading={loading} label="Generate" />
      {error && <div style={{ marginTop: 16 }}><ResultBox error={error} /></div>}
      {loading && <div style={{ marginTop: 20, display: 'flex', gap: 10, alignItems: 'center', color: 'var(--white-muted)', fontSize: 13 }}><Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: 'var(--gold)' }} /> Generating diagram…</div>}
      {html && (
        <div style={{ marginTop: 20, border: '1px solid var(--black-border)', borderRadius: 8, overflow: 'hidden' }}>
          <iframe srcDoc={html} style={{ width: '100%', minHeight: 420, border: 'none', background: 'var(--black)' }} sandbox="allow-scripts" title="diagram" />
        </div>
      )}
    </PanelShell>
  )
}

// ─── Learn Panel ──────────────────────────────────────────────────────────────
export function LearnPanel() {
  const [topic, setTopic] = useState('')
  const [level, setLevel] = useState('beginner')
  const [format, setFormat] = useState('explanation')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [flashcards, setFlashcards] = useState(null)
  const [cardIdx, setCardIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [error, setError] = useState(null)

  const run = async () => {
    if (!topic.trim()) return
    setLoading(true); setError(null); setResult(null); setFlashcards(null)
    try {
      const data = await learnTopic({ topic, level, format })
      if (format === 'flashcards') {
        try {
          const json = JSON.parse(data.content.replace(/```json|```/g, '').trim())
          setFlashcards(json); setCardIdx(0); setFlipped(false)
        } catch { setResult(data.content) }
      } else {
        setResult(data.content)
      }
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const LEVELS = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'expert', label: 'Expert' }
  ]
  const FORMATS = [
    { value: 'explanation', label: 'Explanation' },
    { value: 'eli5', label: 'ELI5' },
    { value: 'quiz', label: 'Quiz' },
    { value: 'flashcards', label: 'Flashcards' },
    { value: 'roadmap', label: 'Roadmap' }
  ]

  return (
    <PanelShell icon={BookOpen} title="Learn Mode" subtitle="Master any topic — explanations, flashcards, quizzes, and roadmaps.">
      <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Quantum computing, React hooks, Byzantine history…"
        style={{ width: '100%', background: 'var(--black-soft)', border: '1px solid var(--black-border)', borderRadius: 6, padding: '12px 14px', color: 'var(--white-dim)', fontSize: 13, fontFamily: 'var(--font-sans)', outline: 'none', marginBottom: 14 }}
        onKeyDown={e => e.key === 'Enter' && run()} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--white-muted)' }}>Level:</span>
          <Select value={level} onChange={setLevel} options={LEVELS} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--white-muted)' }}>Format:</span>
          <Select value={format} onChange={setFormat} options={FORMATS} />
        </div>
      </div>
      <RunButton onClick={run} loading={loading} label="Generate" />

      <div style={{ marginTop: 20 }}>
        {flashcards ? (
          <FlashcardDeck cards={flashcards} idx={cardIdx} flipped={flipped} setIdx={setCardIdx} setFlipped={setFlipped} />
        ) : (
          <ResultBox content={result} loading={loading} error={error} />
        )}
      </div>
    </PanelShell>
  )
}

function FlashcardDeck({ cards, idx, flipped, setIdx, setFlipped }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--white-muted)', marginBottom: 12, textAlign: 'center' }}>
        Card {idx + 1} / {cards.length}
      </div>
      <div
        onClick={() => setFlipped(!flipped)}
        style={{
          background: flipped ? 'var(--gold-faint)' : 'var(--black-soft)',
          border: `1px solid ${flipped ? 'rgba(201,168,76,0.25)' : 'var(--black-border)'}`,
          borderRadius: 10, padding: '40px 32px', textAlign: 'center',
          cursor: 'pointer', minHeight: 160, display: 'flex', alignItems: 'center',
          justifyContent: 'center', transition: 'all 0.3s', marginBottom: 16
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: flipped ? 'var(--gold)' : 'var(--white-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            {flipped ? 'Answer' : 'Question'}
          </div>
          <p style={{ color: flipped ? 'var(--white)' : 'var(--white-dim)', fontSize: 16, lineHeight: 1.6, fontFamily: flipped ? 'var(--font-serif)' : 'var(--font-sans)' }}>
            {flipped ? cards[idx].a : cards[idx].q}
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
        <button onClick={() => { setIdx(Math.max(0, idx - 1)); setFlipped(false) }} disabled={idx === 0}
          style={{ ...navBtn, opacity: idx === 0 ? 0.3 : 1 }}>← Prev</button>
        <button onClick={() => setFlipped(!flipped)} style={{ ...navBtn, borderColor: 'rgba(201,168,76,0.3)', color: 'var(--gold)' }}>
          Flip
        </button>
        <button onClick={() => { setIdx(Math.min(cards.length - 1, idx + 1)); setFlipped(false) }} disabled={idx === cards.length - 1}
          style={{ ...navBtn, opacity: idx === cards.length - 1 ? 0.3 : 1 }}>Next →</button>
      </div>
    </div>
  )
}

const navBtn = {
  background: 'none', border: '1px solid var(--black-border)', borderRadius: 6,
  color: 'var(--white-muted)', padding: '8px 20px', cursor: 'pointer',
  fontSize: 13, fontFamily: 'var(--font-sans)', transition: 'all 0.15s'
}
