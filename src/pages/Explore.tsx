import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Map as MapIcon, List, Crosshair } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { VENUES } from '../data/seed'
import { useLiveReports } from '../lib/useLiveReports'
import { aggregateCrowd } from '../lib/crowdEngine'
import { CrowdBadge } from '../components/CrowdBadge'
import type { VenueCategory } from '../types/domain'
import { CATEGORY_LABELS } from '../lib/concepts'

const FIXED_CENTER: LatLngExpression = [17.443, 78.385]

// Build crowd pin icons lazily
const pinCache = new Map<string, L.Icon>()
function crowdPin(level: string | null): L.Icon {
  const key = level ?? 'none'
  if (!pinCache.has(key)) {
    const colors: Record<string, string> = {
      empty: '#607A58', comfortable: '#C7F36B', busy: '#D6A87C', packed: '#EF4444', none: '#A5ADA3',
    }
    const color = colors[key] ?? '#A5ADA3'
    pinCache.set(key, L.icon({
      iconUrl:
        'data:image/svg+xml;utf8,' +
        encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40"><path d="M14 0C6.3 0 0 6.3 0 14c0 10 14 26 14 26s14-16 14-26C28 6.3 21.7 0 14 0z" fill="${color}"/><circle cx="14" cy="14" r="6" fill="#101210"/></svg>`),
      iconSize: [28, 40],
      iconAnchor: [14, 40],
      popupAnchor: [0, -36],
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

function Fit_ONCE({ bounds }: { bounds: L.LatLngBounds | null }) {
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
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl md:text-4xl">Explore the map</h1>
        <div className="flex rounded-xl border border-line bg-surface p-1">
          {(['map', 'list'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${view === v ? 'bg-elevated text-lime' : 'text-muted'}`}
            >
              {v === 'map' ? <MapIcon size={14} /> : <List size={14} />} {v === 'map' ? 'Map' : 'List'}
            </button>
          ))}
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setCat('all')}
          className={`rounded-full border px-3 py-1.5 text-xs ${cat === 'all' ? 'border-lime bg-lime/15 text-lime' : 'border-line text-muted hover:text-text'}`}
        >
          All
        </button>
        {CATS.map(c => (
          <button
            key={c.key}
            onClick={() => setCat(c.key)}
            className={`rounded-full border px-3 py-1.5 text-xs ${cat === c.key ? 'border-lime bg-lime/15 text-lime' : 'border-line text-muted hover:text-text'}`}
          >
            {c.label}
          </button>
        ))}
        <select
          value={maxPrice ?? ''}
          onChange={e => setMaxPrice(e.target.value ? Number(e.target.value) : null)}
          className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-muted focus:outline-none"
        >
          <option value="">Any price</option>
          <option value="300">Under ₹300</option>
          <option value="600">Under ₹600</option>
          <option value="1000">Under ₹1000</option>
        </select>
        <button onClick={askLocation} className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-muted hover:text-lime">
          <Crosshair size={12} /> {locating ? 'Locating…' : 'Near me'}
        </button>
      </div>

      {view === 'map' ? (
        <div className="h-[65vh] overflow-hidden rounded-xl2 border border-line">
          <MapContainer center={center} zoom={13} className="h-full w-full" scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Fit_ONCE bounds={bounds} />
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
                    <div className="min-w-[200px] space-y-1.5">
                      <strong className="font-display text-sm">{v.name}</strong>
                      <div><CrowdBadge summary={summary} /></div>
                      <button
                        onClick={() => navigate(`/venue/${v.id}`)}
                        className="mt-1 w-full rounded-lg bg-lime px-2 py-1.5 text-xs font-semibold text-bg"
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
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(v => {
            const summary = aggregateCrowd(reports, v.id, Date.now())
            return (
              <button
                key={v.id}
                onClick={() => navigate(`/venue/${v.id}`)}
                className="rounded-xl2 border border-line bg-surface p-4 text-left transition hover:border-lime/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display">{v.name}</span>
                  <CrowdBadge summary={summary} />
                </div>
                <p className="mt-1 text-xs text-muted">{v.locality} · {CATEGORY_LABELS[v.category]}</p>
                {v.pricePerPerson != null && <p className="mt-0.5 text-xs text-warm">~₹{v.pricePerPerson}/person</p>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
