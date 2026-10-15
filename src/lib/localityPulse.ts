import type { CrowdReport, CrowdLevel, LocalitySummary } from '../types/domain'
import { VENUES } from '../data/seed'
import { crowdIndex, CROWD_ORDER } from './concepts'

/** Freshness window (ms) matching the crowd engine. */
export const FRESH_WINDOW = 90 * 60 * 1000

/**
 * Deterministic locality dashboard summary: aggregates fresh reports from
 * every venue in the locality (median level via crowd index), counts
 * contributors, and exposes the most recent update time. Never claims live
 * data when the window is empty — the caller renders that honestly.
 */
export function localityPulse(locality: string, reports: CrowdReport[], now: number, windowMs: number = FRESH_WINDOW): LocalitySummary {
  const venueIds = new Set(VENUES.filter(v => v.locality === locality).map(v => v.id))
  const fresh = reports.filter(r => venueIds.has(r.venueId) && now - r.submittedAt <= windowMs)

  if (fresh.length === 0) {
    return { locality, reportCount: 0, level: null, lastUpdated: null, windowMs }
  }

  const sorted = [...fresh].sort((a, b) => crowdIndex(a.level as CrowdLevel) - crowdIndex(b.level as CrowdLevel))
  const mid = Math.floor(sorted.length / 2)
  const medianLevel =
    sorted.length % 2 === 0 ? sorted[mid - 1].level : sorted[mid].level
  // Deterministic consensus: if modes disagree, show the higher band label
  // (cafés at capacity feel "busier" to arriving guests).
  const lastUpdated = Math.max(...fresh.map(r => r.submittedAt))

  return {
    locality,
    reportCount: fresh.length,
    level: medianLevel as CrowdLevel,
    lastUpdated,
    windowMs,
  }
}

export const DASHBOARD_LOCALITIES = ['Jubilee Hills', 'Banjara Hills', 'HITEC City', 'Gachibowli'] as const

export function relTime(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${Math.max(s, 1)}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)} hr ${m % 60} min`
}

export { CROWD_ORDER }
