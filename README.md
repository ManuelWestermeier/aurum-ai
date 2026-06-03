# ✦ Aurum AI — Cloudflare Pages

Full-stack AI app on Cloudflare Pages + Pages Functions.
**No separate server.** Frontend and backend live in one repo, one deployment.

```
aurum-ai/
├── functions/
│   └── api/
│       └── [[route]].js   ← ALL backend logic (Pages Function)
├── src/                   ← Vite + React frontend
├── dist/                  ← build output (auto-generated)
├── wrangler.toml
├── vite.config.js
└── package.json
```

---

## How it works

```
Browser → /api/chat          → functions/api/[[route]].js → Groq API
Browser → /api/vision        → same function
Browser → /api/audio         → same function
Browser → /* (any page)      → dist/ (static Vite build)
```

Cloudflare Pages routes `/api/*` to your Function, everything else serves static files.

---

## Local Development

```bash
npm install

# Option A: Vite only (no Functions, no Groq calls)
npm run dev

# Option B: Full stack with wrangler (recommended)
npm run build
GROQ_API_KEY=gsk_xxx npx wrangler pages dev dist --compatibility-date=2024-09-23
# Open http://localhost:8788
```

---

## Deploy to Cloudflare Pages

### 1. Via CLI (fastest)

```bash
npm install
npm run build

# First deploy
npx wrangler pages deploy dist --project-name=aurum-ai

# Set your Groq API key as a secret (stored encrypted, never in code)
npx wrangler pages secret put GROQ_API_KEY
# Paste your key when prompted: gsk_...
```

### 2. Via Git + Dashboard (recommended for CI/CD)

1. Push this repo to GitHub / GitLab
2. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages → Create project
3. Connect your repo
4. Build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node version:** `20`
5. After deploy, go to **Settings → Environment Variables → Secrets**
6. Add: `GROQ_API_KEY` = `gsk_your_key_here`

### 3. Re-deploy after changes

```bash
npm run deploy   # = vite build + wrangler pages deploy dist
```

---

## Environment / Secrets

| Name | Where | Description |
|------|-------|-------------|
| `GROQ_API_KEY` | Secret (encrypted) | Groq API key — never in code |

Set via CLI: `wrangler pages secret put GROQ_API_KEY`
Or via Dashboard: Pages → Your Project → Settings → Environment Variables

---

## API Routes (Pages Functions)

All handled by `functions/api/[[route]].js`:

| Route | Method | Description |
|-------|--------|-------------|
| `/api/chat` | POST | Streaming chat (SSE) |
| `/api/vision` | POST (multipart) | Image analysis |
| `/api/audio` | POST (multipart) | Audio transcription |
| `/api/document` | POST | Document analysis |
| `/api/enhance-prompt` | POST | Prompt improvement |
| `/api/generate-diagram` | POST | HTML diagram generation |
| `/api/learn` | POST | Learning modes |
| `/api/models` | GET | Available models |

---

## Costs

Cloudflare Pages Functions:
- **Free tier:** 100,000 requests/day — more than enough for personal use
- **Paid:** $5/mo for 10M requests

Groq API: very generous free tier (check console.groq.com)
