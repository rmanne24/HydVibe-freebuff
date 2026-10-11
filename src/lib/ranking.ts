// Deterministic ranking: hard constraints first, soft preference scoring after.
// All scoring is transparent — no hidden ML.

import type { RankedVenue, SearchQuery, Venue, CrowdReport, CrowdSummary } from '../types/domain'
import { aggregateCrowd } from './crowdEngine'
import { parseQuery, type ParsedIntent } from './intent'

/** Haversine distance in metres. */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

// Locality reference coordinates for distance estimation
const LOCALITY_CENTER: Record<string, { lat: number; lng: number }> = {
  'Gachibowli': { lat: 17.4401, lng: 78.3489 },
  'Madhapur': { lat: 17.4483, lng: 78.3915 },
  'Kondapur': { lat: 17.4615, lng: 78.3639 },
  'HITEC City': { lat: 17.4455, lng: 78.3772 },
  'Jubilee Hills': { lat: 17.4335, lng: 78.4110 },
  'Banjara Hills': { lat: 17.4126, lng: 78.4392 },
}

export function localityCenter(name: string): { lat: number; lng: number } | null {
  return LOCALITY_CENTER[name] ?? null
}

/** Max radius (metres) within which "near <locality>" venues are considered. */
const NEAR_RADIUS_M = 3500

/**
 * Filter venues by hard constraints from the parsed query.
 */
export function passesHardConstraints(v: Venue, q: SearchQuery, userLoc: { lat: number; lng: number } | null): boolean {
  if (q.category && v.category !== q.category) return false
  if (q.maxBudget != null && v.pricePerPerson != null && v.pricePerPerson > q.maxBudget) return false
  if (q.wifi && v.hasWifi !== true) return false
  if (q.plugs && v.hasPlugPoints !== true) return false
  if (q.workFriendly && v.workFriendly !== true) return false
  // Locality: exact or proximity
  if (q.locality) {
    if (v.locality === q.locality) {
      // fine
    } else if (userLoc && v.lat != null && v.lng != null) {
      if (distanceMeters(userLoc, { lat: v.lat, lng: v.lng }) > NEAR_RADIUS_M) return false
    } else {
      const center = localityCenter(q.locality)
      if (center && v.lat != null && v.lng != null) {
        if (distanceMeters(center, { lat: v.lat, lng: v.lng }) > NEAR_RADIUS_M) return false
      }
      // if no coords at all, keep the venue (cannot disprove proximity)
    }
  }
  return true
}

/**
 * Soft-match score: 0..100. Deterministic weights documented inline.
 */
export function softScore(
  v: Venue,
  q: SearchQuery,
  crowd: CrowdSummary | null,
  refPoint: { lat: number; lng: number } | null,
): { score: number; reasons: string[]; missing: string[] } {
  let score = 40 // base
  const reasons: string[] = []
  const missing: string[] = []

  // Mood / vibe soft scoring
  if (q.mood) {
    const mood = q.mood
    // vibe tag overlap
    const vibeTags = v.vibeTags ?? []
    const moodWants = moodTagWants(mood)
    const overlap = vibeTags.filter(t => moodWants.includes(t))
    score += 8 * overlap.length
    if (overlap.length > 0) reasons.push(`vibe matches "${mood}"`)
  }

  // Noise
  if (q.noise === 'quiet') {
    if (v.noiseLevel === 'quiet') { score += 12; reasons.push('quiet atmosphere') }
    else { score -= 8 }
  } else if (q.noise === 'lively') {
    if (v.noiseLevel === 'lively') { score += 10; reasons.push('lively energy') }
    else if (v.noiseLevel === 'quiet') { score -= 4 }
  }

  // Crowd soft penalty — a directly-reported busy venue should lose to an
  // unreported one (spec: never assume missing data means quiet, but a fresh
  // "packed" report is strong negative evidence).
  if (q.avoidCrowds && crowd) {
    if (crowd.status === 'busy') { score -= 20; reasons.push('recently reported busy') }
    else if (crowd.status === 'packed') { score -= 35; reasons.push('currently packed') }
    else if (crowd.status === 'empty' || crowd.status === 'comfortable') {
      score += 8
      reasons.push('crowd reports indicate calm')
    }
  }

  // Distance penalty when ref point known
  if (refPoint && v.lat != null && v.lng != null) {
    const d = distanceMeters(refPoint, { lat: v.lat, lng: v.lng })
    if (d < 1000) { score += 10; reasons.push('very close') }
    else if (d < 2500) { score += 6 }
    else if (d < 5000) { score += 2 }
    else { score -= 10 }
  }

  // Budget headroom: cheaper than needed is a small plus
  if (q.maxBudget != null && v.pricePerPerson != null && v.pricePerPerson <= q.maxBudget) {
    const delta = q.maxBudget - v.pricePerPerson
    if (delta > 150) { score += 4; reasons.push('well within budget') }
  }

  // Info completeness bonus
  const knownAmenities = [v.hasWifi, v.hasPlugPoints, v.workFriendly].filter(x => x === true).length
  if (!v.hasWifi && q.wifi) missing.push('Wi-Fi')
  if (!v.hasPlugPoints && q.plugs) missing.push('charging points')
  if (v.pricePerPerson == null) missing.push('price')

  return { score: Math.max(0, Math.min(100, Math.round(score))), reasons, missing }
}

function moodTagWants(mood: string): string[] {
  if (!mood) return []
  if (mood.includes('work') || mood.includes('study')) return ['quiet', 'work', 'study', 'calm']
  if (mood.includes('date')) return ['aesthetic', 'date', 'cosy', 'cozy', 'romantic']
  if (mood.includes('hangout') || mood.includes('social')) return ['social', 'lively', 'group', 'games']
  if (mood.includes('solo') || mood.includes('reset')) return ['quiet', 'calm', 'solo']
  if (mood.includes('budget')) return ['budget', 'student', 'cheap']
  return []
}

export interface RankResult {
  ranked: RankedVenue[]
  intent: ParsedIntent | null
  parsed: SearchQuery
}

/**
 * Rank venues for a query. Crowd summaries computed per venue.
 */
export function rankVenues(
  venues: Venue[],
  reports: CrowdReport[],
  q: SearchQuery,
  now: number,
  refPoint: { lat: number; lng: number } | null,
): RankResult {
  const filtered = venues.filter(v => passesHardConstraints(v, q, refPoint))

  const ranked: (RankedVenue & { reasons?: string[] })[] = filtered.map(v => {
    const crowd = aggregateCrowd(reports, v.id, now)
    const { score, reasons, missing } = softScore(v, q, crowd, refPoint)
    return { venue: v, score, crowd, explanation: '', missing, reasons }
  })

  ranked.sort((a, b) => b.score - a.score)

  // Build explanations
  for (const r of ranked) {
    const parts: string[] = []
    if (r.venue.pricePerPerson != null && q.maxBudget != null) {
      parts.push(`₹${r.venue.pricePerPerson} per person (within ₹${q.maxBudget})`)
    } else if (r.venue.pricePerPerson != null) {
      parts.push(`around ₹${r.venue.pricePerPerson} per person`)
    }
    if (parts.length === 0) parts.push(...(r.reasons ?? []).slice(0, 2))
    else parts.push(...(r.reasons ?? []).slice(0, 1))
    r.explanation = parts.length > 0 ? parts.join(' · ') : 'Matches your filters'
  }

  return { ranked, intent: null, parsed: q }
}

/**
 * Suggest better alternatives when a venue is busy/packed.
 */
export function suggestAlternatives(
  target: Venue,
  all: Venue[],
  reports: CrowdReport[],
  now: number,
  max = 3,
): RankedVenue[] {
  if (target.lat == null || target.lng == null) return []
  const refPoint: { lat: number; lng: number } = { lat: target.lat, lng: target.lng }

  const candidates = all.filter(v => {
    if (v.id === target.id) return false
    if (v.category !== target.category) return false
    if (v.lat == null || v.lng == null) return false
    if (distanceMeters(refPoint, { lat: v.lat, lng: v.lng }) > 6000) return false
    return true
  })

  // Prefer same category, similar budget, calmer crowd
  const scored = candidates.map(v => {
    const crowd = aggregateCrowd(reports, v.id, now)
    let score = 50
    const reasons: string[] = []
    if (crowd.status === 'empty' || crowd.status === 'comfortable') {
      score += 20
      reasons.push('fresher, calmer crowd reports')
    } else if (crowd.status == null) {
      score += 4
    } else {
      score -= 15
    }
    if (target.pricePerPerson != null && v.pricePerPerson != null) {
      const diff = target.pricePerPerson - v.pricePerPerson
      if (diff >= 100) { score += 8; reasons.push('more affordable') }
      else if (diff <= -150) { score -= 6; reasons.push('slightly pricier (trade-off)') }
    }
    const d = distanceMeters(refPoint, { lat: v.lat as number, lng: v.lng as number })
    const extraMin = Math.round((d / 200) * 1.2) // ~walking + assume rideable distance
    if (extraMin <= 4) { score += 6; reasons.push(`${extraMin} min away`) }
    else { score -= 2; reasons.push(`about ${extraMin} min away`) }
    const vibeOverlap = (target.vibeTags ?? []).filter(t => (v.vibeTags ?? []).includes(t))
    if (vibeOverlap.length > 0) { score += 6; reasons.push('similar vibe') }

    const explanation = reasons.slice(0, 3).join(' · ')
    return {
      venue: v,
      score: Math.max(0, Math.min(100, score)),
      crowd,
      explanation,
      missing: [] as string[],
    }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, max)
}
