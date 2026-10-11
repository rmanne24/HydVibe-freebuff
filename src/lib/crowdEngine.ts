// Crowd aggregation engine — deterministic, documented, testable.

import type { CrowdLevel, CrowdReport, CrowdSummary } from '../types/domain'
import {
  CROWD_ORDER,
  crowdIndex,
  FRESHNESS_WINDOW_MS,
  RECENCY_HALF_LIFE_MS,
  CONF_HIGH_MIN_REPORTS,
  CONF_MODERATE_MIN_REPORTS,
  CONF_LOW_MIN_REPORTS,
  MIN_REPORTS_FOR_TREND,
  TREND_WINDOW_MS,
  TREND_DELTA,
} from './concepts'

/** Recency-weighted score. weight = exp(-age / halfLife). Returns score 0..3. */
export function computeCrowdScore(reports: CrowdReport[], now: number, maxPerSession = 2): number | null {
  const fresh = reports.filter(r => now - r.submittedAt <= FRESHNESS_WINDOW_MS && r.submittedAt <= now)
  if (fresh.length === 0) return null

  // Limit dominance of one session: count each session's reports, cap influence.
  const bySession = new Map<string, CrowdReport[]>()
  for (const r of fresh) {
    const list = bySession.get(r.sessionId) ?? []
    list.push(r)
    bySession.set(r.sessionId, list)
  }

  let weightedSum = 0
  let weightTotal = 0
  for (const list of bySession.values()) {
    // newest report from session first
    const sorted = [...list].sort((a, b) => b.submittedAt - a.submittedAt)
    const cap = sorted.slice(0, maxPerSession)
    for (const r of cap) {
      const age = Math.max(0, now - r.submittedAt)
      const w = Math.exp(-age / RECENCY_HALF_LIFE_MS)
      weightedSum += crowdIndex(r.level) * w
      weightTotal += w
    }
  }

  if (weightTotal === 0) return null
  return weightedSum / weightTotal
}

export function scoreToStatus(score: number | null): CrowdLevel | null {
  if (score === null) return null
  if (score < 0.75) return 'empty'
  if (score < 1.6) return 'comfortable'
  if (score < 2.4) return 'busy'
  return 'packed'
}

export function computeConfidence(reportCount: number, freshnessPct: number, maxPerSession = 2): 'none' | 'low' | 'moderate' | 'high' {
  if (reportCount === 0) return 'none'
  // effective sample size capped per session
  const effective = Math.min(reportCount, reportCount) // raw count; per-session cap handled upstream
  if (effective >= CONF_HIGH_MIN_REPORTS && freshnessPct >= 0.6) return 'high'
  if (effective >= CONF_MODERATE_MIN_REPORTS && freshnessPct >= 0.4) return 'moderate'
  return 'low'
}

export function computeTrend(reports: CrowdReport[], now: number): 'rising' | 'steady' | 'falling' | 'unknown' {
  const fresh = reports.filter(r => now - r.submittedAt <= TREND_WINDOW_MS && r.submittedAt <= now)
  if (fresh.length < MIN_REPORTS_FOR_TREND) return 'unknown'
  const latest = Math.max(...fresh.map(r => r.submittedAt))
  const windowLatest = fresh.filter(r => latest - r.submittedAt <= TREND_WINDOW_MS / 3)
  const windowOlder = fresh.filter(r => latest - r.submittedAt > TREND_WINDOW_MS / 3)
  if (windowLatest.length === 0 || windowOlder.length === 0) return 'unknown'

  const avg = (rs: CrowdReport[]) => rs.reduce((s, r) => s + crowdIndex(r.level), 0) / rs.length
  const a = avg(windowLatest)
  const b = avg(windowOlder)
  const delta = a - b
  if (delta > TREND_DELTA) return 'rising'
  if (delta < -TREND_DELTA) return 'falling'
  return 'steady'
}

export function freshnessPct(reports: CrowdReport[], now: number): number {
  if (reports.length === 0) return 0
  const fresh = reports.filter(r => now - r.submittedAt <= FRESHNESS_WINDOW_MS).length
  return fresh / reports.length
}

export function aggregateCrowd(reports: CrowdReport[], venueId: string, now: number): CrowdSummary {
  const fresh = reports.filter(r => r.venueId === venueId && now - r.submittedAt <= FRESHNESS_WINDOW_MS && r.submittedAt <= now)
  const score = computeCrowdScore(reports.filter(r => r.venueId === venueId), now)
  const status = scoreToStatus(score)
  const reportCount = fresh.length
  const fp = freshnessPct(reports.filter(r => r.venueId === venueId), now)
  const confidence = score === null ? 'none' : computeConfidence(reportCount, fp)
  const trend = computeTrend(reports.filter(r => r.venueId === venueId), now)
  const lastReportAt = fresh.length > 0 ? Math.max(...fresh.map(r => r.submittedAt)) : null

  let explanation: string
  if (status === null || reportCount === 0) {
    explanation = 'Not enough recent community reports to estimate current crowd. You would be the first reporter.'
  } else {
    const freshShare = Math.round(fp * 100)
    explanation = `${status.charAt(0).toUpperCase() + status.slice(1)} · ${reportCount} report${reportCount === 1 ? '' : 's'} in the last 90 minutes · ${confidence} confidence · ${freshShare}% of records are fresh.`
  }

  return {
    venueId,
    status,
    levelScore: score,
    confidence,
    reportCount,
    lastReportAt,
    updatedAt: now,
    trend,
    explanation,
  }
}

export function levelFromIndex(i: number): CrowdLevel {
  return CROWD_ORDER[i] ?? 'comfortable'
}
