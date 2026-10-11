# HydVibe

**Find your place. Catch the right vibe.**

HydVibe is an AI-powered live city discovery web app for Hyderabad. It combines:

- **CafeMatch** — personalized venue discovery driven by natural-language search ("quiet café near Gachibowli under ₹400 with Wi-Fi") with transparent, deterministic ranking.
- **HydQueue** — community-powered crowd intelligence: anyone can report Empty / Comfortable / Busy / Packed for a venue in 5 seconds, no sign-in. Recency-weighted aggregation with honest confidence labels.

## Quick start

```bash
npm install
npm run dev        # starts Vite (5173) + API server (5175) together
```

Open http://localhost:5173. The dev server proxies `/api` to the backend on 5175.

Production build:

```bash
npm run build      # typecheck + vite build → dist/
npm run test       # vitest — 16 tests covering crowd aggregation, ranking, intent parsing
npm run dev:api    # API server alone (serves dist/ when present)
```

## Routes

| Route | Purpose |
|---|---|
| `/` | Discover — hero search, mood chips, categories, live crowd pulse |
| `/matchmaker?q=...` | Vibe Matchmaker — NL search interpretation, refined filters, ranked results with explanations |
| `/venue/:id` | Venue detail — crowd reports, "Should I go now?" decision panel, quieter alternatives, save/share |
| `/explore` | Interactive Leaflet map (OpenStreetMap) with crowd-colored pins + list toggle |
| `/saved` | Saved places, recently viewed, recent searches (localStorage) |
| `/demo` | **Live showcase** — real scannable QR to the report route, live activity feed, report counter, clearly-labelled simulation controls |

## Honest-data principles

- Crowd status comes **only** from community reports within a 90-minute freshness window. Stale reports expire.
- Confidence reflects sample size and freshness — never claims certainty.
- "No live data" is always distinguished from "Empty".
- Simulated reports are visibly tagged `SIM` and never mixed with real submissions.
- Venue records are explicitly labelled sample data for the hackathon build; nothing claims business verification.
- No precise wait times are fabricated; the decision panel (GO NOW / CONSIDER WAITING / TRY AN ALTERNATIVE / NOT ENOUGH DATA) is evidence-based only.

## Architecture

```
src/
  types/domain.ts      # shared domain types
  data/seed.ts         # 15 Hyderabad venue records (extensible schema: cafés, gyms, salons, service centres)
  lib/
    concepts.ts        # crowd scale, tuning constants, mood map
    crowdEngine.ts     # recency-weighted aggregation, confidence, trends
    intent.ts          # keyword-based NL intent extraction (deterministic fallback contract)
    ranking.ts         # hard-constraint filtering + soft scoring + alternatives engine
    api.ts             # client API layer + session ids
    useLiveReports.ts  # polling live-subscription hook
    usePrefs.ts        # persisted preferences
  pages/               # Home, Matchmaker, VenueDetail, Explore, Saved, Demo
  components/          # Layout, VenueCard, CrowdBadge
server/index.mjs       # Express API: append-only reports persisted to data/*.json,
                       # rate limiting (4/min/session), duplicate protection, validation
tests/                 # vitest coverage for crowd + ranking + intent
```

### Crowd aggregation

- Ordered scale: Empty < Comfortable < Busy < Packed (0–3).
- Recency weight: `exp(-age / 45min)`.
- Per-session influence capped at 2 reports so one device can't dominate.
- Status bands: <0.75 empty · <1.6 comfortable · <2.4 busy · else packed.
- Confidence: none / low / moderate / high by report count × freshness share.
- Trends compared across recent windows only when ≥4 observations exist; otherwise "Trend unavailable".

## Demo flow (hackathon)

1. Presenter opens `/demo` on the big screen.
2. Audience scans the genuine QR code → opens the venue report screen.
3. Each submission appears live in the activity feed (real rows, un-tagged).
4. Aggregates and "Should I go now?" recommendations recompute across connected devices.
5. `Run simulation` injects clearly-marked `SIM` reports when no audience is available; `Reset demo` clears them.

## Tech

React 19 · TypeScript (strict) · Vite · Tailwind CSS · Leaflet + OpenStreetMap · Express · Vitest · lucide-react · qrcode
