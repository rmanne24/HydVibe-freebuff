import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { QrCode, Sparkles, RotateCcw, CircleSlash, Radio, Zap, ArrowUpRight } from 'lucide-react'
import { VENUES } from '../data/seed'
import { aggregateCrowd } from '../lib/crowdEngine'
import { suggestAlternatives } from '../lib/ranking'
import { useLiveReports } from '../lib/useLiveReports'
import { api, getSessionId } from '../lib/api'
import { CrowdBadge, ConfidenceLabel } from '../components/CrowdBadge'
import { FloatingPanel, OverlineLabel } from '../components/design'
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
  const [pulseIds, setPulseIds] = useState<Set<string>>(new Set())
  const knownReportIds = useRef<Set<string> | null>(null)
  const prevEvents = useRef<DemoEvent[]>([])

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
    QRCode.toDataURL(reportUrl, { width: 240, margin: 2, color: { dark: '#222A33', light: '#FFFFFF' } })
      .then(url => { if (alive) setQrDataUrl(url) })
      .catch(() => { if (alive) setQrDataUrl(null) })
    return () => { alive = false }
  }, [reportUrl])

  // New-arrivals detection → highlight affected venue cards subtly.
  useEffect(() => {
    const ids = new Set(reports.map(r => r.id))
    if (knownReportIds.current && reports.length > knownReportIds.current!.size) {
      const freshIds = new Set<string>()
      for (const r of reports) {
        if (!knownReportIds.current!.has(r.id) && SUGGESTED_VENUES.includes(r.venueId)) freshIds.add(r.venueId)
      }
      if (freshIds.size > 0) {
        setPulseIds(freshIds)
        const t = setTimeout(() => setPulseIds(new Set()), 2600)
        return () => clearTimeout(t)
      }
    }
    knownReportIds.current = ids
    prevEvents.current = events
    return undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports])

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
    try {
      for (const venueId of SUGGESTED_VENUES.slice(0, 3)) {
        for (let i = 0; i < 2; i++) {
          await api.submitReport({
            venueId,
            level: LEVELS_POOL[Math.floor(Math.random() * LEVELS_POOL.length)],
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

  const latestEventId = events.length > 0 ? [...events].sort((a, b) => b.at - a.at)[0].id : null

  return (
    <div className="space-y-7">
      {/* Header */}
      <header className="rise-in flex flex-wrap items-center justify-between gap-4">
        <div>
          <OverlineLabel className="text-ink/55">Live session</OverlineLabel>
          <h1 className="mt-1 flex items-center gap-2.5 text-3xl font-light tracking-tight text-ink md:text-4xl">
            <Radio size={26} className="text-ink" /> HydVibe Live — <span className="font-semibold">Crowd Pulse</span>
          </h1>
          <p className={`mt-1.5 flex items-center gap-1.5 text-sm ${connected ? 'text-ink/70' : 'text-ink/50'}`}>
            <span className={`h-2 w-2 rounded-full ${connected ? 'bg-neon neon-pulse' : 'bg-ink/40'}`} />
            {connected ? 'Connected · real submissions update every connected device' : 'Offline — sample data only'}
          </p>
        </div>
        <div className="floating-panel bg-charcoal px-5 py-3.5 text-center text-text">
          <div className="text-4xl font-extrabold tracking-tight">
            <span className={connected ? 'text-neon' : 'text-ice'}>{totalReports}</span>
          </div>
          <OverlineLabel className="text-ice/55">Total reports</OverlineLabel>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-4">
          {/* QR */}
          <FloatingPanel tone="charcoal" className="p-5">
            <OverlineLabel className="text-ice/60">Scan to report</OverlineLabel>
            <div className="mt-3 flex justify-center">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR code to open the report screen"
                  width={176}
                  height={176}
                  className="pop-in rounded-2xl bg-white p-2.5 shadow-chip"
                />
              ) : (
                <div className="grid h-[150px] w-[150px] place-items-center rounded-2xl bg-white/10 text-xs text-muted">
                  Generating QR…
                </div>
              )}
            </div>
            <p className="mt-3 break-all text-[11px] text-muted/70">{reportUrl}</p>
            <p className="mt-2 text-xs text-ice/65">Opens the venue report screen directly — submissions count as real reports.</p>
          </FloatingPanel>

          {/* Simulation */}
          <FloatingPanel tone="charcoal" className="border-neon/50 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-neon">
              <Sparkles size={14} /> Demo simulation
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Generates <strong className="text-ice">clearly marked simulated reports</strong> so you can watch the
              aggregate & recommendation change — useful when presenting without a live audience.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={simulateWave}
                disabled={simulating}
                className="tactile focus-ring flex items-center justify-center gap-1.5 rounded-2xl bg-neon px-4 py-2.5 text-sm font-bold text-ink shadow-neonGlow disabled:opacity-40 disabled:shadow-none"
              >
                <Zap size={14} /> {simulating ? 'Simulating…' : 'Run simulation'}
              </button>
              <button
                onClick={resetDemo}
                className="tactile focus-ring flex items-center justify-center gap-1.5 rounded-2xl border border-white/45 px-4 py-2.5 text-sm font-medium text-ice hover:bg-white/[0.08]"
              >
                <RotateCcw size={14} /> Reset demo
              </button>
            </div>
          </FloatingPanel>
        </aside>

        <div className="space-y-7">
          {/* Live venue cards */}
          <section>
            <OverlineLabel className="text-ink/55">Live venue status</OverlineLabel>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {waterline.map(({ venue, summary, alt }) => (
                <div
                  key={venue.id}
                  className={`rounded-[1.75rem] border transition-all duration-500 ${
                    pulseIds.has(venue.id)
                      ? 'border-neon bg-charcoal shadow-neonGlow'
                      : 'floating-panel bg-charcoal border-white/45'
                  } p-4 text-text`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold tracking-tight">{venue.name}</h3>
                    <CrowdBadge summary={summary} variant="dark" />
                  </div>
                  <div className="mt-1"><ConfidenceLabel summary={summary} /></div>
                  {alt && alt.crowd?.status != null && alt.crowd.status !== 'busy' && alt.crowd.status !== 'packed' ? (
                    <button
                      onClick={() => { window.location.href = `/venue/${alt.venue.id}` }}
                      className="focus-ring mt-2.5 flex w-full items-center justify-between rounded-xl bg-neon/10 px-3 py-2 text-left text-xs font-medium text-neon transition hover:bg-neon/20"
                    >
                      <span>Try {alt.venue.name} — calmer nearby</span>
                      <ArrowUpRight size={13} />
                    </button>
                  ) : (
                    <p className="mt-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-muted">
                      No calmer alternative with reliable data right now.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Live feed */}
          <section>
            <OverlineLabel className="text-ink/55">Live activity feed</OverlineLabel>
            <p className="mt-1 flex items-center gap-1 text-xs text-ink/55">
              <CircleSlash size={11} className="inline" /> Simulated entries are tagged SIM; all other rows are real audience submissions.
            </p>
            <FloatingPanel tone="charcoal" className="mt-3">
              <div className="panel-scroll max-h-96 space-y-2 overflow-y-auto p-4">
                {events.length === 0 ? (
                  <p className="p-4 text-center text-sm text-muted">
                    Waiting for the first report… scan the QR or run a simulation.
                  </p>
                ) : (
                  [...events].reverse().slice(0, 20).map(e => (
                    <div
                      key={e.id}
                      className={`fade-slide flex items-center justify-between gap-2 rounded-2xl border px-4 py-2.5 text-sm transition-all duration-500 ${
                        e.id === latestEventId
                          ? 'border-neon/50 bg-neon/[0.08] text-ice'
                          : 'border-white/10 bg-white/[0.04] text-ice/85'
                      }`}
                    >
                      <span>
                        <strong className="font-semibold">{e.venueName}</strong>
                        <span className="text-muted"> · reported {CROWD_LABELS[e.level as CrowdLevel] ?? e.level}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        {e.kind === 'sim' && (
                          <span className="rounded border border-amber/40 bg-amber/10 px-1 py-0.5 text-[9px] font-bold uppercase text-amber">sim</span>
                        )}
                        <span className="text-xs text-muted">{new Date(e.at).toLocaleTimeString()}</span>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </FloatingPanel>
          </section>

          <p className="text-[11px] text-ink/45">
            Simulated reports never count as real-world crowd statistics without the SIM tag. Resetting demo data
            clears simulation reports seeded for this showcase.
          </p>
        </div>
      </div>
    </div>
  )
}
