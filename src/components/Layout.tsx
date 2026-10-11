import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Map, Heart, Radar, Search } from 'lucide-react'
import type { ReactNode } from 'react'

const LINKS = [
  { to: '/', label: 'Discover', icon: Home },
  { to: '/matchmaker', label: 'Vibe Match', icon: Search },
  { to: '/explore', label: 'Map', icon: Map },
  { to: '/saved', label: 'Saved', icon: Heart },
  { to: '/demo', label: 'Live', icon: Radar },
]

export function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/60 rounded-lg">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-lime font-display text-lg text-bg shadow-glow">H</span>
            <span className="font-display text-xl tracking-tight">HydVibe</span>
          </button>
          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm transition ${isActive ? 'bg-elevated text-lime' : 'text-muted hover:text-text'}`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 md:pb-10">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {LINKS.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2.5 text-[10px] ${isActive ? 'text-lime' : 'text-muted'}`
              }
            >
              <l.icon size={19} />
              {l.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
