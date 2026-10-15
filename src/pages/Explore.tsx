import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Map as MapIcon, List, Crosshair, IndianRupee } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { VENUES } from '../data/seed'
import { useLiveReports } from '../lib/useLiveReports'
import { aggregateCrowd } from '../lib/crowdEngine'
import { CrowdBadge } from '../components/CrowdBadge'
import { FloatingToolbar, MetricPill, OverlineLabel } from '../components/design'
import type { VenueCategory } from '../types/domain'
import { CATEGORY_LABELS } from '../lib/concepts'

const FIXED_CENTER: LatLngExpression = [17.443, 78.385]

// Build crowd pin icons lazily — status colours match the new palette:
// calm band in neon, busy amber, packed rose, unresolved grey-white.
const pinCache = new Map<string, L.Icon>()
function crowdPin(level: string | null): L.Icon {
  const key = level ?? 'none'
  if (!pinCache.has(key)) {
    const colors: Record<string, string> = {
      empty: '#E9EEF2',
      comfortable: '#F4FF00',
      busy: '#FFB43D',
      packed: '#F43F5E',
      none: '#727D88',
    }
    const color = colors[key] ?? '#727D88'
    pinCache.set(key, L.icon({
      iconUrl:
        'data:image/svg+xml;utf8,' +
        encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42"><path d="M15 1C6.7 1 1 7 1 14.4 1 24.6 15 41 15 41s14-16.4 14-26.6C29 7 23.3 1 15 1z" fill="${color}" stroke="#262C35" stroke-width="1.6"/><circle cx="15" cy="14.4" r="5.6" fill="#262C35"/></svg>`),
      iconSize: [30, 42],
      iconAnchor: [15, 42],
      popupAnchor: [0, -38],
    }))
  }
  return pinCache.get(key)!
}

const CATS: Array<{ key: VenueCategory; label: string }> = [
  { key: 'cafe', label: 'Cafés' },
  { key: 'gym', label: 'Gyms' },
  { key: 'salon', label: 'Salons' },
  { key: 'service', label: 'Service' },
]

function FitOnce({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap()
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [40, 40] })
  }, [map, bounds])
  return null
}

export function Explore() {
  const navigate = useNavigate()
  const { reports } = useLiveReports()
  const [view, setView] = useState<'map' | 'list'>('map')
  const [cat, setCat] = useState<VenueCategory | 'all'>('all')
  const [maxPrice, setMaxPrice] = useState<number | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)

  const filtered = useMemo(
    () =>
      VENUES.filter(v => {
        if (cat !== 'all' && v.category !== cat) return false
        if (maxPrice != null && (v.pricePerPerson ?? Infinity) > maxPrice) return false
        return true
      }),
    [cat, maxPrice],
  )

  const bounds = useMemo(() => {
    if (filtered.length === 0) return null
    return L.latLngBounds(filtered.filter(v => v.lat != null).map(v => [v.lat!, v.lng!] as [number, number]))
  }, [filtered])

  const askLocation = () => {
    setLocating(true)
    try {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const { latitude, longitude } = pos.coords
          setView('map')
          setSelected(null)
          setLocalCenter([latitude, longitude])
          setLocating(false)
        },
        () => setLocating(false),
        { timeout: 5000 },
      )
    } catch {
      setLocating(false)
    }
  }

  const [localCenter, setLocalCenter] = useState<LatLngExpression | null>(null)
  const center = localCenter ?? bounds?.getCenter() ?? FIXED_CENTER

  return (
    <div className="space-y-5">
      <header className="rise-in flex flex-wrap items-center justify-between gap-3">
        <div>
          <OverlineLabel className="text-ink/55">Interactive map</OverlineLabel>
          <h1 className="mt-1 text-3xl font-light tracking-tight text-ink md:text-4xl">
            Explore <span className="font-semibold">Hyderabad</span>
          </h1>
        </div>
      </header>

      {/* Control toolbar */}
      <FloatingToolbar className="flex flex-wrap items-center gap-2 p-2">
        <div className="flex rounded-full bg-white/[0.06] p-1">
          {(['map', 'list'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`tactile focus-ring flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                view === v ? 'bg-ice text-ink' : 'text-muted hover:text-text'
              }`}
            >
              {v === 'map' ? <MapIcon size={13} /> : <List size={13} />} {v === 'map' ? 'Map' : 'List'}
            </button>
          ))}
        </div>
        <span className="mx-1 hidden h-5 w-px bg-white/20 sm:block" />
        <MetricPill active={cat === 'all'} onClick={() => setCat('all')}>All</MetricPill>
        {CATS.map(c => (
          <MetricPill key={c.key} active={cat === c.key} onClick={() => setCat(c.key)}>
            {c.label}
          </MetricPill>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-white/20 sm:block" />
        <MetricPill active={false} onClick={askLocation}>
          <Crosshair size={12} /> {locating ? 'Locating…' : 'Near me'}
        </MetricPill>
        <select
          value={maxPrice ?? ''}
          onChange={e => setMaxPrice(e.target.value ? Number(e.target.value) : null)}
          className="focus-ring ml-auto rounded-full border border-white/45 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-text transition hover:bg-white/[0.12]"
          style={{ colorScheme: 'dark' }}
          aria-label="Maximum price"
        >
          <option value="" className="bg-charcoal">Any price</option>
          <option value="300" className="bg-charcoal">Under ₹300</option>
          <option value="600" className="bg-charcoal">Under ₹600</option>
          <option value="1000" className="bg-charcoal">Under ₹1000</option>
        </select>
      </FloatingToolbar>

      {view === 'map' ? (
        <div className="rise-in floating-panel bg-charcoal p-2.5 md:p-3">
          <div className="h-[62vh] overflow-hidden rounded-[2rem] border border-white/15 md:h-[70vh]">
            <MapContainer center={center} zoom={13} className="h-full w-full" scrollWheelZoom>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitOnce bounds={bounds} />
              {filtered.filter(v => v.lat != null).map(v => {
                const summary = aggregateCrowd(reports, v.id, Date.now())
                return (
                  <Marker
                    key={v.id}
                    position={[v.lat!, v.lng!]}
                    icon={crowdPin(summary?.status ?? null)}
                    eventHandlers={{ click: () => setSelected(v.id) }}
                  >
                    <Popup>
                      <div className="min-w-[220px] space-y-2">
                        <strong className="block text-base font-semibold tracking-tight">{v.name}</strong>
                        <span className="block text-xs text-ink/55">{v.locality} · {CATEGORY_LABELS[v.category]}</span>
                        <div><CrowdBadge summary={summary} variant="light" /></div>
                        <button
                          onClick={() => navigate(`/venue/${v.id}`)}
                          className="focus-ring w-full rounded-full bg-charcoal px-3 py-1.5 text-xs font-semibold text-ice hover:text-neon"
                        >
                          Open venue →
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                )
              })}
            </MapContainer>
          </div>
          {selected && (
            <p className="pt-2 text-center text-[11px] text-muted/70">
              Selected venue highlighted on map — its preview opens in the popup.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(v => {
            const summary = aggregateCrowd(reports, v.id, Date.now())
            return (
              <button
                key={v.id}
                onClick={() => navigate(`/venue/${v.id}`)}
                className="card-lift focus-ring frosted-card rounded-[1.75rem] border border-white/80 p-4 text-left text-ink"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base font-semibold tracking-tight">{v.name}</span>
                  <CrowdBadge summary={summary} variant="light" />
                </div>
                <p className="mt-1 text-xs text-ink/55">{v.locality} · {CATEGORY_LABELS[v.category]}</p>
                {v.pricePerPerson != null && (
                  <p className="mt-1 inline-flex items-center gap-0.5 text-xs font-semibold text-ink/75">
                    <IndianRupee size={11} />
                    {v.pricePerPerson}/person
                  </p>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
