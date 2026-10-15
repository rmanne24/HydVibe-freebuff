import type { CSSProperties, ReactNode } from 'react'

/**
 * HydVibe signature panel system — soft-3D floating panels inspired by
 * layered device mockups: dark charcoal or slate shells with large radii,
 * thick-but-subtle layered borders, ambient shadows, and icy-white inner
 * cards. Interactive content stays unrotated and always readable; only
 * decorative showcase elements opt into rotation.
 */

export type PanelTone = 'charcoal' | 'panel' | 'light'

const TONES: Record<PanelTone, string> = {
  charcoal: 'bg-charcoal text-text',
  panel: 'bg-panel text-text',
  light: 'bg-ice text-ink',
}

/**
 * FloatingPanel — the signature rounded "device" shell.
 *
 * @param rotate small decorative tilt in degrees (applied only on large
 *   screens; disabled on mobile so panels stack straight).
 */
export function FloatingPanel({
  tone = 'charcoal',
  rotate = 0,
  className = '',
  style,
  children,
}: {
  tone?: PanelTone
  rotate?: number
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  const rotation =
    rotate !== 0
      ? { '--tilt': `${rotate}deg` } as CSSProperties
      : undefined
  return (
    <div
      className={`floating-panel floating-tilt rise-in ${TONES[tone]} ${className}`}
      style={rotation ? { ...style, ...rotation } : style}
      data-tilt={rotate || undefined}
    >
      {children}
    </div>
  )
}

/** FrostedCard — icy-white inner card for dark panel interiors. */
export function FrostedCard({
  className = '',
  style,
  children,
}: {
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  return (
    <div className={`frosted-card text-ink ${className}`} style={style}>
      {children}
    </div>
  )
}

/** InCard — subtler translucent card for use inside dark panels. */
export function InCard({
  className = '',
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.05] text-text ${className}`}>
      {children}
    </div>
  )
}

/** NeonStatus — small neon-accented live status chip. */
export function NeonStatus({
  label,
  live = true,
  className = '',
}: {
  label: string
  live?: boolean
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-white/45 bg-charcoal px-2.5 py-1 text-[11px] font-medium text-text ${className}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {live && <span className="absolute h-full w-full animate-ping rounded-full bg-neon opacity-60" />}
        <span className={`relative h-1.5 w-1.5 rounded-full ${live ? 'bg-neon neon-pulse' : 'bg-muted'}`} />
      </span>
      {label}
    </span>
  )
}

/** MetricPill — compact pill-shaped control/metric. */
export function MetricPill({
  active = false,
  tone = 'dark',
  onClick,
  className = '',
  children,
  ...rest
}: {
  active?: boolean
  tone?: 'dark' | 'light'
  onClick?: () => void
  className?: string
  children: ReactNode
  [key: string]: unknown
}) {
  const base = tone === 'dark'
    ? active
      ? 'bg-neon text-ink border-neon'
      : 'border-white/45 bg-white/[0.06] text-text hover:bg-white/[0.12]'
    : active
      ? 'bg-charcoal text-ice border-charcoal'
      : 'border-lineDark bg-white/60 text-ink hover:bg-white'
  const isButton = onClick != null
  const Tag = (isButton ? 'button' : 'span') as 'button'
  return (
    <Tag
      onClick={onClick}
      className={`tactile inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium focus-ring ${tone === 'dark' ? 'focus-ring' : 'focus-ring'} ${base} ${className}`}
      {...(isButton ? { type: 'button' as const } : {})}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/** FloatingToolbar — compact rounded floating control bar (nav, toolbars). */
export function FloatingToolbar({
  className = '',
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={`floating-panel bg-charcoal/90 text-text backdrop-blur ${className}`}
    >
      {children}
    </div>
  )
}

/** Section heading rendered on the slate canvas. */
export function CanvasHeading({
  title,
  sub,
  right,
  className = '',
}: {
  title: string
  sub?: string
  right?: ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-3 ${className}`}>
      <div>
        <h2 className="text-2xl font-light tracking-tight text-ink md:text-3xl">{title}</h2>
        {sub && <p className="mt-1 max-w-xl text-sm text-ink/60">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

/** Small uppercase label used across the new visual language. */
export function OverlineLabel({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${className}`}>
      {children}
    </span>
  )
}
