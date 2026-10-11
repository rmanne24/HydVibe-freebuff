// HydVibe backend — express API with append-only report store, persistence,
// rate limiting, validation, and polling-friendly summaries.

import express from 'express'
import cors from 'cors'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.join(__dirname, '..', 'data')
const REPORTS_FILE = path.join(DATA_DIR, 'reports.json')
const DEMO_FILE = path.join(DATA_DIR, 'demo-events.json')

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

// persisted state (plain JS objects)
// Report: { id, venueId, level, note?, sessionId, submittedAt, simulated }
// DemoEvent: { id, kind, venueId, venueName, level, at }

let reports = []
let demoEvents = []

function load() {
  try {
    if (fs.existsSync(REPORTS_FILE)) {
      reports = JSON.parse(fs.readFileSync(REPORTS_FILE, 'utf8'))
    }
  } catch {
    reports = []
  }
  try {
    if (fs.existsSync(DEMO_FILE)) {
      demoEvents = JSON.parse(fs.readFileSync(DEMO_FILE, 'utf8'))
    }
  } catch {
    demoEvents = []
  }
}

let saveTimer = null
function persist() {
  // debounce writes
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2))
      fs.writeFileSync(DEMO_FILE, JSON.stringify(demoEvents.slice(-200), null, 2))
    } catch (e) {
      console.error('persist failed', e)
    }
  }, 200)
}

load()

// seed a handful of demo crowd reports so the app doesn't launch empty
// (clearly marked simulated; clearable from /demo Reset)
const SEED_REPORTS = [
  { venueId: 'c1', level: 'comfortable', minutesAgo: 20, sessionId: 'seed-1' },
  { venueId: 'c1', level: 'comfortable', minutesAgo: 10, sessionId: 'seed-2' },
  { venueId: 'c2', level: 'busy', minutesAgo: 35, sessionId: 'seed-3' },
  { venueId: 'c2', level: 'packed', minutesAgo: 15, sessionId: 'seed-4' },
  { venueId: 'c7', level: 'empty', minutesAgo: 25, sessionId: 'seed-5' },
  { venueId: 'c7', level: 'comfortable', minutesAgo: 5, sessionId: 'seed-6' },
  { venueId: 'c10', level: 'busy', minutesAgo: 30, sessionId: 'seed-7' },
  { venueId: 'c8', level: 'comfortable', minutesAgo: 12, sessionId: 'seed-8' },
  { venueId: 'c15', level: 'empty', minutesAgo: 40, sessionId: 'seed-9' },
  { venueId: 'c15', level: 'comfortable', minutesAgo: 8, sessionId: 'seed-10' },
  { venueId: 'c5', level: 'comfortable', minutesAgo: 22, sessionId: 'seed-11' },
  { venueId: 'c6', level: 'busy', minutesAgo: 18, sessionId: 'seed-12' },
  { venueId: 'c11', level: 'busy', minutesAgo: 16, sessionId: 'seed-13' },
  { venueId: 'c4', level: 'packed', minutesAgo: 12, sessionId: 'seed-14' },
  { venueId: 'c9', level: 'comfortable', minutesAgo: 20, sessionId: 'seed-15' },
]

let seeded = false
function ensureSeed() {
  if (seeded) return
  if (reports.length === 0) {
    const now = Date.now()
    for (const s of SEED_REPORTS) {
      reports.push({
        id: `seed-${s.venueId}-${s.sessionId}`,
        venueId: s.venueId,
        level: s.level,
        sessionId: s.sessionId,
        submittedAt: now - s.minutesAgo * 60000,
        simulated: true,
      })
    }
    persist()
  }
  seeded = true
}
ensureSeed()

// ---- simple in-memory rate limiter per session ----
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 4 // reports per session per minute
const rateBuckets = new Map()

function rateLimited(sessionId) {
  const nowMs = Date.now()
  const list = (rateBuckets.get(sessionId) ?? []).filter(t => nowMs - t < RATE_WINDOW_MS)
  if (list.length >= RATE_MAX) return true
  list.push(nowMs)
  rateBuckets.set(sessionId, list)
  return false
}

// duplicate protection: same session, same venue, same level within 10 min
const DUP_WINDOW_MS = 10 * 60_000
function isDuplicate(sessionId, venueId, level) {
  const nowMs = Date.now()
  return reports.some(
    r => r.sessionId === sessionId && r.venueId === venueId && r.level === level && nowMs - r.submittedAt < DUP_WINDOW_MS,
  )
}

const app = express()
app.use(cors())
app.use(express.json())

const VENUES_FILE = path.join(__dirname, '..', 'src', 'data', 'seed.ts')

// expose a venue list (read from seed at build time in client; server serves
// its own copy by importing the compiled ts source is overkill, so just serve filename-safe ids)
const VENUE_IDS_SAFE = ['c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','c11','c12','c13','c14','c15']

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, reports: reports.length, now: Date.now() })
})

app.get('/api/reports', (req, res) => {
  const venueId = req.query.venueId
  const since = req.query.since ? Number(req.query.since) : 0
  let out = reports
  if (venueId) out = out.filter(r => r.venueId === venueId)
  if (since) out = out.filter(r => r.submittedAt > Number(since))
  res.json(out)
})

app.post('/api/reports', (req, res) => {
  const { venueId, level, note, sessionId, simulated } = req.body ?? {}

  if (!venueId || !VENUE_IDS_SAFE.includes(venueId)) {
    res.status(400).json({ error: 'Unknown venue' })
    return
  }
  const validLevels = ['empty', 'comfortable', 'busy', 'packed']
  if (!validLevels.includes(level)) {
    res.status(400).json({ error: 'Invalid crowd level' })
    return
  }
  if (!sessionId || typeof sessionId !== 'string') {
    res.status(400).json({ error: 'Missing session id' })
    return
  }
  if (rateLimited(sessionId)) {
    res.status(429).json({ error: 'Too many reports from this session. Try again in a minute.' })
    return
  }
  if (isDuplicate(sessionId, venueId, level)) {
    res.status(409).json({ error: 'You already reported this level for this venue recently.' })
    return
  }
  if (note && typeof note !== 'string') {
    res.status(400).json({ error: 'Invalid note' })
    return
  }

  const now = Date.now()
  const report = {
    id: `r-${now}-${Math.random().toString(36).slice(2, 8)}`,
    venueId,
    level,
    note: note ? note.slice(0, 240) : undefined,
    sessionId,
    submittedAt: now,
    simulated: Boolean(simulated),
  }
  reports.push(report)

  const venueName = { c1: 'Sunset & Lime Café', c2: 'The Reading Verse', c3: 'Rooftop Bean HITEC', c4: 'Chai Tapri Madhapur', c5: 'Verdant Kitchen Jubilee', c6: 'Banjara Study Loft', c7: 'Copper Mug Gachibowli', c8: 'Madhapur Social House', c9: 'Kondapur Workout Garage', c10: 'HITEC City Fit Hub', c11: 'Jubilee Glow Salon', c12: 'Madhapur Quick Snips', c13: 'Khairatabad RTO Junction', c14: 'Khairatabad Passport Seva Kendra', c15: 'Manikonda Hilltop Roasters' }[venueId] ?? venueId
  demoEvents.push({
    id: report.id,
    kind: simulated ? 'sim' : 'report',
    venueId,
    venueName,
    level,
    at: now,
  })
  if (demoEvents.length > 400) demoEvents = demoEvents.slice(-200)

  persist()
  res.status(201).json(report)
})

app.get('/api/demo-events', (req, res) => {
  const since = req.query.since ? Number(req.query.since) : 0
  const out = since ? demoEvents.filter(e => e.at > since) : demoEvents
  res.json(out.slice(-50))
})

app.delete('/api/demo-events', (_req, res) => {
  demoEvents = []
  persist()
  res.json({ ok: true })
})

// serve the built client if present
const DIST = path.join(__dirname, '..', 'dist')
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST))
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(DIST, 'index.html'))
  })
}

const PORT = 5175
app.listen(PORT, () => {
  console.log(`HydVibe API listening on http://localhost:${PORT}`)
})
