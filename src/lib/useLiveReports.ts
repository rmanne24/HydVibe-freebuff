// useLiveReports: polls the backend for reports, exposing the ability to
// subscribe to a live view of all crowd reports. Falls back to no data when
// the backend is unreachable.

import { useEffect, useState, useCallback } from 'react'
import type { CrowdReport } from '../types/domain'
import { api } from './api'

export function useLiveReports(pollMs = 4000) {
  const [reports, setReports] = useState<CrowdReport[]>([])
  const [connected, setConnected] = useState<boolean | null>(null)

  const refresh = useCallback(async () => {
    try {
      const latest = await api.reports()
      setReports(latest)
      setConnected(true)
    } catch {
      setConnected(false)
    }
  }, [])

  useEffect(() => {
    let alive = true
    refresh()
    const t = setInterval(() => {
      if (alive) refresh()
    }, pollMs)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [refresh, pollMs])

  return { reports, connected, refresh }
}
