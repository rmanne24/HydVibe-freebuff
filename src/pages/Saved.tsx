import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Clock3, History } from 'lucide-react'
import { VENUES } from '../data/seed'
import { useLiveReports } from '../lib/useLiveReports'
import { aggregateCrowd } from '../lib/crowdEngine'
import { VenueCard, SimpleVenueCard } from '../components/VenueCard'
import type { RankedVenue } from '../types/domain'

export function Saved() {
  const navigate = useNavigate()
  const { reports } = useLiveReports()
  const [prefKey, force] = useState(0)
  const savedPrefs = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('hydvibe.prefs.v1') ?? '{}')
    } catch {
      return {}
    }
    // dependent on prefKey to force refresh on unsave
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [prefKey])

  const savedIds: string[] = savedPrefs.savedVenueIds ?? []
  const viewedIds: string[] = savedPrefs.recentlyViewed ?? []
  const searches: string[] = savedPrefs.recentSearches ?? []

  const savedRanked: RankedVenue[] = useMemo(() => {
    return VENUES.filter(v => savedIds.includes(v.id)).map(v => ({
      venue: v,
      score: 70,
      crowd: aggregateCrowd(reports, v.id, Date.now()),
      explanation: v.description ?? '',
      missing: [],
    }))
  }, [savedIds.join(','), reports])

  const remove = (id: string) => {
    const next = savedIds.filter(x => x !== id)
    localStorage.setItem('hydvibe.prefs.v1', JSON.stringify({ ...savedPrefs, savedVenueIds: next }))
    force(k => k + 1)
  }

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl md:text-4xl">Saved & recent</h1>

      <section>
        <h2 className="flex items-center gap-2 font-display text-xl"><Heart size={16} className="text-lime" /> Saved places ({savedIds.length})</h2>
        {savedRanked.length === 0 ? (
          <p className="mt-3 rounded-xl2 border border-line bg-surface p-6 text-sm text-muted">
            Nothing saved yet. Tap the heart on any venue to keep it here.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {savedRanked.map(r => (
              <div key={r.venue.id} className="relative">
                <VenueCard item={r} onClick={() => navigate(`/venue/${r.venue.id}`)} />
                <button
                  onClick={() => remove(r.venue.id)}
                  className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-1.5 text-muted hover:text-red-400"
                  aria-label="Remove from saved"
                >
                  <Heart size={14} fill="currentColor" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="flex items-center gap-2 font-display text-xl"><Clock3 size={16} className="text-warm" /> Recently viewed</h2>
        {viewedIds.length === 0 ? (
          <p className="mt-3 rounded-xl2 border border-line bg-surface p-6 text-sm text-muted">Venues you open will appear here.</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {viewedIds.map(vid => {
              const v = VENUES.find(x => x.id === vid)
              if (!v) return null
              return <SimpleVenueCard key={vid} venue={v} onClick={() => navigate(`/venue/${vid}`)} />
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="flex items-center gap-2 font-display text-xl"><History size={16} className="text-muted" /> Recent searches</h2>
        {searches.length === 0 ? (
          <p className="mt-3 rounded-xl2 border border-line bg-surface p-6 text-sm text-muted">Your vibe searches will appear here.</p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {searches.map(s => (
              <button
                key={s}
                onClick={() => navigate(`/matchmaker?q=${encodeURIComponent(s)}`)}
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-muted hover:border-lime/40 hover:text-lime"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
