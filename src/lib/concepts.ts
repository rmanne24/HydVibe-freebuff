// Concept definitions used for crowd scale, scoring constants, mood map

import type { CrowdLevel, VenueCategory } from '../types/domain'

export const CROWD_ORDER: CrowdLevel[] = ['empty', 'comfortable', 'busy', 'packed']

export function crowdIndex(level: CrowdLevel): number {
  return CROWD_ORDER.indexOf(level)
}

export const CROWD_LABELS: Record<CrowdLevel, string> = {
  empty: 'Empty',
  comfortable: 'Comfortable',
  busy: 'Busy',
  packed: 'Packed',
}

// Freshness window (ms): reports older than this are excluded from aggregate
export const FRESHNESS_WINDOW_MS = 90 * 60 * 1000 // 90 minutes

// Confidence tuning
export const CONF_HIGH_MIN_REPORTS = 6
export const CONF_MODERATE_MIN_REPORTS = 3
export const CONF_LOW_MIN_REPORTS = 1

// Interest decay: weight = exp(-age / HALF_LIFE); age and half-life in ms
export const RECENCY_HALF_LIFE_MS = 45 * 60 * 1000 // 45 minutes

export const MIN_REPORTS_FOR_TREND = 4
export const TREND_WINDOW_MS = 90 * 60 * 1000
export const TREND_DELTA = 0.6

export const MOOD_MAP: Record<string, { categories: VenueCategory[]; noise?: 'quiet' | 'moderate' | 'lively'; workFriendly?: boolean; vibeTags?: string[]; budget?: number; avoidCrowds?: boolean }> = {
  'deep work': { categories: ['cafe'], noise: 'quiet', workFriendly: true, vibeTags: ['quiet', 'work'], avoidCrowds: true },
  'coffee date': { categories: ['cafe'], noise: 'moderate', vibeTags: ['aesthetic', 'date'] },
  'social hangout': { categories: ['cafe', 'gym'], noise: 'lively', vibeTags: ['social', 'lively'] },
  'solo reset': { categories: ['cafe', 'salon'], noise: 'quiet', vibeTags: ['quiet', 'calm'], avoidCrowds: true },
  'budget': { categories: [], budget: 300 },
  'study': { categories: ['cafe'], noise: 'quiet', workFriendly: true, vibeTags: ['study', 'quiet'], budget: 400 },
  'study session': { categories: ['cafe'], noise: 'quiet', workFriendly: true, vibeTags: ['study', 'quiet'], budget: 400 },
}

export const CATEGORY_LABELS: Record<VenueCategory, string> = {
  cafe: 'Cafés',
  gym: 'Gyms',
  salon: 'Salons',
  service: 'Service Centres',
}
