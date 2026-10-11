import { useState } from 'react'
import { MapPin, Wifi, Plug, Laptop, IndianRupee } from 'lucide-react'
import type { RankedVenue, Venue } from '../types/domain'
import { CrowdBadge, ConfidenceLabel } from './CrowdBadge'
import { CATEGORY_LABELS } from '../lib/concepts'

const FALLBACK = 'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="100%" height="100%" fill="#222822"/><circle cx="400" cy="230" r="52" fill="none" stroke="#607A58" stroke-width="3"/><path d="M330 320 L400 260 L470 320" stroke="#607A58" stroke-width="3" fill="none"/><text x="400" y="410" font-family="sans-serif" font-size="20" fill="#A5ADA3" text-anchor="middle">Image unavailable</text></svg>`)

export function VenueImage({ url, alt, className = '' }: { url?: string; alt: string; className?: string }) {
  const [err, setErr] = useState(false)
  return (
    <img
      src={err || !url ? FALLBACK : url}
      alt={alt}
      onError={() => setErr(true)}
      loading="lazy"
      className={className}
    />
  )
}

export function VenueCard({
  item,
  onClick,
}: {
  item: RankedVenue
  onClick: () => void
}) {
  const { venue: v, crowd, score, explanation, missing } = item
  return (
    <button
      onClick={onClick}
      className="group card surface-hover w-full overflow-hidden rounded-xl2 border border-line bg-surface text-left shadow-card transition hover:border-lime/40 hover:shadow-glow focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/60"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <VenueImage url={v.imageUrl} alt={v.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        <div className="absolute left-3 top-3">
          <CrowdBadge summary={crowd} />
        </div>
        <div className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/45 px-2.5 py-0.5 text-xs font-semibold text-lime backdrop-blur">
          {score}% vibe match
        </div>
      </div>
      <div className="space-y-2.5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg leading-tight">{v.name}</h3>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
              <MapPin size={12} /> {v.locality} · {CATEGORY_LABELS[v.category]}
            </p>
          </div>
          {v.pricePerPerson != null && (
            <span className="flex shrink-0 items-center rounded-lg border border-line bg-elevated px-2 py-1 text-sm text-warm">
              <IndianRupee size={13} />
              {v.pricePerPerson}
            </span>
          )}
        </div>
        <p className="line-clamp-2 text-sm text-muted">{explanation}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {v.hasWifi && <Amenity icon={<Wifi size={12} />} label="Wi-Fi" />}
          {v.hasPlugPoints && <Amenity icon={<Plug size={12} />} label="Plugs" />}
          {v.workFriendly && <Amenity icon={<Laptop size={12} />} label="Work friendly" />}
          {missing.map(m => (
            <span key={m} className="rounded-md border border-line px-1.5 py-0.5 text-[10px] text-muted">
              {m} unknown
            </span>
          ))}
        </div>
        {crowd && <ConfidenceLabel summary={crowd} />}
      </div>
    </button>
  )
}

function Amenity({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1 rounded-md border border-line bg-elevated px-1.5 py-0.5 text-[11px] text-muted">
      {icon} {label}
    </span>
  )
}

export function SimpleVenueCard({ venue, onClick }: { venue: Venue; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="surface-hover overflow-hidden rounded-xl2 border border-line bg-surface text-left shadow-card transition hover:border-lime/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/60"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <VenueImage url={venue.imageUrl} alt={venue.name} className="h-full w-full object-cover" />
      </div>
      <div className="p-3">
        <h3 className="font-display text-base">{venue.name}</h3>
        <p className="flex items-center gap-1 text-xs text-muted">
          <MapPin size={11} /> {venue.locality}
        </p>
      </div>
    </button>
  )
}
