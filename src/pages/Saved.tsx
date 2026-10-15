import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Clock3, History } from 'lucide-react'
import { VENUES } from '../data/seed'
import { useLiveReports } from '../lib/useLiveReports'
import { aggregateCrowd } from '../lib/crowdEngine'
import { VenueCard, SimpleVenueCard } from '../components/VenueCard'
import { FloatingPanel, FrostedCard, MetricPill, OverlineLabel } from '../components/design'
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

  const EmptyNote = ({ text }: { text: string }) => (
    <FrostedCard className="mt-4 p-6 text-sm text-ink/60">{text}</FrostedCard>
  )

  return (
    <div className="space-y-10">
      <header className="rise-in">
        <OverlineLabel className="text-ink/55">Your places</OverlineLabel>
        <h1 className="mt-1 text-3xl font-light tracking-tight text-ink md:text-4xl">
          Saved & <span className="font-semibold">recent</span>
        </h1>
      </header>

      {/* Saved */}
      <section>
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-ink">
          <Heart size={17} className="fill-current text-ink" /> Saved places ({savedIds.length})
        </h2>
        {savedRanked.length === 0 ? (
          <EmptyNote text="Nothing saved yet. Tap the heart on any venue to keep it here." />
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {savedRanked.map(r => (
              <div key={r.venue.id} className="relative rise-in">
                <VenueCard item={r} variant="light" onClick={() => navigate(`/venue/${r.venue.id}`)} />
                <button
                  onClick={() => remove(r.venue.id)}
                  className="focus-ring absolute right-3 top-3 z-10 rounded-full bg-charcoal/85 p-1.5 text-ice/80 backdrop-blur transition hover:text-rose"
                  aria-label="Remove from saved"
                >
                  <Heart size={14} fill="currentColor" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recently viewed */}
      <section>
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-ink">
          <Clock3 size={17} className="text-ink/70" /> Recently viewed
        </h2>
        {viewedIds.length === 0 ? (
          <EmptyNote text="Venues you open will appear here." />
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {viewedIds.map(vid => {
              const v = VENUES.find(x => x.id === vid)
              if (!v) return null
              return (
                <SimpleVenueCard
                  key={vid}
                  venue={v}
                  summary={aggregateCrowd(reports, v.id, Date.now())}
                  onClick={() => navigate(`/venue/${vid}`)}
                />
              )
            })}
          </div>
        )}
      </section>

      {/* Recent searches */}
      <section>
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-ink">
          <History size={17} className="text-ink/55" /> Recent searches
        </h2>
        {searches.length === 0 ? (
          <EmptyNote text="Your vibe searches will appear here." />
        ) : (
          <FloatingPanel tone="charcoal" className="mt-4 p-4">
            <div className="flex flex-wrap gap-2">
              {searches.map(s => (
                <MetricPill key={s} onClick={() => navigate(`/matchmaker?q=${encodeURIComponent(s)}`)}>
                  {s}
                </MetricPill>
              ))}
            </div>
          </FloatingPanel>
        )}
      </section>
    </div>
  )
}
