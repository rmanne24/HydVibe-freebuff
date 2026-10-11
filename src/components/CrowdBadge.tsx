import type { CrowdLevel, CrowdSummary } from '../types/domain'
import { CROWD_LABELS } from '../lib/concepts'

const LEVEL_STYLES: Record<CrowdLevel, string> = {
  empty: 'bg-moss/20 text-moss border-moss/40',
  comfortable: 'bg-lime/15 text-lime border-lime/40',
  busy: 'bg-warm/15 text-warm border-warm/40',
  packed: 'bg-red-500/15 text-red-400 border-red-500/40',
}

export function CrowdBadge({ summary, className = '' }: { summary: CrowdSummary | null; className?: string }) {
  if (!summary || summary.status == null) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border border-line bg-elevated px-2.5 py-0.5 text-xs text-muted ${className}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-muted" />
        No live data
      </span>
    )
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${LEVEL_STYLES[summary.status]} ${className}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
      </span>
      {CROWD_LABELS[summary.status]}
    </span>
  )
}

export function ConfidenceLabel({ summary }: { summary: CrowdSummary | null }) {
  if (!summary) return null
  const label = summary.confidence
  const color = label === 'high' ? 'text-lime' : label === 'moderate' ? 'text-warm' : 'text-muted'
  return (
    <span className={`text-xs ${color}`}>
      {label !== 'none' ? `${label} confidence · ${summary.reportCount} report${summary.reportCount === 1 ? '' : 's'}` : 'no reports'}
    </span>
  )
}
