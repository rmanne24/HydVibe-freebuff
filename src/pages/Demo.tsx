import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { QrCode, Sparkles, RotateCcw, CircleSlash, Radio, Zap } from 'lucide-react'
import { VENUES } from '../data/seed'
import { aggregateCrowd } from '../lib/crowdEngine'
import { suggestAlternatives } from '../lib/ranking'
import { useLiveReports } from '../lib/useLiveReports'
import { api, getSessionId } from '../lib/api'
import { CrowdBadge, ConfidenceLabel } from '../components/CrowdBadge'
import type { CrowdLevel } from '../types/domain'
import { CROWD_LABELS } from '../lib/concepts'

const LEVELS_POOL: CrowdLevel[] = ['empty', 'comfortable', 'comfortable', 'busy', 'comfortable']

const SUGGESTED_VENUES = ['c1', 'c8', 'c10', 'c15', 'c7']

interface DemoEvent {
  id: string
  kind: string
  venueName: string
  venueId: string
  level: string
  at: number
}

export function Demo() {
  const { reports, connected, refresh } = useLiveReports()
  const [events, setEvents] = useState<DemoEvent[]>([])
  const [simulating, setSimulating] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  const loadEvents = async () => {
    try {
      const evts = await api.demoEvents()
      setEvents(evts)
    } catch {
      /* offline */
    }
  }

  useEffect(() => {
    loadEvents()
    const t = setInterval(loadEvents, 3000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reportUrl = `${window.location.origin}/venue/c1#report`

  // Generate a genuine scannable QR code for the report URL.
  useEffect(() => {
    let alive = true
    QRCode.toDataURL(reportUrl, { width: 240, margin: 2, color: { dark: '#101210', light: '#FFFFFF' } })
      .then(url => { if (alive) setQrDataUrl(url) })
      .catch(() => { if (alive) setQrDataUrl(null) })
    return () => { alive = false }
  }, [reportUrl])

  const totalReports = reports.length
  const waterline = venuesWithCrowd()

  function venuesWithCrowd() {
    return SUGGESTED_VENUES.map(id => {
      const venue = VENUES.find(v => v.id === id)!
      const summary = aggregateCrowd(reports, id, Date.now())
      const alts = suggestAlternatives(venue, VENUES, reports, Date.now(), 1)
      return { venue, summary, alt: alts[0] ?? null }
    })
  }

  const simulateWave = async () => {
    setSimulating(true)
    const levels: CrowdLevel[] = ['empty', 'comfortable', 'comfortable', 'busy', 'comfortable']
    try {
      for (const venueId of SUGGESTED_VENUES.slice(0, 3)) {
        for (let i = 0; i < 2; i++) {
          await api.submitReport({
            venueId,
            level: levels[Math.floor(Math.random() * levels.length)],
            sessionId: `sim-${getSessionId()}-${Math.floor(Math.random() * 1000)}`,
            simulated: true,
            note: 'Simulated for demo',
          })
        }
      }
      await refresh()
      await loadEvents()
    } finally {
      setSimulating(false)
    }
  }

  const resetDemo = async () => {
    try {
      await api.clearDemo()
      setEvents([])
      await refresh()
    } catch {
      /* offline */
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-3xl md:text-4xl">
            <Radio className="text-lime" size={28} /> HydVibe Live — Hyderabad Crowd Pulse
          </h1>
          <p className={`mt-1 flex items-center gap-1.5 text-sm ${connected ? 'text-lime' : 'text-warm'}`}>
            <span className={`h-2 w-2 rounded-full ${connected ? 'bg-lime animate-pulse' : 'bg-warm'}`} />
            {connected ? 'Connected · real submissions, updating everywhere' : 'Offline — sample data only'}
          </p>
        </div>
        <div className="rounded-xl2 border border-line bg-surface px-4 py-3 text-center">
          <div className="font-display text-3xl text-lime">{totalReports}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted">Total reports</div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-4">
          <section className="rounded-xl2 border border-line bg-surface p-5 text-center">
            <h2 className="flex items-center justify-center gap-2 text-sm font-medium text-muted"><QrCode size={14} /> Scan to report</h2>
            <div className="mt-3 flex justify-center">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR code to open the report screen" width={150} height={150} className="rounded-lg" />
              ) : (
                <div className="grid h-[150px] w-[150px] place-items-center rounded-lg bg-white/10 text-xs text-muted">Generating QR…</div>
              )}
            </div>
            <p className="mt-3 break-all text-[11px] text-muted/70">{reportUrl}</p>
            <p className="mt-2 text-xs text-muted">Opens the venue report screen directly.</p>
          </section>

          <section className="rounded-xl2 border border-lime/30 bg-lime/5 p-5">
            <h2 className="flex items-center gap-2 text-sm font-medium text-lime"><Sparkles size={14} /> Demo simulation</h2>
            <p className="mt-2 text-xs text-muted">Generates <strong>clearly marked simulated reports</strong> so you can watch the aggregate & recommendation change — useful when presenting without a live audience.</p>
            <div className="mt-3 flex flex-col gap-2">
              <button
                onClick={simulateWave}
                disabled={simulating}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-lime px-4 py-2 text-sm font-semibold text-bg disabled:opacity-40"
              >
                <Zap size={14} /> {simulating ? 'Simulating…' : 'Run simulation'}
              </button>
              <button onClick={resetDemo} className="flex items-center justify-center gap-1.5 rounded-xl border border-line px-4 py-2 text-sm hover:border-lime/40">
                <RotateCcw size={14} /> Reset demo
              </button>
            </div>
          </section>
        </aside>

        <div className="space-y-6">
          {/* Live venue cards */}
          <section>
            <h2 className="font-display text-2xl">Live venue status</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {waterline.map(({ venue, summary, alt }) => (
                <div key={venue.id} className="rounded-xl2 border border-line bg-surface p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display">{venue.name}</h3>
                    <CrowdBadge summary={summary} />
                  </div>
                  <div className="mt-1"><ConfidenceLabel summary={summary} /></div>
                  {alt &&alt.crowd?.status != null && alt.crowd.status !== 'busy' && alt.crowd.status !== 'packed' && (
                    <p className="mt-2 rounded-lg bg-lime/10 px-2.5 py-1.5 text-xs text-lime">
                      Try {alt.venue.name} — calmer nearby.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Live feed */}
          <section>
            <h2 className="font-display text-2xl">Live activity feed</h2>
            <p className="mt-1 text-xs text-muted">
              <CircleSlash size={11} className="inline text-warm" /> Simulated entries are tagged; all other rows are real audience submissions.
            </p>
            <div className="mt-3 max-h-96 space-y-2 overflow-y-auto rounded-xl2 border border-line bg-surface p-3">
              {events.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted">Waiting for the first report… scan the QR or run a simulation.</p>
              ) : (
                [...events].reverse().slice(0, 20).map(e => (
                  <div key={e.id} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-elevated px-3 py-2 text-sm">
                    <span>
                      <strong>{e.venueName}</strong>
                      <span className="text-muted"> · reported {CROWD_LABELS[e.level as CrowdLevel] ?? e.level}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      {e.kind === 'sim' && <span className="rounded border border-warm/40 bg-warm/10 px-1 py-0.5 text-[9px] text-warm">SIM</span>}
                      <span className="text-xs text-muted">{new Date(e.at).toLocaleTimeString()}</span>
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
