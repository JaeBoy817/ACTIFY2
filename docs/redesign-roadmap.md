# Actify Full Redesign Roadmap

Last updated: 2026-03-09

This roadmap executes the redesign in the safest order while preserving all current features, data, workflows, and RBAC behavior.

## Phase 1 Audit Snapshot (Completed)

### Route Inventory
- App Router layouts:
  - `app/layout.tsx`
  - `app/app/layout.tsx`
  - `app/app/attendance/layout.tsx`
  - `app/app/resident-council/layout.tsx`
  - `app/(marketing)/layout.tsx`
- Main authenticated route namespace:
  - `app/app/*` (Dashboard, Calendar, Templates, Attendance, Notes, Care Plans, Analytics, Volunteers, Budget/Stock, Resident Council, Reports, Settings, Print pages)
- Public/alias route namespace:
  - `app/*` mirrors for several modules.

### Shared UI Inventory
- Core primitives (`components/ui`):
  - `button`, `input`, `textarea`, `select`, `tabs`, `table`, `dialog`, `popover`, `dropdown-menu`, `badge`, `toast`, etc.
- Glass/material primitives:
  - `components/glass/*` (`GlassCard`, `GlassPanel`, `GlassNavbar`, `GlassSidebar`).
- System theming:
  - `app/globals.css`
  - `lib/actifyTheme.ts`
  - `lib/moduleRegistry.ts`

### Module Component Inventory (top-level counts)
- `components/app`: 25
- `components/dashboard`: 24
- `components/ui`: 18
- `components/residents`: 13
- `components/resident-council`: 13
- `components/attendance`: 12
- `components/marketing`: 11
- `components/budget-stock`: 11
- `components/notes`: 10
- `components/analytics`: 10
- `components/care-plans`: 9
- `components/volunteers`: 7
- `components/templates`: 7

### Existing Performance Utilities Found
- Client cache/dedupe: `lib/perf/client-cache.ts`
- Save queue: `lib/perf/save-queue.ts`
- Render trace helper: `lib/perf/devRenderTrace.ts`
- Existing loading boundaries across major routes.

---

## Implementation Order and Controls

Each phase must pass:
- `npm run lint`
- `npm run build`
- Feature parity smoke checks for touched modules.

Each phase includes:
- What changes
- How feature parity is preserved
- Performance strategy
- Regression guardrails

---

## Phase 2: Create Design Token System (Completed)

### What changes
- Centralize typography, spacing, elevation, radius, motion, semantic, and module accent tokens.
- Normalize route-to-theme mapping and reusable gradient/material tokens.

### Completed implementation
- Module visual tokens now include:
  - accent gradient classes
  - icon chip gradient classes
  - accent hex
  - primary gradient
  - soft wash gradient
- `lib/moduleRegistry.ts` now consumes shared token values instead of hardcoded module gradients.
- `lib/actifyTheme.ts` now builds themes from the same shared token source, eliminating duplicate module color definitions.

### Preserve functionality
- No feature logic changes.
- Tokens only; existing components continue rendering.

### Performance
- Replace ad hoc heavy effects with tokenized, bounded effects.
- Add reduced-motion/reduced-transparency defaults at token level.

### Regression guardrails
- Snapshot visual checks on shell + top 5 routes.
- Keep existing class names functional while migrating to tokens.

---

## Phase 3: Rebuild App Shell/Navigation

### What changes
- Sidebar, top header, route header, command palette, quick-jump architecture.
- Active route treatments, grouped navigation hierarchy, improved mobile drawer behavior.

### Preserve functionality
- Keep all route targets unchanged.
- Keep auth/session, RBAC entry checks, and notifications intact.

### Performance
- Persist shell in layout, prefetch on hover/focus.
- Limit re-renders in sidebar using memoized derived nav.

### Regression guardrails
- Verify all module links and deep links.
- Verify keyboard navigation and focus states.

---

## Phase 4: Rebuild Shared Components

### What changes
- Upgrade core primitives (`button`, `input`, `select`, `tabs`, `table`, `modal`, `drawer`) to unified premium system.
- Introduce reusable section header, filter bar, empty state, skeleton cards.

### Current implementation progress
- Upgraded core primitives in active use:
  - `components/ui/input.tsx`
  - `components/ui/textarea.tsx`
  - `components/ui/tabs.tsx`
  - `components/ui/table.tsx`
- Added new reusable shared primitives for module rewrites:
  - `components/ui/skeleton.tsx`
  - `components/ui/section-shell.tsx`
  - `components/ui/empty-state.tsx`

### Preserve functionality
- Keep component APIs backward compatible where possible.
- For breaking visual APIs, provide adapter wrappers.

### Performance
- Keep primitives light; avoid expensive effects in list rows.
- Ensure popovers/dialogs use portal efficiently.

### Regression guardrails
- Smoke test all major forms, dialogs, dropdowns, and tables.

---

## Phase 5: Rebuild Dashboard

### What changes
- New command-center layout, clear hierarchy, consolidated widgets.
- Keep daily motivation at bottom and existing data sources.

### Preserve functionality
- Keep all existing dashboard widgets reachable.
- Preserve current summary logic and 1:1 workflows.

### Performance
- Stream per-widget with suspense.
- Keep heavy analytics previews lazy-loaded.

### Regression guardrails
- Verify dashboard actions route correctly.
- Verify existing 1:1 queue and attendance status integration.

---

## Phase 6: Rebuild Calendar

### What changes
- Calendar 3-zone layout: command bar, canvas, inspector drawer.
- Month/Week/Day/Agenda modular views, template dock, schedule modal.

### Preserve functionality
- Keep all existing endpoints and event CRUD behaviors.
- Keep checklist/adaptation/template scheduling features.

### Performance
- Cache by range, prefetch adjacent ranges, virtualize agenda/template lists.
- Keep drawer state separate from grid state.

### Regression guardrails
- Test drag/drop, manual create/edit/delete, day details, attendance links.

---

## Phase 7: Rebuild Templates

### What changes
- Library + detail panel + dedicated edit flow.
- Stronger categorization and preview structure.

### Preserve functionality
- Preserve current template types and use/duplicate/archive/delete behavior.

### Performance
- Debounced search, virtualized long template lists.

### Regression guardrails
- Verify templates still prefill target workflows (calendar/notes/care plans).

---

## Phase 8: Rebuild Attendance Tracker

### What changes
- Simplified quick-take-first IA, sessions/history, resident view, reports.

### Preserve functionality
- Keep existing statuses, session model, and save behavior.

### Performance
- Virtualized resident lists, batched save, optimistic UI.

### Regression guardrails
- Verify save authorization/session handling and post-save navigation.

---

## Phase 9: Rebuild Notes

### What changes
- Unified notes list + builder + templates experience.

### Preserve functionality
- Preserve current fields, autosave/signing, filters, and list operations.

### Performance
- Split heavy builder sub-panels, debounce autosave, isolate form state.

### Regression guardrails
- Verify create/edit/sign/lock and resident linkages.

---

## Phase 10: Rebuild 1:1 Notes

### What changes
- Resident-context-first 1:1 note flow and timeline enhancements.

### Preserve functionality
- Preserve all existing 1:1 note schema and dashboard update logic.

### Performance
- Virtualized resident selector; lazy context enrichments.

### Regression guardrails
- Verify monthly completion tracking and dashboard queue behavior.

---

## Phase 11: Rebuild Care Plan

### What changes
- Structured sectioned cards, improved review flow and readability.

### Preserve functionality
- Preserve all current goals/interventions/review workflows and PDFs.

### Performance
- Lazy-load heavy exports/charts, optimize list rendering.

### Regression guardrails
- Verify create/edit/archive/review/export parity.

---

## Phase 12: Rebuild Analytics

### What changes
- Analytics hub + subsection shells with shared global filters.

### Preserve functionality
- Keep all existing metrics/charts/tables and filter logic.

### Performance
- Route-level code splitting, dynamic chart imports, cached aggregates.

### Regression guardrails
- Metric parity checks with existing calculations.

---

## Phase 13: Rebuild Volunteers

### What changes
- Single hub with tabs (Directory/Schedule/Hours) + detail drawer.

### Preserve functionality
- Keep all volunteer profile/schedule/hours/compliance data.

### Performance
- Lightweight default schedule list, lazy calendar toggle.

### Regression guardrails
- Verify add/edit/log/export and permissions behavior.

---

## Phase 14: Rebuild Budget/Stock

### What changes
- Simplified two-tab hub (Stock/Budget), smarter KPI row and list cards.

### Preserve functionality
- Keep inventory/expense/category/sales/profit and migration safety.

### Performance
- Paginated expense lists, optimistic stock adjust, compact payloads.

### Regression guardrails
- Verify totals, category mapping, and stock mutation correctness.

---

## Phase 15: Rebuild Resident Council

### What changes
- Care-plan-like sectioned IA for meetings, minutes, actions, reports.

### Preserve functionality
- Keep legacy compatibility and existing records.

### Performance
- Server pagination, virtualized lists, debounced search.

### Regression guardrails
- Verify exports, action item linkage, and legacy rendering fallback.

---

## Phase 16: Rebuild Reports

### What changes
- Clean reporting center with clear categories and generation flow.

### Preserve functionality
- Keep all report types and export paths.

### Performance
- Lazy preview renderers, route-level loading boundaries.

### Regression guardrails
- Verify output format parity (CSV/PDF/date ranges).

---

## Phase 17: Rebuild Settings

### What changes
- Grouped settings IA and calmer control layout with clear descriptions.

### Preserve functionality
- Keep all existing setting keys and save behavior.

### Performance
- Shared form state, optimistic save queue, deduped settings reads.

### Regression guardrails
- Verify RBAC restrictions and audit logs on sensitive changes.

---

## Phase 18: Final Accessibility/Performance Pass

### What changes
- Contrast/focus/keyboard cleanup, reduced-motion checks, input ergonomics.
- Bundle and route-level profiling + targeted optimization.

### Preserve functionality
- No logic refactors beyond perf-safe adjustments.

### Performance
- Reduce long tasks, avoid animation hotspots, tune virtualization thresholds.

### Regression guardrails
- Compare Web Vitals and Lighthouse against prior baseline.

---

## Phase 19: Final Animation/Polish Pass

### What changes
- Harmonize motion curves, timings, spring feel, and micro-feedback.

### Preserve functionality
- Visual-only changes.

### Performance
- Keep animation transform/opacity only.

### Regression guardrails
- Validate no interaction delay introduced by polish layer.

---

## Phase 20: Full QA and Feature Parity Validation

### What changes
- Cross-module QA matrix and final bug sweep.

### Preserve functionality
- Confirm every existing feature path still works end to end.

### Performance
- Final pass for route-switch latency and heavy-page responsiveness.

### Regression guardrails
- Final checklist:
  - CRUD parity
  - RBAC parity
  - Export parity
  - Calendar/attendance integrity
  - Notes and care-plan integrity
  - Mobile and accessibility parity
