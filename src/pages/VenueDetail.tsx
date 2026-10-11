import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Heart, Share2, Wifi, Plug, Laptop, IndianRupee, Clock, MapPin,
  AlertTriangle, ThumbsUp, ExternalLink, TrendingUp, TrendingDown, Minus,
} from 'lucide-react'
import { VENUES } from '../data/seed'
import { aggregateCrowd } from '../lib/crowdEngine'
import { suggestAlternatives } from '../lib/ranking'
import { useLiveReports } from '../lib/useLiveReports'
import { api, getSessionId } from '../lib/api'
import { usePrefs } from '../lib/usePrefs'
import { CrowdBadge, ConfidenceLabel } from '../components/CrowdBadge'
import { VenueImage } from '../components/VenueCard'
import { SimpleVenueCard } from '../components/VenueCard'
import type { CrowdLevel, CrowdSummary } from '../types/domain'
import { CROWD_LABELS } from '../lib/concepts'

const LEVELS: CrowdLevel[] = ['empty', 'comfortable', 'busy', 'packed']

export function VenueDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { reports, connected, refresh } = useLiveReports()
  const { prefs, toggleSaved, markViewed } = usePrefs()

  const venue = useMemo(() => VENUES.find(v => v.id === id), [id])

  const summary = useMemo(
    () => (venue ? aggregateCrowd(reports, venue.id, Date.now()) : null),
    [venue, reports],
  )
  const venueReports = useMemo(
    () => venue ? reports.filter(r => r.venueId === venue.id).sort((a, b) => b.submittedAt - a.submittedAt).slice(0, 8) : [],
    [venue, reports],
  )

  const [selectedLevel, setSelectedLevel] = useState<CrowdLevel | null>(null)
  const [note, setNote] = useState('')
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (venue) markViewed(venue.id)
    window.scrollTo(0, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const alternatives = useMemo(
    () => (venue ? suggestAlternatives(venue, VENUES, reports, Date.now()) : []),
    [venue, reports],
  )

  if (!venue) {
    return (
      <div className="rounded-xl2 border border-line bg-surface p-8 text-center">
        <h1 className="font-display text-2xl">Venue not found</h1>
        <button onClick={() => navigate('/')} className="mt-4 rounded-xl bg-lime px-4 py-2 font-semibold text-bg">Back to Discover</button>
      </div>
    )
  }

  const saved = prefs.savedVenueIds.includes(venue.id)
  const decision = makeDecision(summary, alternatives)

  const submit = async () => {
    if (!selectedLevel) return
    setSubmitState('submitting')
    setError(null)
    try {
      await api.submitReport({
        venueId: venue.id,
        level: selectedLevel,
        note: note.trim() || undefined,
        sessionId: getSessionId(),
      })
      setSubmitState('success')
      setSelectedLevel(null)
      setNote('')
      await refresh()
      setTimeout(() => setSubmitState('idle'), 2500)
    } catch (e) {
      setSubmitState('error')
      setError(e instanceof Error ? e.message : 'Could not submit. Try again.')
    }
  }

  const shareUrl = `${window.location.origin}/venue/${venue.id}`
  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      /* clipboard unavailable */
    }
  }

  const trendIcon =
    summary?.trend === 'rising' ? <TrendingUp size={14} className="text-warm" />
    : summary?.trend === 'falling' ? <TrendingDown size={14} className="text-lime" />
    : summary?.trend === 'steady' ? <Minus size={14} className="text-muted" />
    : null

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted hover:text-lime">
        <ArrowLeft size={15} /> Back
      </button>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-xl2 border border-line shadow-card">
        <VenueImage url={venue.imageUrl} alt={venue.name} className="h-56 w-full object-cover md:h-72" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 flex flex-wrap items-end justify-between gap-3 p-5">
          <div>
            <h1 className="font-display text-3xl md:text-4xl">{venue.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <span className="flex items-center gap-1"><MapPin size={13} /> {venue.locality}</span>
              <span className="flex items-center gap-1"><Clock size={13} /> {venue.openHours ?? 'Hours unknown'}</span>
              {!venue.verified && <span className="rounded-full border border-warm/40 bg-warm/10 px-2 py-0.5 text-[10px] text-warm">sample listing</span>}
            </p>
          </div>
          <CrowdBadge summary={summary} className="text-sm" />
        </div>
      </section>

      {/* Actions row */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => toggleSaved(venue.id)}
          className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/60 ${saved ? 'border-lime bg-lime/15 text-lime' : 'border-line hover:border-lime/40'}`}
        >
          <Heart size={15} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save'}
        </button>
        <button onClick={copyShare} className="flex items-center gap-1.5 rounded-xl border border-line px-4 py-2 text-sm hover:border-lime/40">
          <Share2 size={15} /> Share
        </button>
        <a
          href={venue.lat && venue.lng ? `https://www.openstreetmap.org/?mlat=${venue.lat}&mlon=${venue.lng}#map=17/${venue.lat}/${venue.lng}` : undefined}
          target="_blank"
          rel="noreferrer"
          className={`flex items-center gap-1.5 rounded-xl border border-line px-4 py-2 text-sm hover:border-lime/40 ${!(venue.lat && venue.lng) ? 'pointer-events-none opacity-50' : ''}`}
        >
          <ExternalLink size={15} /> Directions
        </a>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Decision panel */}
          <section className="rounded-xl2 border border-line bg-surface p-5">
            <h2 className="font-display text-xl">Should I go now?</h2>
            {decision.state === 'unknown' && <p className="mt-2 text-sm text-muted">{decision.reason}</p>}
            {decision.state === 'unknown' ? (
              <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-elevated px-3 py-2 text-sm font-semibold text-muted">NOT ENOUGH DATA</p>
            ) : (
              <p className={`mt-3 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${decision.state === 'go' ? 'bg-lime/15 text-lime' : decision.state === 'wait' ? 'bg-warm/15 text-warm' : 'bg-red-500/10 text-red-400'}`}>
                {decision.state === 'go' && 'GO NOW'}
                {decision.state === 'wait' && 'CONSIDER WAITING'}
                {decision.state === 'try' && 'TRY AN ALTERNATIVE'}
              </p>
            )}
            <p className="mt-2 text-sm text-muted">{decision.reason}</p>
            {summary && summary.trend !== 'unknown' && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                {trendIcon} Trend: {summary.trend} (based on {summary.reportCount} reports)
              </p>
            )}
            <p className="mt-2 text-[11px] text-muted/70">
              Evidence-based suggestion, not a guarantee. Crowd status depends entirely on community reports.
            </p>
          </section>

          {/* About */}
          <section className="rounded-xl2 border border-line bg-surface p-5">
            <h2 className="font-display text-xl">About</h2>
            <p className="mt-2 text-sm text-muted">{venue.description ?? 'No description yet.'}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(venue.vibeTags ?? []).map(t => (
                <span key={t} className="rounded-full border border-line bg-elevated px-2.5 py-0.5 text-xs text-muted">{t}</span>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Detail icon={<IndianRupee size={14} />} label="Per person" value={venue.pricePerPerson != null ? `~ ₹${venue.pricePerPerson}` : 'Unknown'} />
              <Detail icon={<Clock size={14} />} label="Hours" value={`${venue.openHours ?? 'Unknown'}${venue.hoursSource ? ` (${venue.hoursSource})` : ''}`} />
              <Detail icon={<Wifi size={14} />} label="Wi-Fi" value={venue.hasWifi == null ? 'Unknown' : venue.hasWifi ? 'Available' : 'Not available'} />
              <Detail icon={<Plug size={14} />} label="Charging" value={venue.hasPlugPoints == null ? 'Unknown' : venue.hasPlugPoints ? 'Available' : 'Not available'} />
              <Detail icon={<Laptop size={14} />} label="Laptop-friendly" value={venue.workFriendly == null ? 'Unknown' : venue.workFriendly ? 'Yes' : 'No'} />
              <Detail icon={<MapPin size={14} />} label="Address" value={venue.address ?? 'Not listed'} />
            </div>
          </section>

          {/* Report flow */}
          <section className="rounded-xl2 border border-line bg-surface p-5" id="report">
            <h2 className="font-display text-xl">Report the crowd</h2>
            <p className="mt-1 text-sm text-muted">How does it look right now? Takes 5 seconds, no sign-in.</p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {LEVELS.map(level => (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={`rounded-xl border px-3 py-3 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/60 ${selectedLevel === level ? 'border-lime bg-lime/15 text-lime' : 'border-line bg-elevated text-muted hover:border-lime/40 hover:text-text'}`}
                >
                  {CROWD_LABELS[level]}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Optional: a quick note (e.g. 'counter queue is long')"
                maxLength={240}
                className="min-w-0 flex-1 rounded-xl border border-line bg-elevated px-3 py-2 text-sm outline-none focus:border-lime/50 placeholder:text-muted/60"
              />
              <button
                onClick={submit}
                disabled={!selectedLevel || submitState !== 'idle'}
                className="rounded-xl bg-lime px-5 py-2 text-sm font-semibold text-bg transition disabled:opacity-40 enabled:hover:brightness-110"
              >
                {submitState === 'submitting' ? 'Submitting…' : submitState === 'success' ? 'Thanks! ✓' : submitState === 'error' ? 'Retry' : 'Submit report'}
              </button>
            </div>
            {error && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-red-400"><AlertTriangle size={12} /> {error}</p>
            )}
            {submitState === 'success' && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-lime"><ThumbsUp size={12} /> Report recorded — connected viewers will see this update live.</p>
            )}
          </section>

          {/* Recent reports */}
          <section>
            <h2 className="font-display text-xl">Recent community reports</h2>
            {venueReports.length === 0 ? (
              <p className="mt-3 rounded-xl2 border border-line bg-surface p-5 text-sm text-muted">No reports yet — yours would be the first.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {venueReports.map(r => (
                  <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl2 border border-line bg-surface px-4 py-2.5 text-sm">
                    <span className="flex items-center gap-2">
                      <span className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${crowdChipColor(r.level)}`}>{CROWD_LABELS[r.level as CrowdLevel]}</span>
                      <span className="text-muted">{relTime(r.submittedAt)} ago</span>
                      {r.simulated && <span className="rounded border border-line px-1 text-[9px] uppercase text-muted">sim</span>}
                    </span>
                    <span className="hidden truncate text-xs text-muted/80 sm:block">{r.note ?? ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right column */}
        <aside className="space-y-6">
          {/* Crowd summary */}
          <section className="rounded-xl2 border border-line bg-surface p-5">
            <h2 className="font-display text-xl">Crowd intelligence</h2>
            <div className="mt-3 flex items-center justify-between">
              <CrowdBadge summary={summary} />
              <ConfidenceLabel summary={summary} />
            </div>
            {summary && (
              <p className="mt-3 text-xs text-muted">{summary.explanation}</p>
            )}
            {summary?.lastReportAt && (
              <p className="mt-1 text-xs text-muted/70">Last report {relTime(summary.lastReportAt)} ago.</p>
            )}
          </section>

          {/* Alternatives */}
          <section>
            <h2 className="font-display text-xl">Quieter alternatives nearby</h2>
            {alternatives.length === 0 ? (
              <p className="mt-3 rounded-xl2 border border-line bg-surface p-5 text-sm text-muted">No comparable venues nearby with usable data.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {alternatives.map(a => (
                  <div key={a.venue.id} className="w-full">
                    <SimpleVenueCard venue={a.venue} onClick={() => navigate(`/venue/${a.venue.id}`)} />
                    <p className="px-1 pt-1.5 text-[11px] text-muted">{a.explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-line bg-elevated px-3 py-2">
      <span className="mt-0.5 text-muted">{icon}</span>
      <div>
        <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
        <div className="text-sm">{value}</div>
      </div>
    </div>
  )
}

function crowdChipColor(level: string) {
  return level === 'empty' ? 'bg-moss/25 text-moss'
    : level === 'comfortable' ? 'bg-lime/15 text-lime'
    : level === 'busy' ? 'bg-warm/15 text-warm'
    : 'bg-red-500/15 text-red-400'
}

function relTime(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)} hr ${m % 60} min`
}

type DecisionState = 'go' | 'wait' | 'try' | 'unknown'
function makeDecision(
  summary: CrowdSummary | null,
  alternatives: { venue: { id: string; name: string }; crowd: CrowdSummary | null; score: number }[],
): { state: DecisionState; reason: string } {
  if (!summary || summary.status == null) {
    return { state: 'unknown', reason: 'Not enough recent community reports to judge this venue right now. Be the first to report.' }
  }
  if (summary.status === 'empty' || summary.status === 'comfortable') {
    return { state: 'go', reason: `Recent reports say the venue is currently ${summary.status} — a reasonable time to go.` }
  }
  if (summary.status === 'busy') {
    if (alternatives.length > 0) {
      const best = alternatives[0]
      return { state: 'try', reason: `It's reported busy; ${best.venue.name} nearby is fresher and calmer right now.` }
    }
    return { state: 'wait', reason: 'Reports say it is busy right now, and there is no clearly better alternative nearby.' }
  }
  // packed
  if (alternatives.length > 0) {
    const best = alternatives[0]
    return { state: 'try', reason: `It's reported packed; ${best.venue.name} nearby looks calmer right now.` }
  }
  return { state: 'wait', reason: 'Reports say it is packed right now. Try again later — expect a wait.' }
}
