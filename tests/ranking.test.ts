import { describe, it, expect } from 'vitest'
import { rankVenues, suggestAlternatives, distanceMeters } from '../src/lib/ranking'
import { parseQuery } from '../src/lib/intent'
import { VENUES } from '../src/data/seed'
import type { CrowdReport, Venue } from '../src/types/domain'

const NOW = 1_800_000_000_000
const MIN = 60_000

function rep(venueId: string, level: any, minutesAgo: number, sessionId: string): CrowdReport {
  return { id: 'x', venueId, level, sessionId, submittedAt: NOW - minutesAgo * MIN, simulated: false }
}

describe('parseQuery', () => {
  it('extracts budget, locality and category', () => {
    const q = parseQuery('quiet cafe near Gachibowli under 500, wifi')
    expect(q.category).toBe('cafe')
    expect(q.locality).toBe('Gachibowli')
    expect(q.maxBudget).toBe(500)
    expect(q.wifi).toBe(true)
    expect(q.noise).toBe('quiet')
  })

  it('extracts avoid-crowds + amenity signals', () => {
    const q = parseQuery('gym less crowded with charging points')
    expect(q.category).toBe('gym')
    expect(q.avoidCrowds).toBe(true)
    expect(q.plugs).toBe(true)
  })
})

describe('rankVenues', () => {
  it('budget is a hard constraint: over-budget venues excluded', () => {
    const { ranked } = rankVenues(VENUES, [], { category: 'cafe', maxBudget: 150 }, NOW, null)
    for (const r of ranked) {
      expect(r.venue.pricePerPerson ?? 0).toBeLessThanOrEqual(150)
    }
    // Chai Tapri (120) is the only cafe under ₹150
    expect(ranked.length).toBe(1)
    expect(ranked[0].venue.id).toBe('c4')
  })

  it('missing amenity is a hard constraint', () => {
    const { ranked } = rankVenues(VENUES, [], { category: 'cafe', wifi: true }, NOW, null)
    for (const r of ranked) expect(r.venue.hasWifi).toBe(true)
    expect(ranked.length).toBeGreaterThan(0)
    expect(ranked.some(r => r.venue.id === 'c4')).toBe(false)
  })

  it('crowd-avoiding queries punish busy venues', () => {
    const reports = [rep('c2', 'packed', 5, 's1'), rep('c2', 'packed', 6, 's2')]
    const { ranked } = rankVenues(
      VENUES.filter(v => v.category === 'cafe'),
      reports,
      { noise: 'quiet', avoidCrowds: true },
      NOW,
      null,
    )
    const readingVerse = ranked.find(r => r.venue.id === 'c2')!
    const noDataCafe = ranked.find(r => r.venue.id === 'c1')!
    expect(readingVerse.score).toBeLessThan(noDataCafe.score)
  })
})

describe('suggestAlternatives', () => {
  it('never returns the venue itself and respects category + distance', () => {
    const target = VENUES.find(v => v.id === 'c2')!
    const alts = suggestAlternatives(target, VENUES, [], NOW)
    expect(alts.every(a => a.venue.id !== 'c2')).toBe(true)
    expect(alts.every(a => a.venue.category === 'cafe')).toBe(true)
  })

  it('prefers calmer reported venues over busier ones', () => {
    const reports = [rep('c1', 'empty', 5, 's1'), rep('c7', 'packed', 5, 's2')]
    const target = VENUES.find(v => v.id === 'c2')!
    const alts = suggestAlternatives(target, VENUES, reports, NOW, 5)
    expect(alts.length).toBeGreaterThan(0)
    expect(alts[0].venue.id).not.toBe('c7')
  })
})

describe('distanceMeters', () => {
  it('gives sane haversine distances', () => {
    const d = distanceMeters(
      { lat: 17.4401, lng: 78.3489 },
      { lat: 17.4335, lng: 78.411 },
    )
    // Gachibowli to Jubilee Hills ~6-7 km
    expect(d).toBeGreaterThan(5000)
    expect(d).toBeLessThan(8000)
  })
})
