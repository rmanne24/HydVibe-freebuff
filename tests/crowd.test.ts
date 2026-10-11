import { describe, it, expect } from 'vitest'
import { aggregateCrowd, computeCrowdScore, scoreToStatus } from '../src/lib/crowdEngine'
import type { CrowdReport } from '../src/types/domain'

const NOW = 1_800_000_000_000
const MIN = 60_000

function report(venueId: string, level: any, minutesAgo: number, sessionId: string, simulated = false): CrowdReport {
  return { id: Math.random().toString(36), venueId, level, sessionId, submittedAt: NOW - minutesAgo * MIN, simulated }
}

describe('computeCrowdScore', () => {
  it('returns null with no reports', () => {
    expect(computeCrowdScore([], NOW)).toBeNull()
  })

  it('ignores stale reports beyond freshness window', () => {
    const r = [report('v1', 'packed', 120, 's1')] // 2h old > 90min window
    expect(computeCrowdScore(r, NOW)).toBeNull()
  })

  it('weights recent reports more than old ones', () => {
    const r = [report('v1', 'empty', 80, 's1'), report('v1', 'packed', 2, 's2')]
    const score = computeCrowdScore(r, NOW)!
    expect(score).toBeGreaterThan(1.5) // heavily skewed to packed
  })

  it('caps one session dominance', () => {
    const many = Array.from({ length: 10 }, (_, i) => report('v1', 'packed', 5 + i, 'sameSession'))
    const one = [report('v1', 'empty', 5, 'otherSession')]
    const score = computeCrowdScore([...many, ...one], NOW)!
    // without cap it would be ~3.0; capped should leave room for the other session
    expect(score).toBeLessThan(2.6)
    expect(score).toBeGreaterThan(1.6)
  })
})

describe('scoreToStatus', () => {
  it('maps bands correctly', () => {
    expect(scoreToStatus(0)).toBe('empty')
    expect(scoreToStatus(1.0)).toBe('comfortable')
    expect(scoreToStatus(2.0)).toBe('busy')
    expect(scoreToStatus(2.8)).toBe('packed')
    expect(scoreToStatus(null)).toBeNull()
  })
})

describe('aggregateCrowd', () => {
  it('distinguishes no data from empty', () => {
    const none = aggregateCrowd([], 'vx', NOW)
    expect(none.status).toBeNull()
    expect(none.confidence).toBe('none')

    const emptyVenue = aggregateCrowd([report('vy', 'empty', 5, 's1')], 'vy', NOW)
    expect(emptyVenue.status).toBe('empty')
    expect(emptyVenue.confidence).toBe('low')
  })

  it('confidence grows with report count', () => {
    const rs = [
      report('vz', 'busy', 3, 's1'),
      report('vz', 'busy', 5, 's2'),
      report('vz', 'comfortable', 8, 's3'),
      report('vz', 'busy', 2, 's4'),
      report('vz', 'busy', 4, 's5'),
      report('vz', 'busy', 6, 's6'),
    ]
    const agg = aggregateCrowd(rs, 'vz', NOW)
    expect(agg.confidence).toBe('high')
    expect(agg.reportCount).toBe(6)
  })

  it('expired reports drop out and status becomes null', () => {
    const agg = aggregateCrowd([report('vw', 'packed', 100, 's1')], 'vw', NOW)
    expect(agg.status).toBeNull()
  })
})
