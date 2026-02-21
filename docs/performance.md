# ACTIFY Performance Audit

## Scope
This pass targeted interactive speed for:
- Dashboard: `/app`
- Calendar: `/app/calendar`
- Attendance Tracker: `/app/attendance`
- Analytics: `/app/analytics`

## Environment + Workflow
- Framework: Next.js App Router + React + TypeScript + Tailwind
- Build command: `npm run build`
- Bundle analyzer: `npm run build:analyze`
- Route bundle inspection: `.next/static/chunks` + Next build route table

## Baseline (Before)
Baseline captured from the first production build at start of this pass.

### Route First Load JS (before)
| Route | First Load JS (Before) |
|---|---:|
| `/app` | 130 kB |
| `/app/calendar` | 165 kB |
| `/app/attendance` | 140 kB |
| `/app/analytics` | 134 kB |

### Lighthouse / Web Vitals baseline
Attempted local Lighthouse run with:
- `npx -y lighthouse http://localhost:3010/app --quiet --chrome-flags='--headless --no-sandbox' --only-categories=performance --output=json --output-path=docs/perf-lighthouse/baseline/app.json`

Result in this environment:
- **Blocked** (`No Chrome installations found`), so Lighthouse before/after numeric scores could not be captured here.
- Existing in-app web-vitals instrumentation (`PerformanceReporter`) remains enabled for live browser sessions.

## Largest Client Bundles (After Analyze)
From `.next/static/chunks` after optimization pass:

1. `6766.bb6df759b1e6b7b9.js` (~364 kB) – chart/math stack (not initial on core routes)
2. `fd9d1056-ebdfd632f8986610.js` (~172 kB) – shared runtime/vendor
3. `framework-56dfd39ab9a08705.js` (~140 kB)
4. `2117-28a06a7790c60f0f.js` (~124 kB)
5. `main-388ed2e93ae17fd2.js` (~120 kB)
6. `app/app/settings/page-*.js` (~116 kB) – settings page remains heavy
7. `app/app/residents/[id]/page-*.js` (~59 kB)
8. `app/app/dashboard/budget-stock/page-*.js` (~51 kB)
9. `app/app/residents/page-*.js` (~43 kB)
10. `app/app/resident-council/page-*.js` (~41 kB)

## Optimizations Implemented

### 1) Reduced global paint + animation cost
Heavy global animations were running on all sections/buttons/selects/dropdowns, causing continuous repaint pressure.

Changes:
- Removed global perpetual animation from `section`, `article`, `button`, `select`, and dropdown popper wrappers.
- Removed global backdrop blur on all buttons.
- Reduced dashboard ambient blur/opacity and slowed animation cadence.

Files:
- `/Users/jaeboy/Documents/Website Actify Project/app/globals.css`

### 2) Split heavy client islands (Calendar + Attendance)
Calendar and Attendance main workspaces were bundled directly into route shells.

Changes:
- Added lazy wrappers using `next/dynamic` for:
  - `CalendarUnifiedWorkspace`
  - `AttendanceQuickTakeWorkspace`
- Route shells now render quickly with lightweight skeletons while heavy workspace code streams in.

Files:
- `/Users/jaeboy/Documents/Website Actify Project/components/app/CalendarUnifiedWorkspaceLazy.tsx`
- `/Users/jaeboy/Documents/Website Actify Project/app/app/calendar/page.tsx`
- `/Users/jaeboy/Documents/Website Actify Project/components/attendance/AttendanceQuickTakeWorkspaceLazy.tsx`
- `/Users/jaeboy/Documents/Website Actify Project/app/app/attendance/page.tsx`

### 3) Reduced dashboard client payload via lazy client cards
Dashboard client-heavy cards now load lazily.

Changes:
- Added lazy wrappers for:
  - `AnalyticsCardClient`
  - `OneToOneNotesCardClient`

Files:
- `/Users/jaeboy/Documents/Website Actify Project/components/dashboard/AnalyticsCardClientLazy.tsx`
- `/Users/jaeboy/Documents/Website Actify Project/components/dashboard/OneToOneNotesCardClientLazy.tsx`
- `/Users/jaeboy/Documents/Website Actify Project/components/dashboard/AnalyticsCard.tsx`
- `/Users/jaeboy/Documents/Website Actify Project/components/dashboard/OneToOneNotesCard.tsx`

### 4) Removed unnecessary post-save attendance refetch
Saving attendance previously triggered a full quick-take reload immediately after save.

Changes:
- Kept optimistic UI state and removed forced post-save reload call.
- Prefetch sessions route still retained.

Files:
- `/Users/jaeboy/Documents/Website Actify Project/components/attendance/AttendanceQuickTakeWorkspace.tsx`

### 5) Added short-lived caching for hot attendance and calendar reads
Changes:
- Added cached quick-take payload path + cache tag helpers.
- API GET now uses cached quick-take payload.
- API POST invalidates quick-take cache tag.
- Calendar templates query now cached per facility (60s).

Files:
- `/Users/jaeboy/Documents/Website Actify Project/lib/attendance-tracker/service.ts`
- `/Users/jaeboy/Documents/Website Actify Project/app/api/attendance/quick-take/route.ts`
- `/Users/jaeboy/Documents/Website Actify Project/app/app/calendar/page.tsx`

### 6) Notification query pressure reduction
Top app layout was repeatedly doing notification feed + unread/list work.

Changes:
- Added short TTL in-memory cache for unread count + notification list.
- Added per-user invalidation on mutation paths.
- Added ensure-feed throttle window to avoid rerunning full feed generation on every request.

Files:
- `/Users/jaeboy/Documents/Website Actify Project/lib/notifications/service.ts`

### 7) Expanded proactive route prefetch
Changes:
- Expanded idle prefetch targets to include core tabs used in top-level navigation.

Files:
- `/Users/jaeboy/Documents/Website Actify Project/components/app/RoutePrefetcher.tsx`

## After (Measured)
From final `npm run build` / `npm run build:analyze` after changes.

### Route First Load JS (after)
| Route | First Load JS (After) | Delta |
|---|---:|---:|
| `/app` | 111 kB | **-19 kB** |
| `/app/calendar` | 89.5 kB | **-75.5 kB** |
| `/app/attendance` | 89.5 kB | **-50.5 kB** |
| `/app/analytics` | 134 kB | 0 kB |

## Known Remaining Hotspots
1. `/app/settings` remains large (~207 kB first load JS).
2. Residents and Resident Council page chunks are still substantial due feature breadth.
3. Shared runtime/vendor chunks are still dominant in total first-load cost.
4. Lighthouse cannot be produced in this environment until a Chrome binary is available.

## How To Run Performance Checks

### 1) Build + route payloads
```bash
npm run build
```
Read route table output (`Size`, `First Load JS`).

### 2) Bundle analyzer
```bash
npm run build:analyze
open .next/analyze/client.html
open .next/analyze/nodejs.html
open .next/analyze/edge.html
```

### 3) Lighthouse (when Chrome is installed)
```bash
npm run start -- -p 3010
npx -y lighthouse http://localhost:3010/app --quiet --chrome-flags='--headless --no-sandbox' --only-categories=performance --output=json --output-path=docs/perf-lighthouse/after/app.json
npx -y lighthouse http://localhost:3010/app/calendar --quiet --chrome-flags='--headless --no-sandbox' --only-categories=performance --output=json --output-path=docs/perf-lighthouse/after/calendar.json
npx -y lighthouse http://localhost:3010/app/attendance --quiet --chrome-flags='--headless --no-sandbox' --only-categories=performance --output=json --output-path=docs/perf-lighthouse/after/attendance.json
npx -y lighthouse http://localhost:3010/app/analytics --quiet --chrome-flags='--headless --no-sandbox' --only-categories=performance --output=json --output-path=docs/perf-lighthouse/after/analytics.json
```

## How To Keep It Fast (Checklist)
- Keep heavy interactive workspaces behind lazy client boundaries.
- Avoid global perpetual CSS animations on high-frequency elements.
- Cache hot read paths (10–60s) and invalidate on writes.
- Keep route prefetch focused on high-probability next tabs.
- Use virtualization for lists that can exceed ~100 rows.
- Avoid full-list refetch after small mutations when optimistic state is already correct.
- Re-run `npm run build` and `npm run build:analyze` before merging large UI refactors.
