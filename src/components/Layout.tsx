import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Map, Heart, Radar, Search, Radio } from 'lucide-react'
import type { ReactNode } from 'react'
import { useLiveReports } from '../lib/useLiveReports'

const LINKS = [
  { to: '/', label: 'Discover', icon: Home },
  { to: '/matchmaker', label: 'AI Match', icon: Search },
  { to: '/explore', label: 'Map', icon: Map },
  { to: '/saved', label: 'Saved', icon: Heart },
  { to: '/demo', label: 'Live', icon: Radar },
]

export function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const { connected } = useLiveReports()

  return (
    <div className="min-h-screen">
      {/* Floating toolbar header */}
      <header className="sticky top-0 z-40 px-3 pt-3 md:px-6 md:pt-4">
        <div className="floating-panel mx-auto flex max-w-6xl items-center justify-between gap-3 bg-charcoal/90 px-3 py-2 backdrop-blur md:px-4">
          <button
            onClick={() => navigate('/')}
            className="focus-ring flex items-center gap-2.5 rounded-full p-1 pr-2 transition hover:bg-white/[0.06]"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-neon text-lg font-extrabold text-ink shadow-neonGlow">
              H
            </span>
            <span className="text-lg font-semibold tracking-tight text-text">HydVibe</span>
          </button>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {LINKS.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `tactile focus-ring rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-ice text-ink'
                      : 'text-muted hover:bg-white/[0.08] hover:text-text'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <span
            className={`hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium sm:inline-flex ${
              connected ? 'border-neon/40 text-neon' : 'border-white/25 text-muted'
            }`}
            title={connected ? 'Live crowd reports connected' : 'Offline — showing sample data'}
          >
            <Radio size={12} className={connected ? 'neon-pulse' : ''} />
            {connected ? 'Live sync' : 'Offline'}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 md:px-6 md:pb-12">{children}</main>

      {/* Mobile: floating bottom navigation */}
      <nav className="fixed inset-x-3 bottom-3 z-40 md:hidden" aria-label="Primary mobile">
        <div className="floating-panel bg-charcoal/95 backdrop-blur">
          <div className="grid grid-cols-5 px-1.5 py-1">
            {LINKS.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 rounded-2xl py-2 text-[10px] font-medium transition ${
                    isActive ? 'bg-ice text-ink' : 'text-muted'
                  }`
                }
              >
                <l.icon size={18} />
                {l.label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
    </div>
  )
}
