import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Heart, Share2, Wifi, Plug, Laptop, IndianRupee, Clock, MapPin,
  AlertTriangle, ThumbsUp, ExternalLink, TrendingUp, TrendingDown, Minus, Check,
} from 'lucide-react'
import { VENUES } from '../data/seed'
import { aggregateCrowd } from '../lib/crowdEngine'
import { suggestAlternatives } from '../lib/ranking'
import { useLiveReports } from '../lib/useLiveReports'
import { api, getSessionId } from '../lib/api'
import { usePrefs } from '../lib/usePrefs'
import { CrowdIndicator, ConfidenceLabel } from '../components/CrowdBadge'
import { VenueImage, SimpleVenueCard } from '../components/VenueCard'
import { FloatingPanel, FrostedCard, InCard, MetricPill, OverlineLabel } from '../components/design'
import { relTime } from '../lib/localityPulse'
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
      <FloatingPanel tone="charcoal" className="p-10 text-center">
        <h1 className="text-2xl font-light text-text">Venue not found</h1>
        <button onClick={() => navigate('/')} className="tactile focus-ring mt-5 rounded-full bg-neon px-5 py-2 font-semibold text-ink">
          Back to Discover
        </button>
      </FloatingPanel>
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
    summary?.trend === 'rising' ? <TrendingUp size={14} className="text-amber" />
    : summary?.trend === 'falling' ? <TrendingDown size={14} className="text-neon" />
    : summary?.trend === 'steady' ? <Minus size={14} className="text-muted" />
    : null

  const actionBtn = 'tactile focus-ring flex items-center gap-1.5 rounded-full border border-white/45 px-4 py-2 text-sm font-medium text-ice transition hover:bg-white/[0.1]'

  return (
    <div className="space-y-7">
      <button onClick={() => navigate(-1)} className="tactile focus-ring flex items-center gap-1.5 rounded-full border border-ink/15 bg-white/45 px-3.5 py-1.5 text-sm font-medium text-ink/70 backdrop-blur hover:bg-white/70 hover:text-ink">
        <ArrowLeft size={15} /> Back
      </button>

      {/* Hero — floating device panel with photo */}
      <section className="rise-in relative">
        <FloatingPanel tone="charcoal" className="overflow-hidden p-2.5 md:p-3">
          <div className="relative overflow-hidden rounded-[2rem]">
            <VenueImage url={venue.imageUrl} alt={venue.name} className="h-60 w-full object-cover md:h-80" />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-black/25 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 flex flex-wrap items-end justify-between gap-3 p-5 md:p-7">
              <div>
                <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-neon px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink">
                  {!venue.verified && 'sample listing · '}
                  {venue.locality}
                </span>
                <h1 className="text-3xl font-light tracking-tight text-ice md:text-5xl">
                  <span className="font-semibold">{venue.name}</span>
                </h1>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ice/70">
                  <span className="flex items-center gap-1"><Clock size={13} /> {venue.openHours ?? 'Hours unknown'}</span>
                  <span className="flex items-center gap-1"><MapPin size={13} /> {venue.locality}</span>
                </p>
              </div>
              <CrowdIndicator summary={summary} variant="dark" className="text-sm" />
            </div>
          </div>
        </FloatingPanel>
      </section>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => toggleSaved(venue.id)}
          className={`${actionBtn} ${saved ? 'border-neon bg-neon text-ink' : ''}`}
        >
          <Heart size={15} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save'}
        </button>
        <button onClick={copyShare} className={actionBtn}>
          <Share2 size={15} /> Share
        </button>
        <a
          href={venue.lat && venue.lng ? `https://www.openstreetmap.org/?mlat=${venue.lat}&mlon=${venue.lng}#map=17/${venue.lat}/${venue.lng}` : undefined}
          target="_blank"
          rel="noreferrer"
          className={`${actionBtn} ${!(venue.lat && venue.lng) ? 'pointer-events-none opacity-50' : ''}`}
        >
          <ExternalLink size={15} /> Directions
        </a>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/45 bg-charcoal px-3.5 py-2 text-xs text-muted">
          {connected ? <span className="h-1.5 w-1.5 rounded-full bg-neon neon-pulse" /> : <span className="h-1.5 w-1.5 rounded-full bg-muted" />}
          {connected ? 'live' : 'offline sample'}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* LEFT */}
        <div className="space-y-6">
          {/* Decision panel */}
          <section>
            <FloatingPanel tone="charcoal" className="p-5 md:p-6">
              <OverlineLabel className="text-ice/60">Decision engine</OverlineLabel>
              <h2 className="mt-1 text-2xl font-light tracking-tight text-text md:text-3xl">
                Should I go <span className="font-semibold">now?</span>
              </h2>
              <div className="mt-4">
                {decision.state === 'unknown' ? (
                  <p className="pop-in inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-ice/80">
                    NOT ENOUGH DATA
                  </p>
                ) : (
                  <p
                    className={`pop-in inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold tracking-wide ${
                      decision.state === 'go'
                        ? 'bg-neon text-ink neon-pulse'
                        : decision.state === 'wait'
                          ? 'bg-amber/15 text-amber border border-amber/40'
                          : 'border border-rose/40 bg-rose/15 text-rose'
                    }`}
                  >
                    {decision.state === 'go' && 'GO NOW'}
                    {decision.state === 'wait' && 'CONSIDER WAITING'}
                    {decision.state === 'try' && 'TRY AN ALTERNATIVE'}
                  </p>
                )}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">{decision.reason}</p>
              {summary && summary.trend !== 'unknown' && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-ice/60">
                  {trendIcon} Trend: {summary.trend} (based on {summary.reportCount} reports)
                </p>
              )}
              <p className="mt-3 text-[11px] text-muted/70">
                Evidence-based suggestion, not a guarantee. Crowd status depends entirely on community reports.
              </p>
            </FloatingPanel>
          </section>

          {/* About */}
          <section>
            <FloatingPanel tone="charcoal" className="p-5 md:p-6">
              <OverlineLabel className="text-ice/60">About this place</OverlineLabel>
              <p className="mt-3 text-sm leading-relaxed text-ice/80">{venue.description ?? 'No description yet.'}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {(venue.vibeTags ?? []).map(t => (
                  <MetricPill key={t} tone="dark">{t}</MetricPill>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2.5 md:grid-cols-3">
                <Detail icon={<IndianRupee size={14} />} label="Per person" value={venue.pricePerPerson != null ? `~ ₹${venue.pricePerPerson}` : 'Unknown'} />
                <Detail icon={<Clock size={14} />} label="Hours" value={`${venue.openHours ?? 'Unknown'}${venue.hoursSource ? ` (${venue.hoursSource})` : ''}`} />
                <Detail icon={<Wifi size={14} />} label="Wi-Fi" value={venue.hasWifi == null ? 'Unknown' : venue.hasWifi ? 'Available' : 'Not available'} />
                <Detail icon={<Plug size={14} />} label="Charging" value={venue.hasPlugPoints == null ? 'Unknown' : venue.hasPlugPoints ? 'Available' : 'Not available'} />
                <Detail icon={<Laptop size={14} />} label="Laptop-friendly" value={venue.workFriendly == null ? 'Unknown' : venue.workFriendly ? 'Yes' : 'No'} />
                <Detail icon={<MapPin size={14} />} label="Address" value={venue.address ?? 'Not listed'} />
              </div>
            </FloatingPanel>
          </section>

          {/* Report flow */}
          <section id="report">
            <FloatingPanel tone="charcoal" className="p-5 md:p-6">
              <OverlineLabel className="text-ice/60">Community reporting</OverlineLabel>
              <h2 className="mt-1 text-2xl font-light tracking-tight text-text">Report the crowd</h2>
              <p className="mt-1.5 text-sm text-muted">How does it look right now? Takes 5 seconds, no sign-in.</p>

              <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {LEVELS.map(level => (
                  <button
                    key={level}
                    onClick={() => setSelectedLevel(level)}
                    aria-pressed={selectedLevel === level}
                    className={`tactile focus-ring rounded-2xl border px-3 py-4 text-center transition ${
                      selectedLevel === level
                        ? 'border-neon bg-neon text-ink shadow-neonGlow'
                        : 'border-white/35 bg-white/[0.05] text-ice/75 hover:border-white/60 hover:bg-white/[0.1]'
                    } ${submitState === 'success' && selectedLevel === null ? '' : ''}`}
                  >
                    <span className="block text-sm font-semibold">{CROWD_LABELS[level]}</span>
                  </button>
                ))}
              </div>

              <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
                <input
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Optional: a quick note (e.g. 'counter queue is long')"
                  maxLength={240}
                  className="min-w-0 flex-1 rounded-2xl border border-white/35 bg-white/[0.05] px-4 py-2.5 text-sm text-ice outline-none transition placeholder:text-muted/70 focus:border-neon/60"
                />
                <button
                  onClick={submit}
                  disabled={!selectedLevel || submitState !== 'idle'}
                  className="tactile focus-ring rounded-2xl bg-neon px-6 py-2.5 text-sm font-bold text-ink shadow-neonGlow transition disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                >
                  {submitState === 'submitting' ? 'Submitting…' : submitState === 'success' ? 'Reported!' : submitState === 'error' ? 'Retry' : 'Submit report'}
                </button>
              </div>

              {error && (
                <p className="fade-slide mt-2.5 flex items-center gap-1.5 text-xs text-rose"><AlertTriangle size={12} /> {error}</p>
              )}
              {submitState === 'success' && (
                <p className="pop-in mt-3 inline-flex items-center gap-2 rounded-2xl border border-neon/40 bg-neon/10 px-4 py-2.5 text-xs font-medium text-neon">
                  <Check size={13} /> Report recorded — connected viewers see this update live. Thank you!
                </p>
              )}
              <p className="mt-3 text-[11px] text-muted/70">
                {venueReports.length} recent report{venueReports.length === 1 ? '' : 's'} on record · status recalculates as reports arrive.
              </p>
            </FloatingPanel>
          </section>

          {/* Recent reports */}
          <section>
            <FloatingPanel tone="charcoal" className="p-5 md:p-6">
              <h2 className="text-xl font-light tracking-tight text-text">Recent community reports</h2>
              {venueReports.length === 0 ? (
                <FrostedCard className="mt-4 p-4 text-sm text-ink/60">No reports yet — yours would be the first.</FrostedCard>
              ) : (
                <ul className="panel-scroll mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                  {venueReports.map(r => (
                    <li key={r.id} className="fade-slide flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm">
                      <span className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${reportChip(r.level)}`}>{CROWD_LABELS[r.level as CrowdLevel]}</span>
                        <span className="text-muted">{relTime(r.submittedAt)} ago</span>
                        {r.simulated && <span className="rounded border border-amber/40 bg-amber/10 px-1 text-[9px] font-bold uppercase text-amber">sim</span>}
                      </span>
                      <span className="hidden truncate text-xs text-muted/80 sm:block">{r.note ?? ''}</span>
                    </li>
                  ))}
                </ul>
              )}
            </FloatingPanel>
          </section>
        </div>

        {/* RIGHT */}
        <aside className="space-y-6">
          {/* Crowd intelligence */}
          <section>
            <FloatingPanel tone="charcoal" className="p-5 md:p-6">
              <OverlineLabel className="text-ice/60">Crowd intelligence</OverlineLabel>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <CrowdIndicator summary={summary} variant="dark" />
                <ConfidenceLabel summary={summary} />
              </div>
              {summary?.explanation && (
                <p className="mt-3.5 text-xs leading-relaxed text-ice/70">{summary.explanation}</p>
              )}
              {summary?.lastReportAt && (
                <p className="mt-2 text-[11px] text-muted/70">Last report {relTime(summary.lastReportAt)} ago.</p>
              )}
            </FloatingPanel>
          </section>

          {/* Alternatives */}
          <section>
            <div className="flex items-center justify-between">
              <OverlineLabel className="text-ink/55">Quieter alternatives</OverlineLabel>
            </div>
            {alternatives.length === 0 ? (
              <FrostedCard className="mt-3 p-4 text-sm text-ink/60">No comparable venues nearby with usable data.</FrostedCard>
            ) : (
              <div className="mt-3 space-y-3">
                {alternatives.map(a => (
                  <div key={a.venue.id}>
                    <SimpleVenueCard
                      venue={a.venue}
                      summary={a.crowd}
                      onClick={() => navigate(`/venue/${a.venue.id}`)}
                    />
                    <p className="px-1 pt-1.5 text-[11px] leading-relaxed text-ink/55">{a.explanation}</p>
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
    <InCard className="flex items-start gap-2 p-2.5">
      <span className="mt-0.5 text-neon">{icon}</span>
      <div className="min-w-0">
        <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</div>
        <div className="truncate text-sm text-ice/90">{value}</div>
      </div>
    </InCard>
  )
}

function reportChip(level: string) {
  return level === 'empty' || level === 'comfortable'
    ? 'bg-neon text-ink'
    : level === 'busy'
      ? 'bg-amber/15 text-amber border border-amber/40'
      : 'bg-rose/15 text-rose border border-rose/40'
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
  if (alternatives.length > 0) {
    const best = alternatives[0]
    return { state: 'try', reason: `It's reported packed; ${best.venue.name} nearby looks calmer right now.` }
  }
  return { state: 'wait', reason: 'Reports say it is packed right now. Try again later — expect a wait.' }
}
