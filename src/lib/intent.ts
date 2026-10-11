// Intent extraction from natural language. Keyword-based, deterministic fallback.
// If an AI provider is configured, this output structure is the contract it must honor.

import type { SearchQuery, VenueCategory, NoiseLevel } from '../types/domain'

const LOCALITIES = [
  'Gachibowli', 'Madhapur', 'Kondapur', 'HITEC City', 'Hitec City', 'Jubilee Hills', 'Banjara Hills',
  'Kukatpally', 'Ameerpet', 'Begumpet', 'Manikonda', 'Miyapur', 'Attapur', 'S.R. Nagar', 'Secunderabad',
  'Shamshabad', 'Kokapet', 'Nizampet', ' financial district', 'Financial District',
]

const CATEGORY_KEYWORDS: Record<VenueCategory, string[]> = {
  cafe: ['cafe', 'café', 'coffee', 'espresso', 'work café', 'starbucks'],
  gym: ['gym', 'fitness', 'workout', 'weight training'],
  salon: ['salon', 'haircut', 'hair cut', 'beauty', 'parlour', 'spa'],
  service: ['rto', 'service centre', 'service center', 'government', 'passport seva', 'aadhaar', 'aadhar', 'post office'],
}

const MOOD_KEYWORDS: Record<string, string[]> = {
  'deep work': ['deep work', 'focus', 'focused work', 'work for two hours', 'get work done', 'laptop work', 'work session'],
  'coffee date': ['date', 'date spot', 'romantic', 'couple', 'anniversary', 'candle light'],
  'social hangout': ['friends', 'hangout', 'hang out', 'group', 'party', 'celebration', 'birthday'],
  'solo reset': ['solo', 'alone', 'me time', 'quiet time', 'reset'],
  'budget': ['budget', 'cheap', 'affordable', 'under', 'low cost', 'student'],
  'study': ['study', 'studying', 'exam', 'assignment', 'books'],
}

export interface ParsedIntent extends SearchQuery {
  matchedTokens: string[]
  unmatched: string[]
  source: 'keyword'
}

export function parseQuery(q: string): ParsedIntent {
  const text = q.toLowerCase()

  const matchedTokens: string[] = []

  // Category
  let category: VenueCategory | undefined
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (kws.some(kw => text.includes(kw))) {
      category = cat as VenueCategory
      break
    }
  }

  // Locality
  let locality: string | undefined
  const loc = LOCALITIES.map(l => l.trim()).find(l => text.includes(l.toLowerCase()) && l.length > 2)
  if (loc) locality = loc

  // Budget: "under ₹500" / "under 500" / "under Rs 500" / "₹500"
  let maxBudget: number | undefined
  const budgetMatch = text.match(/(?:under|less than|upto|up to|below|max|₹|rs\.?|inr)\s*(?:₹|rs\.?|inr)?\s*(\d{2,5})/) ??
    text.match(/(\d{3,5})\s*(?:₹|rs\.?|inr)/)
  if (budgetMatch) {
    const val = parseInt(budgetMatch[1], 10)
    if (!isNaN(val) && val >= 50 && val <= 10000) maxBudget = val
  }

  // Noise
  let noise: NoiseLevel | 'any' | undefined
  if (/quiet|silent|no ?noise|calm|peaceful/.test(text)) noise = 'quiet'
  else if (/lively|buzzing|bustling|energetic|happening/.test(text)) noise = 'lively'
  else if (/moderate noise|not too noisy/.test(text)) noise = 'moderate'

  // Amenities
  const wifi = /wi[- ]?fi|internet/.test(text) || undefined
  const plugs = /plug|charging|socket|outlet/.test(text) || undefined
  const workFriendly = /work|laptop|study|remote|zoom call|standup/.test(text) || undefined
  const avoidCrowds = /avoid|not crowded|less crowded|crowded|busy place|packed/.test(text) || undefined

  // Mood
  let mood: string | undefined
  for (const [m, kws] of Object.entries(MOOD_KEYWORDS)) {
    if (kws.some(kw => text.includes(kw))) {
      mood = m
      break
    }
  }

  if (category) matchedTokens.push(`category:${category}`)
  if (locality) matchedTokens.push(`locality:${locality}`)
  if (maxBudget) matchedTokens.push(`budget<=${maxBudget}`)
  if (mood) matchedTokens.push(`mood:${mood}`)

  return {
    category,
    locality,
    maxBudget,
    mood,
    noise: noise ?? 'any',
    wifi,
    plugs,
    workFriendly,
    avoidCrowds,
    matchedTokens,
    unmatched: [q],
    source: 'keyword',
  }
}
