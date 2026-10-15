// Shared domain types for HydVibe

export type VenueCategory = 'cafe' | 'gym' | 'salon' | 'service'

export interface Venue {
  id: string
  name: string
  category: VenueCategory
  locality: string
  address?: string
  lat?: number
  lng?: number
  priceBand?: PriceBand
  pricePerPerson?: number
  description?: string
  vibeTags?: string[]
  noiseLevel?: NoiseLevel
  hasWifi?: boolean
  hasPlugPoints?: boolean
  workFriendly?: boolean
  seatingCapacity?: 'small' | 'medium' | 'large'
  openHours?: string
  hoursSource?: string
  imageUrl?: string
  verified: boolean
  createdAt: number
  updatedAt: number
}

export type PriceBand = '₹' | '₹₹' | '₹₹₹'

export type NoiseLevel = 'quiet' | 'moderate' | 'lively'

export type CrowdLevel = 'empty' | 'comfortable' | 'busy' | 'packed'

export interface CrowdReport {
  id: string
  venueId: string
  level: CrowdLevel
  note?: string
  sessionId: string
  submittedAt: number
  simulated: boolean
}

export interface CrowdSummary {
  venueId: string
  status: CrowdLevel | null
  levelScore: number | null // 0..3
  confidence: 'none' | 'low' | 'moderate' | 'high'
  reportCount: number
  lastReportAt: number | null
  updatedAt: number
  trend: 'rising' | 'steady' | 'falling' | 'unknown'
  explanation: string
}

export interface LocalitySummary {
  locality: string
  level: CrowdLevel | null
  reportCount: number
  lastUpdated: number | null
  windowMs: number
}

export interface UserPreferences {
  budget: number | null
  requiredAmenities: string[]
  savedVenueIds: string[]
  recentlyViewed: string[]
  recentSearches: string[]
  quickMood: string | null
  locality: string | null
  sessionId: string
}

export interface SearchQuery {
  category?: VenueCategory
  locality?: string
  maxBudget?: number
  mood?: string
  noise?: NoiseLevel | 'any'
  wifi?: boolean
  plugs?: boolean
  workFriendly?: boolean
  avoidCrowds?: boolean
}

export interface RankedVenue {
  venue: Venue
  score: number
  crowd: CrowdSummary | null
  explanation: string
  missing: string[]
}
