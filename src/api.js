// All paths are relative — works locally via `wrangler pages dev`
// and in production on Cloudflare Pages automatically.
const BASE = '/api'

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(e.error || 'Request failed')
  }
  return res
}

export async function streamChat({ messages, model, onDelta }) {
  const res = await req('/chat', {
    method: 'POST',
    body: JSON.stringify({ messages, model, stream: true })
  })

  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const text = dec.decode(value)
    for (const line of text.split('\n')) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') return full
      try {
        const { delta } = JSON.parse(data)
        if (delta) { full += delta; onDelta(full) }
      } catch {}
    }
  }
  return full
}

export async function analyzeImage({ file, url, prompt, model }) {
  const fd = new FormData()
  if (file) fd.append('image', file)
  if (url) fd.append('imageUrl', url)
  fd.append('prompt', prompt || 'Analyze this image in detail.')
  if (model) fd.append('model', model)
  const res = await fetch(`${BASE}/vision`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error('Vision failed')
  return res.json()
}

export async function transcribeAudio({ file, model, language }) {
  const fd = new FormData()
  fd.append('audio', file)
  if (model) fd.append('model', model)
  if (language) fd.append('language', language)
  const res = await fetch(`${BASE}/audio`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error('Transcription failed')
  return res.json()
}

export async function analyzeDocument({ text, filename, task, model }) {
  const res = await req('/document', { method: 'POST', body: JSON.stringify({ text, filename, task, model }) })
  return res.json()
}

export async function enhancePrompt({ prompt, context }) {
  const res = await req('/enhance-prompt', { method: 'POST', body: JSON.stringify({ prompt, context }) })
  return res.json()
}

export async function generateDiagram({ topic, type, model }) {
  const res = await req('/generate-diagram', { method: 'POST', body: JSON.stringify({ topic, type, model }) })
  return res.json()
}

export async function learnTopic({ topic, level, format, model }) {
  const res = await req('/learn', { method: 'POST', body: JSON.stringify({ topic, level, format, model }) })
  return res.json()
}

export async function getModels() {
  const res = await req('/models')
  return res.json()
}
