import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Search, Sparkles } from 'lucide-react'
import { VENUES } from '../data/seed'
import { rankVenues } from '../lib/ranking'
import { useLiveReports } from '../lib/useLiveReports'
import { VenueCard } from '../components/VenueCard'
import type { SearchQuery } from '../types/domain'

const MOODS = [
  { label: 'Deep Work', mood: 'deep work' },
  { label: 'Coffee Date', mood: 'coffee date' },
  { label: 'Social Hangout', mood: 'social hangout' },
  { label: 'Solo Reset', mood: 'solo reset' },
  { label: 'Budget Friendly', mood: 'budget' },
  { label: 'Study Session', mood: 'study' },
]

const EXAMPLES = [
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

export function Home() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const { reports, connected } = useLiveReports()

  const goSearch = (query: string) => {
    navigate(`/matchmaker?q=${encodeURIComponent(query)}`)
  }

  const goCategory = (cat: string) => {
    navigate(`/matchmaker?q=${encodeURIComponent(cat)}`)
  }

  // "Good places, right now": calm-or-unknown venues, ranked generically
  const goodNow = useMemo(() => {
    const generic: SearchQuery = { noise: 'any' }
    const { ranked } = rankVenues(VENUES, reports, generic, Date.now(), null)
    return ranked
      .filter(r => r.crowd?.status == null || r.crowd.status === 'empty' || r.crowd.status === 'comfortable')
      .slice(0, 6)
  }, [reports])

  const livePulse = useMemo(() => {
    const { ranked } = rankVenues(VENUES, reports, { noise: 'any' }, Date.now(), null)
    return ranked
      .filter(r => r.crowd?.status != null && r.crowd.reportCount > 0)
      .slice(0, 6)
  }, [reports])

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-xl2 border border-line">
        <img
          src="https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1600&q=60"
          alt="Charminar, Hyderabad"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="relative bg-gradient-to-t from-bg via-bg/70 to-transparent p-6 md:p-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-lime/30 bg-lime/10 px-3 py-1 text-xs font-medium text-lime">
            <Sparkles size={13} /> Crowd-sourced, live from the city
          </span>
          <h1 className="mt-4 max-w-2xl font-display text-4xl leading-tight md:text-6xl">
            Your next favorite place is waiting.
          </h1>
          <p className="mt-3 max-w-xl text-muted md:text-lg">
            Discover Hyderabad's cafés, gyms, salons and service centres by vibe — and check how crowded they are right now, straight from the community.
          </p>

          <form
            onSubmit={e => {
              e.preventDefault()
              goSearch(q)
            }}
            className="mt-6 flex max-w-xl items-stretch overflow-hidden rounded-xl2 border border-line bg-elevated shadow-card focus-within:border-lime/50"
          >
            <span className="grid w-12 place-items-center text-muted"><Search size={18} /></span>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Where do you want to go? e.g. quiet café in Gachibowli"
              className="min-w-0 flex-1 bg-transparent py-3.5 text-base outline-none placeholder:text-muted/60"
              aria-label="Describe the place you're looking for"
            />
            <button
              type="submit"
              className="m-1.5 flex items-center gap-1.5 rounded-xl bg-lime px-4 font-semibold text-bg transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-lime"
            >
              Find <ArrowRight size={16} />
            </button>
          </form>

          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map(x => (
              <button
                key={x}
                onClick={() => goSearch(x)}
                className="rounded-full border border-line bg-elevated/80 px-3 py-1.5 text-xs text-muted transition hover:border-lime/40 hover:text-lime"
              >
                {x}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Moods */}
      <section>
        <h2 className="font-display text-2xl">What's your vibe today?</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {MOODS.map(m => (
            <button
              key={m.mood}
              onClick={() => goSearch(m.mood)}
              className="rounded-xl2 border border-line bg-surface px-4 py-2.5 text-sm text-muted transition hover:border-lime/50 hover:text-lime focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/60"
            >
              {m.label}
            </button>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section>
        <h2 className="font-display text-2xl">Browse by category</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => goCategory(c.label)}
              className="surface-hover rounded-xl2 border border-line bg-surface p-4 text-left transition hover:border-lime/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/60"
            >
              <div className="font-display text-lg">{c.label}</div>
              <div className="mt-1 text-xs text-muted">
                {VENUES.filter(v => v.category === c.key).length} places tracked
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Good places right now */}
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl">Good places, right now</h2>
          <span className={`text-xs ${connected ? 'text-lime' : 'text-warm'}`}>
            {connected ? '● live' : '○ offline sample'}
          </span>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goodNow.map(r => (
            <VenueCard key={r.venue.id} item={r} onClick={() => navigate(`/venue/${r.venue.id}`)} />
          ))}
        </div>
      </section>

      {/* Live crowd pulse */}
      <section>
        <h2 className="font-display text-2xl">Live crowd pulse</h2>
        <p className="mt-1 text-sm text-muted">
         venues with fresh community reports in the last 90 minutes. Confidence grows with every report.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {livePulse.map(r => (
            <VenueCard key={r.venue.id} item={r} onClick={() => navigate(`/venue/${r.venue.id}`)} />
          ))}
        </div>
        {livePulse.length === 0 && (
          <p className="rounded-xl2 border border-line bg-surface p-6 text-sm text-muted">
            No fresh reports yet in this window. Be the first to report a venue — open any place and tap "Report crowd".
          </p>
        )}
      </section>

      {/* Crowd freshness note */}
      <section className="rounded-xl2 border border-line bg-surface p-5 text-sm text-muted">
        <span className="font-medium text-text">How crowd data works.</span> HydVibe never claims official occupancy. Status comes
        only from community reports submitted in the last 90 minutes; older reports expire, and confidence drops when
        reports are sparse or disagree. You can always see the number of reports behind every status.
      </section>
    </div>
  )
}
