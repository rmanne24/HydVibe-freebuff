import { useState } from 'react'
import { MapPin, Wifi, Plug, Laptop, IndianRupee, ArrowUpRight } from 'lucide-react'
import type { RankedVenue, Venue } from '../types/domain'
import { CrowdBadge, ConfidenceLabel } from './CrowdBadge'
import { CATEGORY_LABELS } from '../lib/concepts'

const FALLBACK = 'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D7DFE6"/><stop offset="1" stop-color="#969FAC"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="400" cy="220" r="52" fill="none" stroke="#59636B" stroke-width="3"/><path d="M330 310 L400 250 L470 310" stroke="#59636B" stroke-width="3" fill="none"/><text x="400" y="400" font-family="sans-serif" font-size="20" fill="#59636B" text-anchor="middle">Image unavailable</text></svg>`)

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

/**
 * Signature venue card.
 * variant:
 *  - 'light'  icy-white card for the slate canvas or inside dark panels
 *  - 'dark'   charcoal card for variety on the slate canvas
 *  - 'featured' light card with neon-accented highlight ring
 */
export function VenueCard({
  item,
  onClick,
  variant = 'light',
}: {
  item: RankedVenue
  onClick: () => void
  variant?: 'light' | 'dark' | 'featured'
}) {
  const { venue: v, crowd, score, explanation, missing } = item
  const isDark = variant === 'dark'
  const badgeVariant = isDark ? 'dark' : 'light'

  return (
    <button
      onClick={onClick}
      className={`card-lift focus-ring group w-full overflow-hidden rounded-[2rem] border text-left ${
        isDark
          ? 'floating-panel bg-charcoal border-white/45 text-text'
          : 'frosted-card border-white/80 text-ink'
      } ${variant === 'featured' ? 'ring-2 ring-neon neon-pulse' : ''}`}
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <VenueImage
          url={v.imageUrl}
          alt={v.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />
        <div className="absolute left-3 top-3">
          <span className={variant === 'featured' ? 'rounded-full neon-pulse' : ''}>
            <CrowdBadge summary={crowd} variant={badgeVariant} />
          </span>
        </div>
        <span className="absolute right-3 top-3 rounded-full bg-charcoal/85 px-2.5 py-1 text-[11px] font-bold text-neon backdrop-blur">
          {score}% match
        </span>
      </div>

      <div className={`space-y-2.5 p-5 ${isDark ? 'text-text' : 'text-ink'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold leading-tight tracking-tight">{v.name}</h3>
            <p className={`mt-1 flex items-center gap-1 text-xs ${isDark ? 'text-muted' : 'text-ink/55'}`}>
              <MapPin size={12} /> {v.locality} · {CATEGORY_LABELS[v.category]}
            </p>
          </div>
          {v.pricePerPerson != null && (
            <span
              className={`flex shrink-0 items-center gap-0.5 rounded-full px-2.5 py-1 text-sm font-semibold ${
                isDark ? 'border border-white/45 bg-white/[0.06] text-ice' : 'border border-lineDark bg-white text-ink'
              }`}
            >
              <IndianRupee size={12} />
              {v.pricePerPerson}
            </span>
          )}
        </div>

        <p className={`line-clamp-2 text-sm ${isDark ? 'text-muted' : 'text-ink/65'}`}>{explanation}</p>

        <div className="flex flex-wrap items-center gap-1.5">
          {v.hasWifi && <Amenity icon={<Wifi size={11} />} label="Wi-Fi" isDark={isDark} />}
          {v.hasPlugPoints && <Amenity icon={<Plug size={11} />} label="Plugs" isDark={isDark} />}
          {v.workFriendly && <Amenity icon={<Laptop size={11} />} label="Work friendly" isDark={isDark} />}
          {missing.map(m => (
            <span
              key={m}
              className={`rounded-md px-1.5 py-0.5 text-[10px] ${isDark ? 'border border-white/15 text-muted' : 'border border-lineDark text-ink/45'}`}
            >
              {m} unknown
            </span>
          ))}
        </div>

        <div className={`flex items-center justify-between gap-2 pt-0.5 ${isDark ? 'text-muted' : 'text-ink/50'}`}>
          {crowd ? <ConfidenceLabel summary={crowd} /> : <span className="text-xs">no live reports</span>}
          <span
            className={`flex items-center gap-1 text-xs font-semibold transition group-hover:gap-2 ${
              isDark ? 'text-neon' : 'text-ink'
            }`}
          >
            Details <ArrowUpRight size={14} />
          </span>
        </div>
      </div>
    </button>
  )
}

function Amenity({ icon, label, isDark }: { icon: React.ReactNode; label: string; isDark: boolean }) {
  return (
    <span
      className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
        isDark ? 'border border-white/25 bg-white/[0.05] text-ice/85' : 'border border-lineDark bg-white/75 text-ink/70'
      }`}
    >
      {icon} {label}
    </span>
  )
}

export function SimpleVenueCard({ venue, summary, onClick }: { venue: Venue; summary?: import('../types/domain').CrowdSummary | null; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="card-lift focus-ring frosted-card card group w-full overflow-hidden rounded-[1.75rem] border border-white/80 text-left text-ink"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <VenueImage url={venue.imageUrl} alt={venue.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        {summary && (
          <div className="absolute left-3 top-3">
            <CrowdBadge summary={summary} variant="light" />
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-base font-semibold tracking-tight">{venue.name}</h3>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-ink/55">
          <MapPin size={11} /> {venue.locality}
        </p>
      </div>
    </button>
  )
}
