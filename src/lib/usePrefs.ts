// Preferences hook — persisted to localStorage (non-sensitive, no auth wall).

import { useCallback, useEffect, useState } from 'react'

export interface Prefs {
  savedVenueIds: string[]
  recentlyViewed: string[]
  recentSearches: string[]
  budget: number | null
  requiredAmenities: string[]
  locality: string | null
}

const KEY = 'hydvibe.prefs.v1'

const DEFAULTS: Prefs = {
  savedVenueIds: [],
  recentlyViewed: [],
  recentSearches: [],
  budget: null,
  requiredAmenities: [],
  locality: null,
}

function load(): Prefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return DEFAULTS
}

export function usePrefs() {
  const [prefs, setPrefs] = useState<Prefs>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs))
    } catch {
      /* ignore */
    }
  }, [prefs])

  const toggleSaved = useCallback((id: string) => {
    setPrefs(p => ({
      ...p,
      savedVenueIds: p.savedVenueIds.includes(id)
        ? p.savedVenueIds.filter(x => x !== id)
        : [...p.savedVenueIds, id],
    }))
  }, [])

  const markViewed = useCallback((id: string) => {
    setPrefs(p => ({
      ...p,
      recentlyViewed: [id, ...p.recentlyViewed.filter(x => x !== id)].slice(0, 6),
    }))
  }, [])

  const addSearch = useCallback((q: string) => {
    const trimmed = q.trim()
    if (!trimmed) return
    setPrefs(p => ({ ...p, recentSearches: [trimmed, ...p.recentSearches.filter(x => x !== trimmed)].slice(0, 5) }))
  }, [])

  const setBudget = useCallback((budget: number | null) => setPrefs(p => ({ ...p, budget })), [])
  const setAmenities = useCallback(
    (amenities: string[]) => setPrefs(p => ({ ...p, requiredAmenities: amenities })),
    [],
  )
  const setLocality = useCallback((locality: string | null) => setPrefs(p => ({ ...p, locality })), [])

  return { prefs, toggleSaved, markViewed, addSearch, setBudget, setAmenities, setLocality }
}
