# ACTIFY Performance Audit

## Scope
This pass focused on perceived speed and route responsiveness for:
- Dashboard (`/app`)
- Calendar (`/app/calendar`)
- Attendance (`/app/attendance`)
- Analytics (`/app/analytics`)

## Measurement Workflow
### Build metrics (before/after)
1. `npm run build`
2. Capture Next.js route output (`Size` and `First Load JS`)

### Bundle analysis
1. `npm run build:analyze`
2. Open:
   - `.next/analyze/client.html`
   - `.next/analyze/nodejs.html`
   - `.next/analyze/edge.html`

### Lighthouse / Web Vitals
- Lighthouse command attempted:
  - `npx -y lighthouse http://localhost:3100/app --only-categories=performance --output=json --output-path=./.tmp-lh-app.json --quiet --chrome-flags="--headless --no-sandbox --disable-dev-shm-usage"`
- In this sandbox, Lighthouse was not reliably executable (headless browser/runtime constraints + authenticated app routes).
- Added runtime Web Vitals instrumentation in-app (LCP/INP/CLS + nav timing), so production/dev browser sessions now emit metrics for real user flows.

## Baseline (Before)
Source: initial build snapshot at task start.

| Route | First Load JS (Before) |
|---|---:|
| `/app` | 151 kB |
| `/app/calendar` | 162 kB |
| `/app/attendance` | 106 kB |
| `/app/analytics` | 189 kB |

Largest bundle offenders (before):
- `recharts` chunk (analytics): ~381.6 kB parsed / ~97.9 kB gzip
- Clerk chunk: ~136 kB parsed / ~38.8 kB gzip
- Framer Motion chunk: ~120 kB parsed / ~39.4 kB gzip

## After
Source: final `npm run build` + `npm run build:analyze` after changes.

| Route | First Load JS (After) | Delta |
|---|---:|---:|
| `/app` | 152 kB | +1 kB |
| `/app/calendar` | 163 kB | +1 kB |
| `/app/attendance` | 106 kB | 0 kB |
| `/app/analytics` | 89.1 kB | **-99.9 kB** |

Top parsed client chunks (after):
1. `static/chunks/3617.*.js` — 379.2 kB parsed (mostly `recharts`) **not initial**
2. `static/chunks/fd9d1056-*.js` — 172.8 kB parsed (shared runtime)
3. `static/chunks/framework-*.js` — 140.0 kB parsed
4. `static/chunks/2255-*.js` — 139.5 kB parsed (mostly Clerk, initial in app layout)
5. `static/chunks/2117-*.js` — 124.7 kB parsed
6. `static/chunks/1242-*.js` — 121.0 kB parsed (Framer Motion, mostly marketing/auth initial)
7. `static/chunks/main-*.js` — 120.1 kB parsed
8. `static/chunks/app/app/settings/page-*.js` — 118.5 kB parsed
9. `static/chunks/app/app/calendar/page-*.js` — 71.3 kB parsed
10. `static/chunks/7262-*.js` — 62.2 kB parsed

## Slow Routes/Components Found + Fixes
### 1) Analytics payload too heavy on first paint
- Problem: `recharts` loaded as initial route JS for `/app/analytics`.
- Fix:
  - Moved chart rendering behind client-only lazy wrappers with `ssr: false`.
  - File changes:
    - `components/app/top-attendees-bar-chart-lazy.tsx`
    - `components/app/engagement-trend-chart-lazy.tsx`
    - `app/app/analytics/page.tsx`
- Result: `/app/analytics` first-load JS reduced from 189 kB to 89.1 kB.

### 2) Calendar repeated range fetch chatter
- Problem: week range endpoint called repeatedly with no short-term dedupe.
- Fix:
  - Added TTL + inflight dedupe client cache utility.
  - Added explicit cache invalidation after mutations.
  - Added fetch timing performance marks.
  - File changes:
    - `lib/perf/client-cache.ts`
    - `components/app/calendar-week-workspace.tsx`

### 3) Residents list render cost on large datasets
- Problem: long list rendering all rows produced avoidable render work and search lag.
- Fix:
  - Added virtualization (`@tanstack/react-virtual`) for resident list rows.
  - Added `useDeferredValue` for search typing smoothness.
  - Memoized row component.
  - File changes:
    - `components/residents/ResidentList.tsx`
    - `components/residents/ResidentsWorkspace.tsx`
    - `components/residents/ResidentListItem.tsx`

### 4) Settings tab interaction cost
- Problem: all tab panes mounted simultaneously (`forceMount`) causing unnecessary render workload.
- Fix:
  - Removed `forceMount` across settings tab contents so only active tab mounts.
  - File changes:
    - `app/app/settings/_components/SettingsTabs.tsx`

### 5) Navigation transition perceived latency
- Problem: route transitions had no explicit nav timing visibility and limited proactive prefetch.
- Fix:
  - Added hover/focus/touch prefetch for sidebar links.
  - Added route prefetcher for hot destinations.
  - Added route timing marks and web-vitals reporting utility.
  - File changes:
    - `components/app/sidebar.tsx`
    - `components/app/RoutePrefetcher.tsx`
    - `components/app/PerformanceReporter.tsx`
    - `app/app/layout.tsx`

### 6) CSS effect cost guardrails
- Problem: heavy visual effects can cause low-end device jank.
- Fix:
  - Added low-power mode behavior based on `saveData`, `deviceMemory`, `hardwareConcurrency`.
  - Reduced animation/blur/shadow intensity under low-power mode.
  - File changes:
    - `app/globals.css`
    - `components/app/PerformanceReporter.tsx`

### 7) Smaller server query improvements
- Problem: avoidable overfetch and serial query timing.
- Fix:
  - Analytics queries switched to narrower `select` projections.
  - Attendance page presence query moved into main `Promise.all` batch.
  - File changes:
    - `app/app/analytics/page.tsx`
    - `app/app/attendance/page.tsx`

## Known Remaining Hotspots
1. Settings route bundle remains large (`/app/settings` first-load JS ~205 kB) due very large monolithic tab component.
2. Clerk runtime remains a major initial chunk in authenticated app layout.
3. Calendar route chunk is still sizable (~71 kB parsed route chunk) due complex drag/drop and scheduler UI.
4. Heavy global visual styling (shadows/backdrop effects) can still tax low-end devices despite low-power guardrails.

## How to Keep It Fast (Checklist)
- Keep charting/PDF/drag-drop modules lazy and route-scoped.
- Avoid broad `include` queries; always project only needed fields.
- Use `Promise.all` for independent queries.
- Cache hot read endpoints client-side with short TTL + inflight dedupe.
- Virtualize lists once row count can exceed ~75–100.
- Debounce/defer expensive filters (`useDeferredValue`, 150–250ms debounce).
- Keep settings/admin screens split into smaller chunks; avoid mounting hidden tabs.
- Track Web Vitals continuously (LCP/INP/CLS) and route nav timings in dev/staging.
- Re-run `npm run build:analyze` before large UI merges and verify no accidental initial chunk regressions.

## Changed Files (Performance Pass)
- `next.config.mjs`
- `package.json`
- `components/app/sidebar.tsx`
- `components/app/RoutePrefetcher.tsx`
- `components/app/PerformanceReporter.tsx`
- `app/app/layout.tsx`
- `app/globals.css`
- `lib/perf/client-cache.ts`
- `components/app/calendar-week-workspace.tsx`
- `app/app/calendar/page.tsx`
- `components/app/top-attendees-bar-chart-lazy.tsx`
- `components/app/engagement-trend-chart-lazy.tsx`
- `app/app/analytics/page.tsx`
- `app/app/attendance/page.tsx`
- `components/residents/ResidentList.tsx`
- `components/residents/ResidentsWorkspace.tsx`
- `components/residents/ResidentListItem.tsx`
- `app/app/settings/_components/SettingsTabs.tsx`
