import type { CrowdLevel, CrowdSummary } from '../types/domain'
import { CROWD_LABELS } from '../lib/concepts'

/**
 * Crowd state colours for the slate/charcoal/neon design language.
 * Each state gets a distinct treatment; neon yellow is reserved for the
 * "good to go" band (empty / comfortable) rather than used everywhere.
 */
export const LEVEL_TEXT: Record<CrowdLevel, string> = {
  empty: '#727D88',
  comfortable: '#F4FF00',
  busy: '#FFB43D',
  packed: '#F43F5E',
}

const LEVEL_DARK_STYLES: Record<CrowdLevel, string> = {
  empty: 'bg-white/[0.08] text-muted',
  comfortable: 'bg-neon text-ink',
  busy: 'bg-amber/15 text-amber',
  packed: 'bg-rose/15 text-rose',
}

const LEVEL_LIGHT_STYLES: Record<CrowdLevel, string> = {
  empty: 'bg-white/70 text-ink/60',
  comfortable: 'bg-charcoal text-neon',
  busy: 'bg-charcoal text-amber',
  packed: 'bg-charcoal text-rose',
}

export function CrowdIndicator({
  summary,
  variant = 'dark',
  className = '',
}: {
  summary: CrowdSummary | null
  variant?: 'dark' | 'light'
  className?: string
}) {
  if (!summary || summary.status == null) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
          variant === 'dark' ? 'border-white/25 bg-white/[0.06] text-muted' : 'border-lineDark bg-white/70 text-ink/55'
        } ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
        No live data
      </span>
    )
  }
  const style = variant === 'dark' ? LEVEL_DARK_STYLES[summary.status] : LEVEL_LIGHT_STYLES[summary.status]
  const isNeon = summary.status === 'comfortable'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${style} ${className}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {isNeon && <span className="absolute h-full w-full animate-ping rounded-full bg-current opacity-50" />}
        <span className="relative h-1.5 w-1.5 rounded-full bg-current" />
      </span>
      {CROWD_LABELS[summary.status]}
    </span>
  )
}

/** Backwards-compatible alias for previous call sites. */
export function CrowdBadge({
  summary,
  variant = 'dark',
  className = '',
}: {
  summary: CrowdSummary | null
  variant?: 'dark' | 'light'
  className?: string
}) {
  return <CrowdIndicator summary={summary} variant={variant} className={className} />
}

export function ConfidenceLabel({ summary }: { summary: CrowdSummary | null }) {
  if (!summary) return null
  const label = summary.confidence
  const color =
    label === 'high' ? 'text-neon' : label === 'moderate' ? 'text-amber' : 'text-muted'
  return (
    <span className={`text-xs ${color}`}>
      {label !== 'none'
        ? `${label} confidence · ${summary.reportCount} report${summary.reportCount === 1 ? '' : 's'}`
        : 'no reports'}
    </span>
  )
}
