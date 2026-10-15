import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Search, Sparkles, MapPin, IndianRupee, Clock3, Radio, ArrowUpRight } from 'lucide-react'
import { VENUES } from '../data/seed'
import { rankVenues } from '../lib/ranking'
import { useLiveReports } from '../lib/useLiveReports'
import { aggregateCrowd } from '../lib/crowdEngine'
import { VenueCard, VenueImage } from '../components/VenueCard'
import { CrowdIndicator, ConfidenceLabel } from '../components/CrowdBadge'
import { FloatingPanel, FrostedCard, InCard, MetricPill, OverlineLabel, CanvasHeading } from '../components/design'
import { localityPulse, DASHBOARD_LOCALITIES, relTime } from '../lib/localityPulse'
import type { CrowdLevel } from '../types/domain'
import { CROWD_LABELS } from '../lib/concepts'
import type { SearchQuery } from '../types/domain'

const MOODS = [
  { label: 'Deep Work', mood: 'deep work' },
  { label: 'Coffee Date', mood: 'coffee date' },
  { label: 'Social Hangout', mood: 'social hangout' },
  { label: 'Solo Reset', mood: 'solo reset' },
  { label: 'Budget Friendly', mood: 'budget' },
  { label: 'Study Session', mood: 'study' },
]

const EXAMPLES = ['Quiet workspace', 'Aesthetic date spot', 'Under ₹500', 'Less crowded now']

const FULL_EXAMPLES = [
  'Quiet café near Gachibowli under ₹400',
  'Aesthetic date spot in Jubilee Hills',
  'Gym that is less crowded right now',
  'Affordable salon near Madhapur',
]

const CATEGORIES = [
  { key: 'cafe', label: 'Cafés' },
  { key: 'gym', label: 'Gyms' },
  { key: 'salon', label: 'Salons' },
  { key: 'service', label: 'Service Centres' },
] as const

const NEUTRAL: SearchQuery = { noise: 'any' }

export function Home() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const { reports, connected } = useLiveReports()

  const goSearch = (query: string) => {
    if (query.trim()) navigate(`/matchmaker?q=${encodeURIComponent(query)}`)
  }

  const goCategory = (cat: string) => {
    navigate(`/matchmaker?q=${encodeURIComponent(cat)}`)
  }

  const now = Date.now()

  // Hero showcase panel: a venue with fresh crowd data, else the first café.
  const showcase = useMemo(() => {
    const withReports = VENUES.map(v => ({ v, s: aggregateCrowd(reports, v.id, now) }))
      .filter(x => x.s && x.s.reportCount > 0)
      .sort((a, b) => (b.s!.lastReportAt ?? 0) - (a.s!.lastReportAt ?? 0))
    const pick = withReports[0]?.v ?? VENUES.find(v => v.category === 'cafe') ?? VENUES[0]
    return { venue: pick, summary: aggregateCrowd(reports, pick.id, now) }
  }, [reports])

  const goodNow = useMemo(() => {
    const { ranked } = rankVenues(VENUES, reports, NEUTRAL, Date.now(), null)
    return ranked
      .filter(r => r.crowd?.status == null || r.crowd.status === 'empty' || r.crowd.status === 'comfortable')
      .slice(0, 6)
  }, [reports])

  const livePulse = useMemo(() => {
    const { ranked } = rankVenues(VENUES, reports, NEUTRAL, Date.now(), null)
    return ranked
      .filter(r => r.crowd?.status != null && r.crowd.reportCount > 0)
      .slice(0, 6)
  }, [reports])

  const pulses = useMemo(
    () => DASHBOARD_LOCALITIES.map(l => localityPulse(l, reports, now)),
    [reports],
  )

  const totalFreshReports = reports.filter(r => now - r.submittedAt <= 90 * 60 * 1000).length

  return (
    <div className="space-y-14">
      {/* ============ HERO ============ */}
      <section className="grid items-center gap-10 pt-2 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pt-6">
        {/* LEFT */}
        <div className="rise-in">
          <span className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white/50 px-3.5 py-1.5 backdrop-blur">
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-ink neon-pulse' : 'bg-ink/40'}`} />
            <OverlineLabel className="text-ink/70">Hyderabad · Live Discovery</OverlineLabel>
          </span>

          <h1 className="mt-5 text-4xl font-light leading-[1.05] tracking-tight text-ink sm:text-5xl xl:text-6xl">
            Find your next{' '}
            <span className="font-semibold">favourite place.</span>{' '}
            Catch the right vibe.
          </h1>
          <p className="mt-4 max-w-lg text-base text-ink/60 md:text-lg">
            Discover Hyderabad's cafés, gyms, salons and service centres by mood — then check how crowded they
            actually are right now, from real community reports.
          </p>

          {/* Search */}
          <form
            onSubmit={e => { e.preventDefault(); goSearch(q) }}
            className="frosted-card mt-7 flex max-w-xl items-center gap-1 rounded-full p-2 pl-4 focus-within:ring-2 focus-within:ring-charcoal/30"
          >
            <Search size={18} className="shrink-0 text-ink/45" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Find a quiet café near Gachibowli..."
              aria-label="Describe the place you're looking for"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] text-ink outline-none placeholder:text-ink/40"
            />
            <button
              type="submit"
              className="tactile focus-ring flex shrink-0 items-center gap-1.5 rounded-full bg-charcoal px-4 py-2.5 text-sm font-semibold text-ice md:px-5"
            >
              <Sparkles size={15} className="text-neon" />
              AI Match
            </button>
          </form>
          <div className="mt-3 flex max-w-xl flex-wrap gap-2">
            {EXAMPLES.map(x => (
              <button
                key={x}
                onClick={() => goSearch(x)}
                className="tactile focus-ring rounded-full border border-ink/15 bg-white/45 px-3 py-1.5 text-xs font-medium text-ink/65 hover:bg-white/70 hover:text-ink"
              >
                {x}
              </button>
            ))}
          </div>

          {/* Moods */}
          <div className="mt-8 flex max-w-xl flex-wrap gap-2">
            {MOODS.map(m => (
              <MetricPill key={m.mood} tone="light" onClick={() => goSearch(m.mood)}>
                {m.label}
              </MetricPill>
            ))}
          </div>
        </div>

        {/* RIGHT — floating venue preview, layered like the reference devices */}
        <div className="relative pb-10 lg:pb-0" aria-hidden={false}>
          <div className="relative mx-auto max-w-md">
            {/* back chip — decorative mini panel */}
            <div
              className="floating-panel ambient-float absolute -right-3 -top-6 z-0 hidden rounded-[1.5rem] bg-charcoal px-4 py-3 sm:block"
              style={{ transform: 'rotate(2.2deg)', ['--float-rot' as never]: '2.2deg' }}
            >
              <div className="flex items-center gap-2">
                <Radio size={13} className="text-neon neon-pulse" />
                <OverlineLabel className="text-ice/80">Live sync</OverlineLabel>
                <span className="rounded-full bg-neon px-2 py-0.5 text-[11px] font-bold text-ink">
                  {totalFreshReports} fresh reports
                </span>
              </div>
            </div>

            <FloatingPanel
              tone="charcoal"
              rotate={-1.6}
              className="relative z-10 p-3 md:p-4"
            >
              <FrostedCard className="overflow-hidden rounded-[1.6rem]">
                <div className="relative aspect-[16/11] overflow-hidden rounded-t-[1.6rem]">
                  <VenueImage url={showcase.venue.imageUrl} alt={showcase.venue.name} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3">
                    <CrowdIndicator summary={showcase.summary} variant="light" />
                  </div>
                  <span className="absolute right-3 top-3 rounded-full bg-charcoal/85 px-2.5 py-1 text-[11px] font-bold text-neon backdrop-blur">
                    OPEN NOW · {CROWD_LABELS[showcase.summary?.status ?? 'empty'] === 'No live data' ? 'see reports' : CROWD_LABELS[showcase.summary?.status ?? 'empty']}
                  </span>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold tracking-tight text-ink">{showcase.venue.name}</h3>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-ink/55">
                        <MapPin size={11} /> {showcase.venue.locality}
                      </p>
                    </div>
                    {showcase.venue.pricePerPerson != null && (
                      <span className="flex items-center gap-0.5 rounded-full border border-lineDark bg-white px-2.5 py-1 text-sm font-semibold text-ink">
                        <IndianRupee size={12} />
                        {showcase.venue.pricePerPerson}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <CrowdIndicator summary={showcase.summary} variant="dark" />
                    <ConfidenceLabel summary={showcase.summary} />
                  </div>

                  <button
                    onClick={() => navigate(`/venue/${showcase.venue.id}`)}
                    className="tactile focus-ring mt-3 flex w-full items-center justify-between rounded-2xl bg-charcoal px-4 py-3 text-left text-sm font-semibold text-ice"
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles size={14} className="text-neon" />
                      Good time to go — calm crowd reported
                    </span>
                    <ArrowUpRight size={16} />
                  </button>
                  <p className="mt-2 text-[10px] leading-relaxed text-ink/45">
                    Status from community reports only. {showcase.summary && showcase.summary.lastReportAt
                      ? `Last report ${relTime(showcase.summary.lastReportAt)} ago.`
                      : 'No recent reports yet.'}
                  </p>
                </div>
              </FrostedCard>
            </FloatingPanel>

            {/* front chip — recommendation mini card */}
            <div
              className="floating-panel ambient-float absolute -left-2 -bottom-5 z-20 rounded-[1.5rem] bg-charcoal px-4 py-3 md:-left-6"
              style={{ transform: 'rotate(-2deg)', ['--float-rot' as never]: '-2deg' }}
            >
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-neon text-ink">
                  <Clock3 size={14} />
                </span>
                <div>
                  <OverlineLabel className="text-ice/70">Best window</OverlineLabel>
                  <div className="text-sm font-semibold text-ice">Late afternoon · calmer crowds</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(c => (
            <MetricPill key={c.key} tone="light" onClick={() => goCategory(c.label)}>
              {c.label}
              <span className="rounded-full bg-charcoal/10 px-1.5 py-0.5 text-[10px] font-bold text-ink/55">
                {VENUES.filter(v => v.category === c.key).length}
              </span>
            </MetricPill>
          ))}
        </div>
      </section>

      {/* ============ LOCALITY INTELLIGENCE ============ */}
      <section>
        <CanvasHeading
          title="Live crowd intelligence"
          sub="Locality-level pulse from community reports in the last 90 minutes. Nothing here is official occupancy — it is only as fresh as the latest reports."
          right={<Neonish connected={connected} />}
        />
        <FloatingPanel tone="charcoal" className="mt-5 p-4 md:p-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {pulses.map(p => (
              <FrostedCard key={p.locality} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold tracking-tight text-ink">{p.locality}</h3>
                  {p.level && p.reportCount > 0 ? (
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        p.level === 'empty' || p.level === 'comfortable'
                          ? 'bg-charcoal text-neon'
                          : p.level === 'busy'
                            ? 'bg-charcoal text-amber'
                            : 'bg-charcoal text-rose'
                      }`}
                    >
                      {CROWD_LABELS[p.level as CrowdLevel]}
                    </span>
                  ) : (
                    <span className="rounded-full border border-lineDark bg-white/60 px-2.5 py-1 text-[11px] font-medium text-ink/50">
                      no data
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xl font-light text-ink/80">
                  {p.reportCount > 0 ? (
                    <>
                      <span className="text-3xl font-semibold tracking-tight text-ink">{p.reportCount}</span>{' '}
                      report{p.reportCount === 1 ? '' : 's'} · 90 min window
                    </>
                  ) : (
                    'No reports in the current window'
                  )}
                </p>
                <p className="mt-1.5 flex items-center gap-1 text-xs text-ink/50">
                  <Clock3 size={11} />
                  {p.lastUpdated
                    ? `Updated ${relTime(p.lastUpdated)} ago`
                    : 'Be the first — report any venue nearby'}
                </p>
              </FrostedCard>
            ))}
          </div>
        </FloatingPanel>
      </section>

      {/* ============ GOOD PLACES RIGHT NOW ============ */}
      <section>
        <CanvasHeading
          title="Good places, right now"
          sub="Calm or unreported venues that fit a general outing — ranked by transparent scoring."
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goodNow.map((r, i) => (
            <div key={r.venue.id} className={i === 0 ? 'rise-in' : i <= 2 ? 'rise-in rise-in-slow' : 'rise-in rise-in-slower'}>
              <VenueCard item={r} variant={i === 0 ? 'featured' : 'light'} onClick={() => navigate(`/venue/${r.venue.id}`)} />
            </div>
          ))}
        </div>
      </section>

      {/* ============ LIVE CROWD PULSE ============ */}
      <section>
        <CanvasHeading
          title="Live crowd pulse"
          sub="Venues with community reports in the last 90 minutes. Confidence grows as reports accumulate."
          right={<Neonish connected={connected} />}
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {livePulse.map(r => (
            <VenueCard key={r.venue.id} item={r} variant="dark" onClick={() => navigate(`/venue/${r.venue.id}`)} />
          ))}
        </div>
        {livePulse.length === 0 && (
          <FrostedCard className="mt-5 p-6 text-sm text-ink/60">
            No fresh reports yet in this window. Be the first to report a venue — open any place and tap "Report crowd".
          </FrostedCard>
        )}
      </section>

      {/* Freshness note */}
      <section>
        <FloatingPanel tone="charcoal" className="p-5 md:p-6">
          <InCard className="p-4 md:p-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neon text-ink">
                <Sparkles size={14} />
              </span>
              <p className="text-sm leading-relaxed text-ink/75">
                <span className="font-semibold text-ink">How crowd data works.</span>{' '}
                HydVibe never claims official occupancy. Status comes only from community reports submitted in the
                last 90 minutes; older reports expire, and confidence drops when reports are sparse or disagree.
                Every status shows the number of reports behind it.
              </p>
            </div>
          </InCard>
        </FloatingPanel>
      </section>

      {/* keep full examples discoverable (used by Matchmaker's deep link examples) */}
      <FullExampleList />
    </div>
  )
}

function FullExampleList() {
  const navigate = useNavigate()
  return (
    <section className="rounded-3xl bg-white/40 p-4 backdrop-blur-sm md:p-5">
      <p className="text-xs font-medium text-ink/60">Try a full query:</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {FULL_EXAMPLES.map(x => (
          <button
            key={x}
            onClick={() => navigate(`/matchmaker?q=${encodeURIComponent(x)}`)}
            className="tactile focus-ring rounded-full border border-ink/15 bg-white px-3 py-1.5 text-xs text-ink/70 hover:border-ink/30 hover:text-ink"
          >
            "{x}"
          </button>
        ))}
      </div>
    </section>
  )
}

function Neonish({ connected }: { connected?: boolean | null }) {
  const up = connected === true
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium ${
        up ? 'border-neon/50 bg-charcoal text-neon neon-pulse' : 'border-ink/15 bg-white/50 text-ink/55'
      }`}
    >
      {up ? '● live sync' : '○ offline sample'}
      <ArrowRight size={11} className={up ? 'text-neon' : 'text-ink/40'} />
    </span>
  )
}
