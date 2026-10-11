// Client API layer — talks to the express backend with graceful polling.

import type { CrowdLevel, CrowdReport } from '../types/domain'

export interface ReportInput {
  venueId: string
  level: CrowdLevel
  note?: string
  sessionId: string
  simulated?: boolean
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    let msg = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (body?.error) msg = body.error
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}

export const api = {
  health: () => jsonFetch<{ ok: boolean }>('/api/health'),
  reports: (venueId?: string) =>
    jsonFetch<CrowdReport[]>(`/api/reports${venueId ? `?venueId=${encodeURIComponent(venueId)}` : ''}`),
  reportsSince: (since: number) => jsonFetch<CrowdReport[]>(`/api/reports?since=${since}`),
  submitReport: (input: ReportInput) =>
    jsonFetch<CrowdReport>('/api/reports', { method: 'POST', body: JSON.stringify(input) }),
  demoEvents: (since?: number) =>
    jsonFetch<DemoEvent[]>(`/api/demo-events${since != null ? `?since=${since}` : ''}`),
  clearDemo: () => jsonFetch<{ ok: boolean }>('/api/demo-events', { method: 'DELETE' }),
}

export interface DemoEvent {
  id: string
  kind: 'report' | 'sim'
  venueId: string
  venueName: string
  level: string
  at: number
}

export function getSessionId(): string {
  const KEY = 'hydvibe.session'
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(KEY, id)
  }
  return id
}
