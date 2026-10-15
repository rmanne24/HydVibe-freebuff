import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, RotateCcw, Sparkles, SearchX } from 'lucide-react'
import { VENUES } from '../data/seed'
import { parseQuery } from '../lib/intent'
import { rankVenues, localityCenter } from '../lib/ranking'
import { useLiveReports } from '../lib/useLiveReports'
import { VenueCard } from '../components/VenueCard'
import { FloatingPanel, FrostedCard, InCard, MetricPill, OverlineLabel, CanvasHeading } from '../components/design'
import type { SearchQuery } from '../types/domain'

const ALL_LOCALITIES = ['Gachibowli', 'Madhapur', 'Kondapur', 'HITEC City', 'Jubilee Hills', 'Banjara Hills', 'Manikonda', 'Khairatabad']

export function Matchmaker() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const raw = params.get('q') ?? ''
  const { reports } = useLiveReports()

  const [budget, setBudget] = useState<number | null>(null)
  const [requireWifi, setRequireWifi] = useState(false)
  const [requirePlugs, setRequirePlugs] = useState(false)
  const [requireWork, setRequireWork] = useState(false)
  const [avoidCrowds, setAvoidCrowds] = useState(false)
  const [locality, setLocality] = useState<string | null>(null)

  const baseIntent = useMemo(() => parseQuery(raw), [raw])

  const query: SearchQuery = useMemo(
    () => ({
      ...baseIntent,
      maxBudget: budget ?? baseIntent.maxBudget,
      locality: locality ?? baseIntent.locality,
      wifi: requireWifi || baseIntent.wifi,
      plugs: requirePlugs || baseIntent.plugs,
      workFriendly: requireWork || baseIntent.workFriendly,
      avoidCrowds: avoidCrowds || baseIntent.avoidCrowds,
    }),
    [baseIntent, budget, requireWifi, requirePlugs, requireWork, avoidCrowds, locality],
  )

  const ranked = useMemo(
    () => rankVenues(VENUES, reports, query, Date.now(), null).ranked,
    [reports, query],
  )

  const hasRef = query.locality ? localityCenter(query.locality) : null

  const selectCls =
    'rounded-xl border border-white/30 bg-white/[0.07] px-2.5 py-1.5 text-sm text-text focus-ring transition hover:bg-white/[0.12]'

  return (
    <div className="space-y-8">
      <header className="rise-in">
        <OverlineLabel className="text-ink/55">Vibe discovery</OverlineLabel>
        <h1 className="mt-1 text-3xl font-light tracking-tight text-ink md:text-4xl">
          Vibe <span className="font-semibold">Matchmaker</span>
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          {raw ? <>Interpreting: <span className="font-semibold text-ink">"{raw}"</span></> : 'Describe what you are looking for — e.g. "quiet café near Gachibowli under ₹400".'}
        </p>
        {baseIntent.matchedTokens.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {baseIntent.matchedTokens.map(t => (
              <MetricPill key={t} tone="light" active>
                <Sparkles size={11} /> {t}
              </MetricPill>
            ))}
          </div>
        )}
      </header>

      {/* Filters — floating dark panel */}
      <FloatingPanel tone="charcoal" className="p-4 md:p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-text">
          <SlidersHorizontal size={15} className="text-neon" /> Refine
          {(budget || requireWifi || requirePlugs || requireWork || avoidCrowds || locality) && (
            <button
              onClick={() => { setBudget(null); setRequireWifi(false); setRequirePlugs(false); setRequireWork(false); setAvoidCrowds(false); setLocality(null) }}
              className="focus-ring ml-auto flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-muted transition hover:bg-white/[0.08] hover:text-neon"
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-muted">
          <label className="flex items-center gap-2">
            Max budget
            <select value={budget ?? ''} onChange={e => setBudget(e.target.value ? Number(e.target.value) : null)} className={selectCls} style={{ colorScheme: 'dark' }}>
              <option value="" className="bg-charcoal">Any</option>
              <option value="200" className="bg-charcoal">Under ₹200</option>
              <option value="400" className="bg-charcoal">Under ₹400</option>
              <option value="600" className="bg-charcoal">Under ₹600</option>
              <option value="1000" className="bg-charcoal">Under ₹1000</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            Area
            <select value={locality ?? ''} onChange={e => setLocality(e.target.value || null)} className={selectCls} style={{ colorScheme: 'dark' }}>
              <option value="" className="bg-charcoal">Anywhere</option>
              {ALL_LOCALITIES.map(l => <option key={l} value={l} className="bg-charcoal">{l}</option>)}
            </select>
          </label>
          {[
            { label: 'Wi-Fi', checked: requireWifi, set: setRequireWifi },
            { label: 'Charging points', checked: requirePlugs, set: setRequirePlugs },
            { label: 'Laptop-friendly', checked: requireWork, set: setRequireWork },
            { label: 'Avoid crowds', checked: avoidCrowds, set: setAvoidCrowds },
          ].map(cb => (
            <button
              key={cb.label}
              onClick={() => cb.set(!cb.checked)}
              aria-pressed={cb.checked}
              className={`tactile focus-ring rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                cb.checked ? 'border-neon bg-neon text-ink' : 'border-white/35 bg-white/[0.06] text-ice/80 hover:bg-white/[0.12]'
              }`}
            >
              {cb.label}
            </button>
          ))}
        </div>

        {hasRef && (
          <p className="mt-3 text-[11px] text-muted/80">Distances estimated from {query.locality}'s centre.</p>
        )}
      </FloatingPanel>

      {/* Results */}
      {ranked.length === 0 ? (
        <FloatingPanel tone="charcoal" className="p-8 text-center md:p-10">
          <div className="mx-auto max-w-md">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white/[0.08] text-neon">
              <SearchX size={22} />
            </span>
            <h2 className="mt-4 text-2xl font-light tracking-tight text-text">No confident match found</h2>
            <p className="mx-auto mt-2 text-sm text-muted">
              Nothing satisfies all of those constraints together. Try broadening the budget, changing the area,
              or relaxing an amenity requirement.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button onClick={() => { setBudget(null); setLocality(null) }} className="tactile focus-ring rounded-full bg-neon px-4 py-2 text-sm font-semibold text-ink">
                Broaden budget & area
              </button>
              <button onClick={() => { setRequireWifi(false); setRequirePlugs(false); setRequireWork(false) }} className="tactile focus-ring rounded-full border border-white/45 px-4 py-2 text-sm text-ice">
                Relax amenities
              </button>
            </div>
          </div>
        </FloatingPanel>
      ) : (
        <>
          <CanvasHeading
            title={`${ranked.length} match${ranked.length === 1 ? '' : 'es'}`}
            sub="Hard constraints are filtered first (budget, area, amenities); soft preferences then score each venue 0–100. Crowd status uses only reports under 90 minutes old."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ranked.map((r, i) => (
              <div key={r.venue.id} className={i === 0 ? 'rise-in' : i <= 2 ? 'rise-in rise-in-slow' : 'rise-in rise-in-slower'}>
                <VenueCard item={r} variant={i % 2 === 0 ? 'light' : 'dark'} onClick={() => navigate(`/venue/${r.venue.id}`)} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
