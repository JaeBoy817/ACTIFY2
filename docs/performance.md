# ACTIFY Performance Audit (Current Pass)

## Project reality detected
- Next.js App Router (`/app`), TypeScript, Tailwind.
- Auth: Clerk.
- DB: Prisma.
- Existing performance primitives already present:
  - route prefetch helper
  - web vitals logger (`PerformanceReporter`)
  - virtualization in several large lists (`@tanstack/react-virtual`)
  - dynamic imports in some heavy modules.

## Baseline (before this pass)
Build command used:
```bash
npm run build
```

Route first-load JS from baseline build:

| Route | First Load JS (Before) |
|---|---:|
| `/app` | 111 kB |
| `/app/calendar` | 89.5 kB |
| `/app/attendance` | 89.5 kB |
| `/app/analytics` | 134 kB |
| `/app/residents` | 177 kB |
| `/app/templates` | 152 kB |
| `/app/volunteers` | 123 kB |

## Largest bundles / offenders
From `.next/static/chunks` and analyzer output:

1. `6766.*.js` (~363 kB) – large chart/visualization/vendor chunk.
2. `fd9d1056-*.js` (~169 kB) – shared runtime/vendor.
3. `framework-*.js` (~137 kB) – Next framework runtime.
4. `2117-*.js` (~122 kB) – shared app chunk.
5. `main-*.js` (~119 kB) – main client runtime.
6. `2711-*.js` (~108 kB) – route-level heavy feature chunk.
7. `2949.*.js` (~86 kB) – route-level heavy feature chunk.
8. `4358-*.js` (~83 kB) – route-level heavy feature chunk.
9. `9495-*.js` (~60 kB) – route-level chunk.
10. `5859-*.js` (~59 kB) – route-level chunk.

## What was slow and why
1. Residents/Templates/Volunteers route hydration cost:
   - each page mounted a large client workspace directly from the route server component.
2. Notifications on every app render:
   - app layout preloaded notification list payload for dropdown even when dropdown is unopened.
3. Overfetch patterns in residents list queries:
   - broad `findMany` without strict select list.
4. Missing loading boundaries on heavy routes:
   - no `loading.tsx` for several modules, causing slower perceived tab transitions.
5. Reports preview cost:
   - inline PDF iframe loaded immediately, even when user didn’t need preview.

## Code changes made

### 1) Route-level lazy loading for heavy client workspaces
- Added:
  - `/Users/jaeboy/Documents/Website Actify Project/components/residents/ResidentsWorkspaceLazy.tsx`
  - `/Users/jaeboy/Documents/Website Actify Project/components/templates/TemplatesPageShellLazy.tsx`
  - `/Users/jaeboy/Documents/Website Actify Project/components/volunteers/VolunteersHubLazy.tsx`
- Updated:
  - `/Users/jaeboy/Documents/Website Actify Project/app/app/residents/page.tsx`
  - `/Users/jaeboy/Documents/Website Actify Project/app/app/templates/page.tsx`
  - `/Users/jaeboy/Documents/Website Actify Project/app/app/volunteers/page.tsx`

Result: large route client bundles moved behind async boundaries and skeletons.

### 2) Added missing loading boundaries for heavy route segments
- Added:
  - `/Users/jaeboy/Documents/Website Actify Project/app/app/calendar/loading.tsx`
  - `/Users/jaeboy/Documents/Website Actify Project/app/app/dashboard/budget-stock/loading.tsx`
  - `/Users/jaeboy/Documents/Website Actify Project/app/app/templates/loading.tsx`
  - `/Users/jaeboy/Documents/Website Actify Project/app/app/reports/loading.tsx`
  - `/Users/jaeboy/Documents/Website Actify Project/app/app/volunteers/loading.tsx`

Result: instant shell+skeleton response on navigation.

### 3) Residents query projection cleanup (less DB/serialization work)
- Added:
  - `/Users/jaeboy/Documents/Website Actify Project/lib/residents/query.ts`
- Updated:
  - `/Users/jaeboy/Documents/Website Actify Project/lib/residents/serializers.ts`
  - `/Users/jaeboy/Documents/Website Actify Project/app/api/residents/route.ts`
  - `/Users/jaeboy/Documents/Website Actify Project/app/api/residents/[residentId]/route.ts`
  - `/Users/jaeboy/Documents/Website Actify Project/app/app/residents/page.tsx`

Result: strict selects used consistently, no implicit full-row fetches.

### 4) Templates list caching + tag invalidation
- Added:
  - `/Users/jaeboy/Documents/Website Actify Project/lib/templates/service.ts`
- Updated:
  - `/Users/jaeboy/Documents/Website Actify Project/app/app/templates/page.tsx`
  - `/Users/jaeboy/Documents/Website Actify Project/app/api/templates/route.ts`
  - `/Users/jaeboy/Documents/Website Actify Project/app/api/templates/[id]/route.ts`
  - `/Users/jaeboy/Documents/Website Actify Project/app/api/templates/[id]/duplicate/route.ts`
  - `/Users/jaeboy/Documents/Website Actify Project/app/api/templates/use/route.ts`

Result: deduped template reads with short TTL and safe revalidation on writes.

### 5) Notifications dropdown changed to on-demand payload loading
- Updated:
  - `/Users/jaeboy/Documents/Website Actify Project/app/api/notifications/route.ts` (added `GET`)
  - `/Users/jaeboy/Documents/Website Actify Project/components/app/NotificationBellDropdown.tsx`
  - `/Users/jaeboy/Documents/Website Actify Project/app/app/layout.tsx`

Result: app shell no longer blocks on fetching notification list for every route render; list loads when dropdown opens.

### 6) Dashboard non-blocking notification feed generation
- Updated:
  - `/Users/jaeboy/Documents/Website Actify Project/app/app/page.tsx`

Result: dashboard render no longer waits on notification feed generation.

### 7) Reports PDF preview no longer forced on initial page load
- Updated:
  - `/Users/jaeboy/Documents/Website Actify Project/app/app/reports/page.tsx`

Result: PDF iframe is opt-in (`inlinePreview=1`) to avoid expensive initial work.

### 8) Dev-only render instrumentation
- Added:
  - `/Users/jaeboy/Documents/Website Actify Project/lib/perf/devRenderTrace.ts`
- Updated:
  - `/Users/jaeboy/Documents/Website Actify Project/components/app/calendar-unified-workspace.tsx`
  - `/Users/jaeboy/Documents/Website Actify Project/components/attendance/AttendanceQuickTakeWorkspace.tsx`
  - `/Users/jaeboy/Documents/Website Actify Project/components/residents/ResidentsWorkspace.tsx`

Use by setting:
```bash
NEXT_PUBLIC_DEBUG_RENDERS=1
```

## After (measured)
Rebuilt after changes:
```bash
npm run build
npm run build:analyze
```

Route first-load JS after this pass:

| Route | Before | After | Delta |
|---|---:|---:|---:|
| `/app` | 111 kB | 111 kB | 0 |
| `/app/calendar` | 89.5 kB | 89.7 kB | +0.2 kB |
| `/app/attendance` | 89.5 kB | 89.7 kB | +0.2 kB |
| `/app/analytics` | 134 kB | 134 kB | 0 |
| `/app/residents` | 177 kB | 89.8 kB | **-87.2 kB** |
| `/app/templates` | 152 kB | 89.7 kB | **-62.3 kB** |
| `/app/volunteers` | 123 kB | 89.7 kB | **-33.3 kB** |

## Known remaining hotspots
1. `/app/settings` remains heavy (~208 kB first load JS).
2. `/app/resident-council` is still large (~172 kB) due feature breadth.
3. `/app/notes/new` remains heavy (~164 kB); rich builder complexity still concentrated there.
4. Largest global client chunks are still dominated by chart/vendor code.

## How to verify improvements

### 1) Build + route payloads
```bash
npm run build
```
Check `First Load JS` in build output for key routes.

### 2) Bundle analyzer
```bash
npm run build:analyze
open /Users/jaeboy/Documents/Website Actify Project/.next/analyze/client.html
open /Users/jaeboy/Documents/Website Actify Project/.next/analyze/nodejs.html
open /Users/jaeboy/Documents/Website Actify Project/.next/analyze/edge.html
```

### 3) Web vitals in dev
`PerformanceReporter` is already wired. In dev, metrics log to console:
- LCP
- INP
- CLS
- navigation timing marks

### 4) Optional Lighthouse
If Chrome is installed locally:
```bash
npm run start -- -p 3010
npx -y lighthouse http://localhost:3010/app --quiet --chrome-flags='--headless --no-sandbox' --only-categories=performance
npx -y lighthouse http://localhost:3010/app/calendar --quiet --chrome-flags='--headless --no-sandbox' --only-categories=performance
npx -y lighthouse http://localhost:3010/app/attendance --quiet --chrome-flags='--headless --no-sandbox' --only-categories=performance
npx -y lighthouse http://localhost:3010/app/analytics --quiet --chrome-flags='--headless --no-sandbox' --only-categories=performance
```

## Performance checklist (for future contributors)
- Keep route pages server-first; isolate interactivity into small client islands.
- Add `loading.tsx` for every heavy route segment.
- Never mount giant client workspaces directly in route pages; lazy wrap them.
- For list endpoints, use strict Prisma `select` and pagination when growth is expected.
- Revalidate cache tags on mutations; avoid global full refetches.
- Avoid auto-loading heavy previews (PDF/charts/editors) before user intent.
- Virtualize long lists and keep row components memo-friendly.
- Avoid always-on, full-page visual effects; gate expensive effects for low-power mode.
- Keep debug render instrumentation dev-only.

