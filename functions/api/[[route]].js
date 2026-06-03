/**
 * Aurum AI — Cloudflare Pages Functions
 * Route: /functions/api/[[route]].js
 * Handles: /api/chat, /api/vision, /api/audio, /api/document,
 *          /api/generate-diagram, /api/learn, /api/enhance-prompt, /api/models
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function cors(body, status = 200, extra = {}) {
  return new Response(body, { status, headers: { ...CORS, ...extra } })
}

function json(data, status = 200) {
  return cors(JSON.stringify(data), status, { 'Content-Type': 'application/json' })
}

function err(msg, status = 400) {
  return json({ error: msg }, status)
}

// ─── Groq fetch helper ────────────────────────────────────────────────────────
async function groq(env, endpoint, body) {
  const res = await fetch(`https://api.groq.com/openai/v1/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e.error?.message || `Groq ${res.status}`)
  }
  return res
}

async function groqForm(env, endpoint, formData) {
  const res = await fetch(`https://api.groq.com/openai/v1/${endpoint}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.GROQ_API_KEY}` },
    body: formData
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e.error?.message || `Groq ${res.status}`)
  }
  return res.json()
}

function systemPrompt() {
  return `You are Aurum — an ultra-premium AI assistant. Precise, intelligent, elegant.
- Be direct and substantive. No filler phrases.
- Format responses with markdown when helpful.
- When generating code, make it production-quality.
- When creating visualizations, use: black (#0a0a0a), white (#f5f5f0), gold (#C9A84C).
- Current date: ${new Date().toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
}

// ─── Route handlers ───────────────────────────────────────────────────────────

async function handleChat(request, env) {
  const { messages, model = 'llama-3.3-70b-versatile', stream = true } = await request.json()
  if (!messages?.length) return err('messages required')

  const body = {
    model,
    messages: [{ role: 'system', content: systemPrompt() }, ...messages],
    max_tokens: 4096,
    stream
  }

  if (!stream) {
    const res = await groq(env, 'chat/completions', body)
    const data = await res.json()
    return json({ content: data.choices[0].message.content, usage: data.usage })
  }

  // Streaming — proxy Groq SSE directly
  const groqRes = await groq(env, 'chat/completions', body)

  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const enc = new TextEncoder()

  // Stream Groq SSE → client SSE
  ;(async () => {
    const reader = groqRes.body.getReader()
    const dec = new TextDecoder()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = dec.decode(value)
        for (const line of text.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') { await writer.write(enc.encode('data: [DONE]\n\n')); break }
          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta?.content || ''
            if (delta) await writer.write(enc.encode(`data: ${JSON.stringify({ delta })}\n\n`))
          } catch {}
        }
      }
    } finally { writer.close() }
  })()

  return new Response(readable, {
    headers: {
      ...CORS,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}

async function handleVision(request, env) {
  const formData = await request.formData()
  const prompt = formData.get('prompt') || 'Analyze this image in detail.'
  const model = formData.get('model') || 'llama-3.2-11b-vision-preview'
  const imageFile = formData.get('image')
  const imageUrl = formData.get('imageUrl')

  let imageContent
  if (imageFile) {
    const buf = await imageFile.arrayBuffer()
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
    imageContent = { type: 'image_url', image_url: { url: `data:${imageFile.type};base64,${b64}` } }
  } else if (imageUrl) {
    imageContent = { type: 'image_url', image_url: { url: imageUrl } }
  } else {
    return err('No image provided')
  }

  const res = await groq(env, 'chat/completions', {
    model,
    messages: [{ role: 'user', content: [imageContent, { type: 'text', text: prompt }] }],
    max_tokens: 2048
  })
  const data = await res.json()
  return json({ content: data.choices[0].message.content })
}

async function handleAudio(request, env) {
  const formData = await request.formData()
  const audio = formData.get('audio')
  const model = formData.get('model') || 'whisper-large-v3-turbo'
  const language = formData.get('language')

  if (!audio) return err('No audio file provided')

  const fd = new FormData()
  fd.append('file', audio)
  fd.append('model', model)
  fd.append('response_format', 'verbose_json')
  if (language) fd.append('language', language)

  const data = await groqForm(env, 'audio/transcriptions', fd)
  return json({ text: data.text, duration: data.duration, language: data.language })
}

async function handleDocument(request, env) {
  const { text, filename, task = 'analyze', model = 'llama-3.3-70b-versatile' } = await request.json()
  if (!text) return err('document text required')

  const taskPrompts = {
    analyze: 'Analyze this document thoroughly: 1) Executive summary 2) Key points 3) Important data 4) Insights and recommendations',
    summarize: 'Create a concise, structured summary.',
    extract: 'Extract all key info: dates, names, numbers, decisions, action items.',
    questions: 'Generate 10 insightful questions that test deep understanding.',
    simplify: 'Explain this document in simple terms for someone unfamiliar with the topic.'
  }

  const res = await groq(env, 'chat/completions', {
    model,
    messages: [{ role: 'user', content: `${taskPrompts[task] || taskPrompts.analyze}\n\nDocument${filename ? ` (${filename})` : ''}:\n\n${text.slice(0, 30000)}` }],
    max_tokens: 4096
  })
  const data = await res.json()
  return json({ content: data.choices[0].message.content })
}

async function handleEnhancePrompt(request, env) {
  const { prompt, context = 'general' } = await request.json()
  if (!prompt) return err('prompt required')

  const res = await groq(env, 'chat/completions', {
    model: 'llama-3.1-8b-instant',
    messages: [
      { role: 'system', content: `You are a prompt engineering expert. Transform vague prompts into precise, detailed, effective prompts. Return ONLY the enhanced prompt, nothing else. Context: ${context}` },
      { role: 'user', content: `Enhance this prompt: "${prompt}"` }
    ],
    max_tokens: 512
  })
  const data = await res.json()
  return json({ enhanced: data.choices[0].message.content.trim() })
}

async function handleDiagram(request, env) {
  const { topic, type = 'flowchart', model = 'llama-3.3-70b-versatile' } = await request.json()
  if (!topic) return err('topic required')

  const typeInstructions = {
    flowchart: 'Create an SVG flowchart diagram',
    mindmap: 'Create an HTML/CSS mind map visualization',
    chart: 'Create a Chart.js bar/line chart as self-contained HTML',
    timeline: 'Create an HTML/CSS timeline visualization',
    comparison: 'Create an HTML comparison table with visual styling',
    interactive: 'Create a fully interactive HTML widget with JavaScript'
  }

  const res = await groq(env, 'chat/completions', {
    model,
    messages: [
      {
        role: 'system',
        content: `You are an expert at creating beautiful data visualizations as self-contained HTML/SVG.
Color scheme: Black (#0a0a0a), White (#f5f5f0), Gold (#C9A84C), Dark Gold (#8B6914).
Style: Ultra-premium, minimalist, luxury.
Return ONLY valid HTML code. No markdown fences. No explanation. Must render beautifully standalone.`
      },
      { role: 'user', content: `${typeInstructions[type] || typeInstructions.flowchart} for: ${topic}` }
    ],
    max_tokens: 4096
  })
  const data = await res.json()
  let html = data.choices[0].message.content.trim()
  html = html.replace(/^```html?\n?/i, '').replace(/```$/, '').trim()
  return json({ html, type, topic })
}

async function handleLearn(request, env) {
  const { topic, level = 'beginner', format = 'explanation', model = 'llama-3.3-70b-versatile' } = await request.json()

  const formats = {
    explanation: `Explain "${topic}" for a ${level}. Use clear structure, examples, and analogies.`,
    quiz: `Create a 5-question quiz about "${topic}" for ${level} level. Include answers.`,
    flashcards: `Create 8 flashcards about "${topic}" for ${level}. Respond ONLY as a JSON array: [{"q":"...","a":"..."}]`,
    roadmap: `Create a learning roadmap for mastering "${topic}". Include milestones, resources, time estimates.`,
    eli5: `Explain "${topic}" as simply as possible, as if to a complete beginner.`
  }

  const res = await groq(env, 'chat/completions', {
    model,
    messages: [{ role: 'user', content: formats[format] || formats.explanation }],
    max_tokens: 3000
  })
  const data = await res.json()
  return json({ content: data.choices[0].message.content })
}

function handleModels() {
  return json({
    text: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', badge: 'Smart' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', badge: 'Fast' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', badge: '32K' },
      { id: 'gemma2-9b-it', name: 'Gemma 2 9B', badge: 'Efficient' }
    ],
    vision: [
      { id: 'llama-3.2-11b-vision-preview', name: 'Llama 3.2 11B Vision', badge: 'Vision' },
      { id: 'llama-3.2-90b-vision-preview', name: 'Llama 3.2 90B Vision', badge: 'Best' }
    ],
    audio: [
      { id: 'whisper-large-v3', name: 'Whisper Large v3', badge: 'Quality' },
      { id: 'whisper-large-v3-turbo', name: 'Whisper v3 Turbo', badge: 'Fast' }
    ]
  })
}

// ─── Main router ──────────────────────────────────────────────────────────────
export async function onRequest({ request, env }) {
  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/api\/?/, '') // e.g. "chat", "vision"

  // CORS preflight
  if (request.method === 'OPTIONS') return cors('', 204)

  if (!env.GROQ_API_KEY && path !== 'models') {
    return json({ error: 'GROQ_API_KEY secret not configured. Set it via: wrangler pages secret put GROQ_API_KEY' }, 500)
  }

  try {
    switch (path) {
      case 'chat':            return handleChat(request, env)
      case 'vision':          return handleVision(request, env)
      case 'audio':           return handleAudio(request, env)
      case 'document':        return handleDocument(request, env)
      case 'enhance-prompt':  return handleEnhancePrompt(request, env)
      case 'generate-diagram':return handleDiagram(request, env)
      case 'learn':           return handleLearn(request, env)
      case 'models':          return handleModels()
      default:                return json({ error: `Unknown route: ${path}` }, 404)
    }
  } catch (e) {
    console.error(`[${path}] error:`, e)
    return json({ error: e.message }, 500)
  }
}
