import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, RotateCcw, Search } from 'lucide-react'
import { VENUES } from '../data/seed'
import { parseQuery } from '../lib/intent'
import { rankVenues, localityCenter } from '../lib/ranking'
import { useLiveReports } from '../lib/useLiveReports'
import { VenueCard } from '../components/VenueCard'
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

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl md:text-4xl">Vibe Matchmaker</h1>
        <p className="mt-1 text-sm text-muted">
          {raw ? <>Interpreting: <span className="text-text">"{raw}"</span></> : 'Describe what you are looking for.'}
        </p>
        {baseIntent.matchedTokens.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {baseIntent.matchedTokens.map(t => (
              <span key={t} className="rounded-md border border-lime/30 bg-lime/10 px-2 py-0.5 text-xs text-lime">{t}</span>
            ))}
          </div>
        )}
      </header>

      {/* Filters */}
      <section className="rounded-xl2 border border-line bg-surface p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <SlidersHorizontal size={15} /> Refine
          {(budget || requireWifi || requirePlugs || requireWork || avoidCrowds || locality) && (
            <button
              onClick={() => { setBudget(null); setRequireWifi(false); setRequirePlugs(false); setRequireWork(false); setAvoidCrowds(false); setLocality(null) }}
              className="ml-auto flex items-center gap-1 text-xs text-muted hover:text-lime"
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-muted">
            Max budget
            <select
              value={budget ?? ''}
              onChange={e => setBudget(e.target.value ? Number(e.target.value) : null)}
              className="rounded-lg border border-line bg-elevated px-2 py-1.5 text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/60"
            >
              <option value="">Any</option>
              <option value="200">Under ₹200</option>
              <option value="400">Under ₹400</option>
              <option value="600">Under ₹600</option>
              <option value="1000">Under ₹1000</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            Area
            <select
              value={locality ?? ''}
              onChange={e => setLocality(e.target.value || null)}
              className="rounded-lg border border-line bg-elevated px-2 py-1.5 text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/60"
            >
              <option value="">Anywhere</option>
              {ALL_LOCALITIES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          {[
            { label: 'Wi-Fi', checked: requireWifi, set: setRequireWifi },
            { label: 'Charging points', checked: requirePlugs, set: setRequirePlugs },
            { label: 'Laptop-friendly', checked: requireWork, set: setRequireWork },
            { label: 'Avoid crowds', checked: avoidCrowds, set: setAvoidCrowds },
          ].map(cb => (
            <label key={cb.label} className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={cb.checked}
                onChange={e => cb.set(e.target.checked)}
                className="h-4 w-4 rounded border-line bg-elevated accent-[#C7F36B]"
              />
              {cb.label}
            </label>
          ))}
        </div>
      </section>

      {hasRef && (
        <p className="text-xs text-muted">Distances estimated from {query.locality}'s centre.</p>
      )}

      {/* Results */}
      {ranked.length === 0 ? (
        <div className="rounded-xl2 border border-line bg-surface p-8 text-center">
          <h2 className="font-display text-2xl">No confident match found</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Nothing satisfies all of those constraints together. Try broadening the budget, changing the area,
            or relaxing an amenity requirement.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button onClick={() => { setBudget(null); setLocality(null) }} className="rounded-xl bg-lime px-4 py-2 text-sm font-semibold text-bg">Broaden budget & area</button>
            <button onClick={() => { setRequireWifi(false); setRequirePlugs(false); setRequireWork(false) }} className="rounded-xl border border-line px-4 py-2 text-sm">Relax amenities</button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ranked.map(r => (
              <VenueCard key={r.venue.id} item={r} onClick={() => navigate(`/venue/${r.venue.id}`)} />
            ))}
          </div>
          <p className="text-center text-xs text-muted">
            Rankings use transparent scoring: hard constraints are filtered first (budget, area, amenities),
            then soft preferences score each venue 0–100. Crowd status uses only reports under 90 minutes old.
          </p>
        </>
      )}
      <div className="flex justify-center opacity-0 h-0 overflow-hidden"><Search size={1} /></div>
    </div>
  )
}
