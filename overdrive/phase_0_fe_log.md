## 2026-02-17 - Phase 0 FE foundation scaffold

### Commands run
- `npm create vite@latest frontend -- --template react-ts`
- `cd frontend`
- `npm install`
- `npm install react@^18 react-dom@^18 react-router-dom @tanstack/react-query @tanstack/react-query-devtools clsx tailwind-merge class-variance-authority lucide-react`
- `npm install -D @types/react@^18 @types/react-dom@^18 tailwindcss@^3.4.17 postcss autoprefixer tailwindcss-animate prettier eslint-config-prettier eslint-plugin-react`
- `npx tailwindcss init -p`
- `npx shadcn@latest init -d`
- `npx shadcn@latest add button dialog toast input textarea`
- `npm run format`
- `npm run lint`
- `npm run typecheck`
- `npm run format:check`
- `npm run build`

### Config decisions
- Added `@/*` alias in `tsconfig.json`, `tsconfig.app.json`, and `vite.config.ts`.
- Kept TypeScript strict mode enabled (`strict: true`) and added `typecheck` script.
- Used `tailwind.config.cjs` + `postcss.config.cjs` for CLI compatibility and enabled `tailwindcss-animate` plugin.
- Initialized shadcn with CSS variables in `src/index.css` and generated `src/lib/utils.ts` (`cn` helper).
- Added shadcn primitives: `Button`, `Dialog`, `Toast`, `Toaster`, plus `Input` and `Textarea`.
- Mounted `Toaster` once in `src/app/providers.tsx`.
- Added SPA route scaffold with redirect `/ -> /projects` and placeholder routes under `/projects/*`.
- Added Query provider at root and enabled React Query Devtools only in dev mode.
- ESLint uses flat config with React + React Hooks + TypeScript + React Refresh + `eslint-config-prettier`.
- Added Prettier config/scripts (`format`, `format:check`).

### How to run locally
- `cd frontend`
- `npm install`
- `npm run dev`

### Known follow-ups for Phase 1
- API client and real data fetching hooks are intentionally not implemented yet.
- Product screens/workflows are placeholders by design in this phase.

## 2026-02-17 - Phase 1 FE infra: API client, query client, global error toasts

### Files/modules added
- `frontend/src/lib/api/client.ts`
- `frontend/src/lib/api/errors.ts`
- `frontend/src/lib/api/index.ts`
- `frontend/src/app/queryClient.ts`
- `frontend/src/vite-env.d.ts`

### Files updated
- `frontend/src/app/providers.tsx`

### Base URL resolution behavior
- Source env: `import.meta.env.VITE_API_BASE_URL`
- Fallback when env is unset: `'/api/v1'` (same-origin API prefix)
- If env is host only (example: `http://localhost:8000`): resolved base becomes `http://localhost:8000/api/v1`
- If env already includes prefix (example: `https://api.example.com/api/v1`): prefix is preserved (no double append)
- Relative inputs are normalized to include `/api/v1`

### Error parsing and surfacing
- Non-2xx responses throw `ApiError` with:
  - `status`
  - `detail`
  - optional raw `payload`
- Error detail parser uses backend canonical shape `{ detail: string }`
- If `{ detail }` is missing, fallback is `statusText` or `Request failed with status <code>`
- Global user-facing errors are derived with `getErrorMessage(error)`:
  - `ApiError` => `error.detail`
  - generic `Error` => `error.message`
  - fallback => `Something went wrong`

### Query client and global toast wiring
- Shared singleton QueryClient created in `frontend/src/app/queryClient.ts`
- `QueryCache.onError` and `MutationCache.onError` dispatch destructive toasts:
  - `toast({ variant: 'destructive', title: 'Error', description: message })`
- Retry policy:
  - no retry for most 4xx API errors (except `429`)
  - retry up to 2 attempts otherwise
- `frontend/src/app/providers.tsx` now uses shared `queryClient` and mounts `Toaster` once globally

### Manual verification steps run
- `cd frontend && npm run format`
- `cd frontend && npm run lint`
- `cd frontend && npm run typecheck`
- `cd frontend && npm run build`
- `cd frontend && npm run dev -- --host 127.0.0.1 --port 4173` (server started successfully)
- Forced 404/500 toast verification was not executed in this node because there are no feature query/mutation callsites yet.

## 2026-02-17 - Phase 1 shell, breadcrumb, and placeholder phase routing

### Summary of changes
- Updated the root app shell to a fixed top navigation bar (`h-14`), with a dedicated scrollable main content region and centered content container (`max-w-[1200px]`).
- Added a reusable breadcrumb component and integrated it into Project Detail with a client-side Dashboard link back to `/projects`.
- Updated route inventory placeholders to pass explicit phase numbers and render `Coming in Phase X` copy per route.
- Updated Dashboard and Project Detail stub copy to align with Phase 1 naming.

### Touched files
- `frontend/src/app/App.tsx`
- `frontend/src/app/router.tsx`
- `frontend/src/components/app/Breadcrumbs.tsx`
- `frontend/src/routes/ProjectsPage.tsx`
- `frontend/src/routes/ProjectDetailPage.tsx`
- `frontend/src/routes/VersionPlaceholderPage.tsx`

### Manual verification steps performed
- `cd frontend && npm run format`
- `cd frontend && npm run lint`
- `cd frontend && npm run typecheck`
- `cd frontend && npm run build`
- Attempted local runtime verification with `cd frontend && npm run dev -- --host 127.0.0.1 --port 4173` and deep-link URL checks (`/projects`, `/projects/123`, `/projects/123/versions/1/results`).
- In this execution environment, dev server bind failed with `listen EPERM`, so browser-level click/back-forward verification could not be completed here.

### Follow-ups / known limitations
- Browser/manual navigation verification (breadcrumb click and back/forward behavior) should be run locally outside this sandbox due the observed port bind restriction.

## 2026-02-17 14:06 GMT - Phase 1 projects dashboard list query and UX states

### Summary
- Implemented typed Projects list API wrapper and TanStack Query hook for `GET /api/v1/projects?limit=100&offset=0`.
- Replaced `/projects` stub with loading skeletons, inline recoverable error panel + retry, empty state CTA, and populated clickable rows.
- Added a minimal shadcn `Dialog` stub for `Create Project` CTA placement.
- Added reusable date formatting helper for `updated_at` display.

### Files changed/added
- `frontend/src/lib/api/index.ts`
- `frontend/src/lib/api/projects.ts`
- `frontend/src/features/projects/queries.ts`
- `frontend/src/lib/date.ts`
- `frontend/src/components/projects/CreateProjectDialog.tsx`
- `frontend/src/routes/ProjectsPage.tsx`

### Manual verification
- `cd frontend && npm run lint` (pass)
- `cd frontend && npm run typecheck` (pass)
- `cd frontend && npm run build` (pass)
- `cd frontend && npm run dev -- --host 127.0.0.1 --port 4173` (dev server started)
- Load `/projects` with backend running and confirm request URL: not fully verifiable in this sandbox (backend not available in-session).
- Confirm skeletons on slow network/throttling: pending browser-network throttle verification locally.
- Confirm empty state when API returns empty: pending backend response control locally.
- Confirm navigation to `/projects/:id`: implemented via row `<Link>`; browser click verification pending locally.
- Confirm error toast + retry by stopping/restarting backend: pending backend availability locally.

## 2026-02-17 14:27 GMT - Create Project modal with optimistic list insertion

### Summary
- Replaced placeholder create dialog with full form UX (Name required, Description optional) using shadcn/Radix Dialog.
- Added client-side validation mirroring backend limits (`name` trimmed, required, <=200; `description` <=1000).
- Added `POST /api/v1/projects` API function and wired create mutation.
- Implemented optimistic insertion into the projects list cache and reconciliation with the server-returned project.
- Added rollback + toast error handling on mutation failure while preserving form input for retry.

### Files changed
- `frontend/src/components/projects/CreateProjectDialog.tsx`
- `frontend/src/features/projects/queries.ts`
- `frontend/src/lib/api/index.ts`
- `frontend/src/lib/api/projects.ts`

### Optimistic update / reconciliation details
- Query key used: `defaultProjectsListQueryKey` (`['projects','list',{ limit: 100, offset: 0 }]`).
- On mutate: cancel in-flight list query, snapshot previous list, insert optimistic project at top with temporary id (`crypto.randomUUID()` fallback `optimistic-<timestamp>`) and `updated_at` set to now.
- On success: replace optimistic item by matching temporary id and dedupe by real server id to avoid duplicates.
- On error: restore prior snapshot (or clear synthetic cache if none existed).

### Validation behavior
- `name` is trimmed before submit and validated as non-empty and <= 200 chars.
- `description` validated as <= 1000 chars.
- Save button is disabled when invalid or pending; inline field errors are shown.

### Manual verification checklist run
- `cd frontend && npm run lint` (pass)
- `cd frontend && npm run typecheck` (pass)
- `cd frontend && npm run build` (pass)
- `cd frontend && npm run format:check` (pass)
- Happy-path API create and backend-down failure flow require backend/browser interaction and were not executable in this sandbox session.

### Follow-ups / known limitations
- Confirm end-to-end behavior against live backend: POST payload shape, optimistic row visual, reconciliation without duplicates, and failure retry UX with backend stopped/restarted.

## 2026-02-17 14:50 GMT - Project detail page with backend fetch and versions placeholder

### Files changed
- `frontend/src/lib/api/projects.ts`
- `frontend/src/lib/api/index.ts`
- `frontend/src/features/projects/queries.ts`
- `frontend/src/routes/ProjectDetailPage.tsx`

### Implemented
- Added project detail API helper `getProjectById` for `GET /api/v1/projects/:id`.
- Added project detail query key/hook (`['projects','detail',id]`) with `enabled: Boolean(id)` and local error-toast control via query `meta`.
- Replaced placeholder detail route with loading, success, 404, and retryable non-404 error states.
- Added canonical header rendering (name + optional description only when present).
- Added Versions phase-1 placeholder region with `No versions yet` and disabled `Create Version` control using `title="Coming in Phase 2"` + helper text.
- Kept breadcrumb navigation back to `/projects` (client-side link).

### Manual verification
- `cd frontend && npm run format`
- `cd frontend && npm run lint`
- `cd frontend && npm run typecheck`
- `cd frontend && npm run build`
- Route-level runtime checks for live backend responses (`/projects/:id`, 404, and non-404 error + retry) were not fully executable in this sandbox session because backend endpoints are not available here.

### Deviation notes
- Tooltip requirement implemented with the minimal supported approach (`title` attribute + inline helper text) because no tooltip component exists in this frontend codebase.


## 2026-02-17 15:18 GMT - FE primitives + ApiError body preservation + mutation toast baseline

### Summary
- Added missing shadcn/ui primitives required for upcoming Version Builder work: `badge`, `card`, `checkbox`, `radio-group`, and `slider` under `frontend/src/components/ui/`.
- Added required Radix dependencies for the new primitives in `frontend/package.json` via install: `@radix-ui/react-checkbox`, `@radix-ui/react-radio-group`, `@radix-ui/react-slider`.
- Updated shared API error handling to preserve backend payload shape exactly (including structured `detail`) on non-2xx responses.
- Confirmed global React Query mutation error toasts are wired through `MutationCache.onError` and standardized toast copy.

### Files changed
- `frontend/src/components/ui/badge.tsx`
- `frontend/src/components/ui/card.tsx`
- `frontend/src/components/ui/checkbox.tsx`
- `frontend/src/components/ui/radio-group.tsx`
- `frontend/src/components/ui/slider.tsx`
- `frontend/src/lib/api/errors.ts`
- `frontend/src/lib/api/client.ts`
- `frontend/src/app/queryClient.ts`
- `frontend/package.json`
- `frontend/package-lock.json`

### API behavior details
- `ApiError` now exposes `status` and `body` in `frontend/src/lib/api/errors.ts`.
- `frontend/src/lib/api/client.ts` `request(...)` now throws `new ApiError(response.status, body)` for non-2xx responses.
- Error body parsing behavior:
  - JSON responses are parsed when `content-type` indicates JSON.
  - Non-JSON responses fall back to text.
  - Empty responses become `null`.
- `getErrorMessage(...)` now prefers `ApiError.body.detail` and supports both string and structured detail values with deterministic stringification.

### Query toast wiring details
- Global mutation errors are surfaced from `MutationCache.onError` in `frontend/src/app/queryClient.ts`.
- Toast API call remains centralized via `toast({ variant: 'destructive', ... })` and now uses:
  - title: `Something went wrong`
  - description: `getErrorMessage(error)`

### Verification
- `cd frontend && npm run lint` (pass)
- `cd frontend && npm run typecheck` (pass)
- `cd frontend && npm run build` (pass)

## 2026-02-17 16:53 GMT - Verification pass for primitives + API error wrapper + mutation toasts

### What changed
- No code changes were required; the requested baseline infra was already present and consistent with the current FE conventions.
- Added this log entry to document explicit verification against the Phase 1 brief acceptance criteria.

### Primitives confirmed available
- Confirmed importable shadcn/ui primitives exist in `frontend/src/components/ui/`:
  - `badge.tsx`
  - `card.tsx`
  - `checkbox.tsx`
  - `radio-group.tsx`
  - `slider.tsx`
- Confirmed required Radix deps are present in `frontend/package.json`:
  - `@radix-ui/react-checkbox`
  - `@radix-ui/react-radio-group`
  - `@radix-ui/react-slider`

### API wrapper + ApiError confirmed
- Shared fetch wrapper is in `frontend/src/lib/api/client.ts` via `request(...)`:
  - uses `fetch` with no auth headers
  - resolves URLs under `/api/v1` using existing base URL resolver
  - sets `Content-Type: application/json` only for JSON bodies
  - parses JSON when content-type is JSON; otherwise falls back to text/null
  - throws `new ApiError(response.status, payload)` on non-2xx
- Typed `ApiError` is in `frontend/src/lib/api/errors.ts` with:
  - `status: number`
  - `body: unknown`
- `getErrorMessage(...)` in `frontend/src/lib/api/errors.ts` prefers `ApiError.body.detail` and deterministically stringifies structured details (preserving backend `{"detail": ...}` semantics).

### Global mutation error toast baseline confirmed
- React Query global toast wiring is in `frontend/src/app/queryClient.ts` using `MutationCache.onError`.
- Error messaging is sourced from `getErrorMessage(error)` and shown with destructive toast style:
  - `title: "Something went wrong"`
  - `description: <resolved error message>`
- `frontend/src/app/providers.tsx` mounts shared `queryClient` and `Toaster` globally.

### Verification run
- `cd frontend && npm run lint` (pass)
- `cd frontend && npm run typecheck` (pass)
- `cd frontend && npm run build` (pass)

## 2026-02-17 20:47 GMT - Version Builder screen with section autosave and draft-only editing

### What was built
- Added `frontend/src/routes/VersionBuilderPage.tsx` and routed `/projects/:projectId/versions/:versionId` to it in `frontend/src/app/router.tsx`.
- Replaced the base version placeholder route with the new builder while keeping downstream placeholder routes (`run`, `territory-review`, `generation-review`, `results`).
- Updated `frontend/src/routes/VersionPlaceholderPage.tsx` to support both old and new param names for route compatibility.
- Added builder UI:
  - breadcrumb row (`Projects -> [Project Name] -> vN`)
  - sticky header with version badge + Save + disabled Start Run
  - collapsible Brief / Creative Hotspots / Naming Dials sections (expanded by default)
  - desktop-only builder (mobile shows `Best viewed on desktop.`)
  - loading skeleton blocks for 3 sections

### Autosave + save strategy
- Added debounced autosave at 1.5s idle after edits.
- Added section-level blur save via `onBlurCapture` when focus leaves a section.
- Added explicit Save button that saves all dirty sections sequentially.
- Added best-effort unmount flush and `beforeunload` native confirmation when dirty.

### Section-only PATCH enforcement
- Every save call sends exactly one top-level key per PATCH:
  - `{ brief: ... }` OR `{ hotspots: ... }` OR `{ dials: ... }`
- Multi-section saves are executed sequentially as separate PATCH requests.

### Error handling behavior
- 409 conflict on save:
  - destructive toast shown
  - builder switches to read-only mode immediately (inputs/autosave/save disabled)
- 422 validation:
  - parses FastAPI-style `detail` arrays when present
  - maps to field-level keys where possible and section-level errors otherwise
  - keeps retryable save toast behavior

### Query/mutation updates used by builder
- `frontend/src/features/versions/queries.ts`:
  - added alias export `useVersionDetailQuery`
  - `usePatchVersionMutation` now suppresses global error toasts so builder can own inline + retry UX

### Notes / follow-ups
- Reordering for differentiators and hotspots is implemented via keyboard-focusable `Up`/`Down` buttons only (no drag-and-drop).
- Inline 422 mapping is best-effort based on backend `loc` paths; unknown paths fall back to section-level messaging.

### Verification run
- `cd frontend && npm run lint` (pass)
- `cd frontend && npm run typecheck` (pass)
- `cd frontend && npm run build` (pass)

## 2026-02-17 20:36 GMT - Project Detail versions region with create/edit/fork actions

### What was built
- Replaced the Project Detail Versions placeholder with a data-backed section in `frontend/src/features/versions/components/ProjectVersionsSection.tsx`, mounted from `frontend/src/routes/ProjectDetailPage.tsx`.
- Added empty state copy exactly: `No versions yet. Create your first version to start naming.` with `New Version` CTA.
- Added populated versions table rows with:
  - `v{version_number}`
  - state badge (`Draft` for `draft`, otherwise outline badge with raw state)
  - formatted created date (`formatDateTime`)
  - summary snippet fallback to `Untitled`
- Added row actions:
  - `Edit` -> navigates to `/projects/:projectId/versions/:versionId`
  - `Fork` -> `POST /api/v1/versions/{version_id}/fork`, success toast + navigation to new version, failure destructive toast

### Endpoints used
- `GET /api/v1/projects/{project_id}/versions`
- `POST /api/v1/projects/{project_id}/versions`
- `POST /api/v1/versions/{version_id}/fork`

### Query keys/hooks used
- `projectVersionsQueryKey(projectId)`
- `versionDetailQueryKey(versionId)`
- `useProjectVersionsQuery(projectId)`
- `useCreateBlankVersionMutation()`
- `useForkVersionMutation()`

### Optimistic create insertion notes
- Implemented in `frontend/src/features/versions/queries.ts`:
  - `onMutate`: cancel list query, snapshot previous list, insert optimistic draft row at top using client id
  - optimistic id matching in `onSuccess` replaces optimistic row with server row
  - `onError` restores snapshot
  - `onSettled` invalidates exact project versions list key for canonical reconciliation

### Notes / limitations
- List order in UI is rendered as returned by the API (no client sort controls).
- Optimistic rows use a fallback label (`v-`) when version number cannot be inferred safely from cache.

### Verification run
- `cd frontend && npm run lint` (pass)
- `cd frontend && npm run typecheck` (pass)
- `cd frontend && npm run build` (pass)

## 2026-02-17 17:53 GMT - Versions API single-source layer + TanStack Query cache hooks

### Files added/modified
- Added `frontend/src/lib/api/versions.ts`
- Added `frontend/src/features/versions/queries.ts`
- Updated `frontend/src/lib/api/index.ts` (barrel re-exports)

### API functions exported
- `listProjectVersions(projectId)` -> `GET /api/v1/projects/{project_id}/versions`
- `createBlankVersion(projectId)` -> `POST /api/v1/projects/{project_id}/versions`
- `getVersionById(versionId)` -> `GET /api/v1/versions/{version_id}`
- `patchVersion(versionId, payload)` -> `PATCH /api/v1/versions/{version_id}`
- `forkVersion(versionId)` -> `POST /api/v1/versions/{version_id}/fork`

### API typing + error behavior
- Added typed API models:
  - `ProjectVersionListItem` (list row contract)
  - `VersionDetail` (full detail contract)
  - `PatchVersionPayload` (`brief?`, `hotspots?`, `dials?` only)
- All IDs remain `string` (UUID) and timestamps remain `string` (ISO 8601).
- API requests use existing shared `request(...)` wrapper and preserve existing `ApiError` behavior:
  - non-2xx throws typed `ApiError` with `status` and parsed `body`
  - backend `detail` payloads, including structured 422 validation detail, are not swallowed or remapped away.

### Query hooks/mutations exported
- Query keys:
  - `projectVersionsQueryKey(projectId)`
  - `versionDetailQueryKey(versionId)`
- Query hooks:
  - `useProjectVersions(projectId: string | undefined)` (disabled when id is undefined; sorted newest-first by `version_number DESC` via copied array sort)
  - `useVersion(versionId: string | undefined)` (disabled when id is undefined)
- Mutation hooks:
  - `useCreateBlankVersionMutation()`
  - `usePatchVersionMutation()`
  - `useForkVersionMutation()`

### Cache update/invalidation strategy
- `create`/`fork` on success:
  - seed version detail cache (`versionDetailQueryKey(newVersion.id)`)
  - upsert target project list cache (`projectVersionsQueryKey(projectId)`)
  - invalidate that exact project list key to reconcile server-derived fields (like snippet/timestamps) without broad invalidation
- `patch`:
  - optimistic update of version detail cache for provided section fields only (`brief`/`hotspots`/`dials`) with rollback snapshot on error
  - on success, replace detail cache with server response
  - update matching row metadata in project list cache and invalidate exact project list key for canonical reconciliation

### Notes / follow-ups
- Mutation hooks intentionally do not catch/transform errors; callers can inspect `status === 409` and `status === 422` from the propagated `ApiError`.
- List `summary_snippet` after patch is reconciled via targeted list invalidation because snippet derivation is server-owned.

### Verification run
- `cd frontend && npm run lint` (pass)
- `cd frontend && npm run typecheck` (pass)
- `cd frontend && npm run build` (pass)

## 2026-02-17 22:31 GMT - Typed runs API layer, SSE progress hook, and stage metadata

### Summary of files added/changed
- Added `frontend/src/lib/api/runs.types.ts` with typed run models (`RunSummaryResponse`, `StageCheckpointResponse`, `RunStatusResponse`), `CancelRunResponse`, and discriminated `SSEEvent` union keyed by `event_type`.
- Added `frontend/src/lib/api/runs.ts` with run endpoints:
  - `startRun` (`POST /api/v1/versions/{version_id}/runs/start`)
  - `getRunStatus` (`GET /api/v1/runs/{run_id}/status`)
  - `cancelRun` (`POST /api/v1/runs/{run_id}/cancel`)
  - `retryRun` (`POST /api/v1/runs/{run_id}/retry`)
  - `createRunProgressEventSource` (`GET /api/v1/runs/{run_id}/progress/stream`)
  - plus `parseSseEventData` runtime parser for typed SSE events.
- Added `frontend/src/features/runs/useRunProgress.ts` with:
  - SSE connection lifecycle
  - reconnect backoff (1s, 2s, 4s; capped at 10s)
  - fallback polling every 5s after 3 reconnect failures
  - terminal-state shutdown (`complete` / `failed`)
  - cleanup for EventSource/timers on unmount, disable, and run switch.
- Added `frontend/src/features/runs/stageMetadata.ts` with 12-stage metadata, phase groupings (0-1, 2-8, 9-11), and gate definitions after stages 1 and 8.
- Updated API barrel exports in `frontend/src/lib/api/index.ts` to include runs functions/types.

### SSE contract confirmation and implementation notes
- Backend inspected directly in `Naming_BE`:
  - `api/v1/runs.py` emits SSE lines as `event: {event_type}` and `data: {payload_json}`.
  - Route sends `snapshot` as full `RunStatusResponse` payload.
  - Non-snapshot events forward `event.data` from orchestrator (e.g. `{ run_id, stage_id, progress_pct }`) without an envelope.
- Observed behavior: the backend does **not** currently include `timestamp` in the SSE `data:` payload emitted to clients, even though backend internal bus events include a timestamp field.
- Frontend handling:
  - parser matches emitted payload shapes exactly per event type.
  - `SSEEvent.timestamp` in frontend typings is normalized to client receive time (`new Date().toISOString()`) to keep a consistent event object for consumers.

### Commands run
- `cd frontend && npm run lint` (pass)
- `cd frontend && npm run typecheck` (pass)
- `cd frontend && npm run build` (pass)

### Commit/push
- Commit created on `main` and pushed to `origin/main`:
  - `feat(frontend): add typed run api + sse hook with polling fallback`

## 2026-02-17 22:48 GMT - Run Monitor page with live timeline, gates, and cancel/retry actions

### Summary of files added/changed
- Added `frontend/src/routes/RunMonitorPage.tsx` and routed `/projects/:projectId/versions/:versionId/run` to it in `frontend/src/app/router.tsx`.
- Added desktop-only Run Monitor UI with:
  - header breadcrumb/version badge/run-state badge/elapsed timer/connection indicator
  - phase-grouped timeline for stages 0-11 with gate rows after stages 1 and 8
  - stage status icons, running progress bars, completed summaries + durations, failed error expansion
  - fixed bottom RunActionBar with cancel confirmation dialog, conditional retry action, and back link.
- Added `frontend/src/components/ui/progress.tsx` (shadcn-style Progress primitive) and installed `@radix-ui/react-progress`.
- Installed `framer-motion` and added `AnimatePresence` + `layout` transitions (<300ms) for stage/gate updates.
- Updated runs scaffolding:
  - `frontend/src/lib/api/runs.types.ts` and `frontend/src/lib/api/runs.ts` now normalize run payloads into typed stage numbers (`stage_id`, `current_stage`) and nullable `progress`.
  - `frontend/src/features/runs/useRunProgress.ts` now supports SSE rejoin attempts while in polling fallback and restart via `start()` (used after retry).
- Updated run stage metadata/phase headers in `frontend/src/features/runs/stageMetadata.ts` to include phase header copy used by the monitor.
- Updated `frontend/src/lib/api/versions.ts` `VersionDetail` to include `latest_run_id: string | null` for run lookup.

### Deviations / assumptions
- Backend currently emits stage ids and `current_stage` as strings in some payloads (`"0".."11"`); frontend run API layer now safely normalizes both string and number stage values into numeric frontend types for consistent rendering.
- Backend SSE `data:` does not include a timestamp field; monitor uses the hook event timestamp normalization from the existing runs parser.
- `error_detail` parsing for failed stage details uses safe JSON parse with fallback priority:
  1) failed stage summary (includes SSE `stage_failed` error when present)
  2) parsed `run.error_detail`
  3) generic fallback message.

### Commands run
- `cd frontend && npm run lint` (pass)
- `cd frontend && npm run typecheck` (pass)
- `cd frontend && npm run build` (pass)

## 2026-02-17 22:56 GMT - Run Monitor routing/navigation integration pass

### Route exposure
- Confirmed Run Monitor route is exposed at exactly:
  - `/projects/:projectId/versions/:versionId/run`
- Route remains registered in `frontend/src/app/router.tsx` and maps to `RunMonitorPage` without colliding with version builder or placeholder routes.

### Files changed
- `frontend/src/routes/RunMonitorPage.tsx`
- `overdrive/phase_0_fe_log.md`

### Navigation alignment updates
- Standardized breadcrumb labels to existing app pattern (`Dashboard` as root breadcrumb label).
- Ensured Run Monitor breadcrumb trail uses:
  - `Dashboard` -> `/projects`
  - `[Project Name]` -> `/projects/:projectId`
  - `vN` (or fallback version label) -> `/projects/:projectId/versions/:versionId`
  - `Run` (current page, no link)
- Updated the bottom back-link copy to `Back to Version Builder` and confirmed destination remains `/projects/:projectId/versions/:versionId`.
- Added minimal missing-param breadcrumb context in the missing-param error state (`Dashboard` -> `Run`) with existing fallback link to `/projects`.

### Quick verification steps
- Route path + matching order verified in `frontend/src/app/router.tsx` against existing version routes.
- Started dev server (`cd frontend && npm run dev -- --host 127.0.0.1 --port 4173`); Vite served successfully on `http://127.0.0.1:4174/` after automatic port fallback.
- Browser-level clicking/navigation of URLs was not executable inside this sandbox environment.

### Commands run
- `cd frontend && npm run lint` (pass)
- `cd frontend && npm run typecheck` (pass)
- `cd frontend && npm run build` (pass)

## 2026-02-17 23:02 GMT - Version Builder Start Run interaction + active-run gating

### Summary of changes
- Added run query/mutation helpers in `frontend/src/features/runs/queries.ts`:
  - `useRunStatusQuery(runId)` using `GET /api/v1/runs/{run_id}/status` with 5s polling while non-terminal.
  - `useStartRunMutation()` using `POST /api/v1/versions/{id}/runs/start`.
  - `runStatusQueryKey(...)` + terminal-state helper.
- Updated `frontend/src/routes/VersionBuilderPage.tsx` Start Run behavior:
  - Computes `isStartRunReady` from existing builder validators (`validateBrief`, `validateHotspots`, `validateDials`) plus explicit minimums (`hotspots >= 2`, `differentiators >= 3`).
  - Detects active run via `version.latest_run_id` + `useRunStatusQuery`; treats non-terminal run states as active.
  - Start Run button enabled only when:
    - `version.state === 'draft'`
    - brief completeness check passes
    - no active run
    - not already saving / starting
  - While active run exists, Start Run is disabled with label `Running...` and a `View Run Monitor` link is shown.
- Start Run click flow now:
  - Flushes current dirty autosave state first via existing `saveDirtySections(..., 'manual')`.
  - Calls start-run endpoint (no request body by default).
  - On success (201) navigates to `/projects/:projectId/versions/:versionId/run`.
  - On 422 shows exact toast: `Cannot start run: brief is incomplete`.
  - On 409 shows conflict toast (backend detail when available).
- Query invalidation after successful start-run:
  - Version detail query
  - Project detail query
  - Project versions list query
  - Run status cache key(s) for latest/new run ids

### Files changed
- `frontend/src/features/runs/queries.ts`
- `frontend/src/routes/VersionBuilderPage.tsx`
- `overdrive/phase_0_fe_log.md`

### Commands run
- `cd frontend && npm run lint` (pass)
- `cd frontend && npm run typecheck` (pass)
- `cd frontend && npm run build` (pass)

## 2026-02-17 23:08 GMT - Reactive Project Detail version badges (invalidation + conditional polling)

### Summary of changes
- Added conditional polling support in `useProjectVersionsQuery(projectId)` (`frontend/src/features/versions/queries.ts`):
  - Introduced `isActiveVersionState(state)` helper for active states:
    - `phase_1_running`, `territory_review`, `phase_2_running`, `generation_review`, `phase_3_running`
  - `refetchInterval` now polls every 5s only when any returned version is in an active state.
  - Polling stops (`false`) when all versions are terminal (`draft`, `complete`, `failed`) or list is empty.
- Added versions-list invalidation on run mutations in `frontend/src/features/runs/queries.ts`:
  - Added shared `projectVersionsQueryKeyPrefix` usage for broader invalidation when project id is unknown.
  - `useStartRunMutation` continues invalidating the exact project versions list.
  - Added `useCancelRunMutation` and `useRetryRunMutation` hooks that invalidate project versions list + related detail/status keys on success.
- Updated Run Monitor to use shared run mutation hooks (`frontend/src/routes/RunMonitorPage.tsx`) so cancel/retry now participate in centralized versions-list invalidation behavior.
- Updated Project Detail version state badge mapping (`frontend/src/features/versions/components/ProjectVersionsSection.tsx`) with explicit labels/variants for:
  - `draft`
  - `phase_1_running`
  - `territory_review`
  - `phase_2_running`
  - `generation_review`
  - `phase_3_running`
  - `complete`
  - `failed`

### Files modified
- `frontend/src/features/versions/queries.ts`
- `frontend/src/features/runs/queries.ts`
- `frontend/src/features/versions/components/ProjectVersionsSection.tsx`
- `frontend/src/routes/RunMonitorPage.tsx`
- `overdrive/phase_0_fe_log.md`

### Commands run
- `cd frontend && npm run lint` (pass)
- `cd frontend && npm run typecheck` (pass)
- `cd frontend && npm run build` (pass)

## 2026-02-18 00:22 GMT - Phase 4 Run Monitor UX: stage progress, gate pause messaging, and failure retry detail

### Files changed
- `frontend/src/lib/api/runs.types.ts`
- `frontend/src/lib/api/runs.ts`
- `frontend/src/features/runs/useRunProgress.ts`
- `frontend/src/features/runs/stageMetadata.ts`
- `frontend/src/routes/RunMonitorPage.tsx`
- `overdrive/phase_0_fe_log.md`

### Summary of changes
- Extended existing `stage_progress` event parsing/typing to accept optional `summary` while keeping the same SSE event types/protocol.
- Updated `useRunProgress` to apply `stage_progress.summary` and `progress_pct` directly to the matching stage checkpoint (no new event types).
- Updated Stage 0/1 labels in stage metadata to user-facing names aligned to this phase (`Research Snapshot`, `Territory Card Generation`).
- Reworked Run Monitor rendering to show clearer per-stage progress details:
  - progress bar + percentage for non-pending stages
  - elapsed time per stage for running/completed/failed states
  - stage summary text surfaced on running/completed/failed rows when available
- Added an `Active stage summary` region that reflects the current running stage and live checkpoint `summary` updates (including Stage 1 `Generated X/Y ...` updates when emitted).
- Added explicit gate pause messaging when `run_state === 'territory_review'`:
  - `Gate reached: Territory Review`
  - run paused notice indicating review UI lands in Phase 5.
- Added a dedicated failure detail region for failed runs/stages:
  - clear failed heading
  - error detail text in read-only textarea
  - retry action using existing `useRetryRunMutation` semantics.
- Kept cancel behavior unchanged for active runs, reusing the existing cancel mutation/action bar flow.

### Verification performed
- Static behavior verification against reducer/UI logic paths:
  - Stage 0/1 progress bars now consume checkpoint `progress_pct` and render percent text.
  - Stage 1 active summary now consumes checkpoint `summary` from `stage_progress` events.
  - Territory gate pause card is conditionally rendered only at `territory_review` state.
  - Failure region uses existing run/stage error data and existing retry mutation wiring.
- Build checks executed:
  - `cd frontend && npm run lint` (pass)
  - `cd frontend && npm run typecheck` (pass)
  - `cd frontend && npm run build` (pass)

### Manual test steps / limitations
- Browser/backend SSE end-to-end observation (including live Stage 0 50->100 updates, Stage 1 per-card increments, and post-failure retry progression) was not fully executable inside this sandbox session because a live backend + interactive browser run were not available here.
- Elapsed time display precision depends on available `started_at` / `completed_at` timestamps from run checkpoints and updates every second while non-terminal.

## 2026-02-18 01:14 GMT - Territory Review route and desktop layout shell placeholder

### What was added/changed
- Added `frontend/src/routes/TerritoryReviewPage.tsx` as a presentational Territory Review shell (no API/query/mutation usage).
- Wired `/projects/:projectId/versions/:versionId/territory-review` to `TerritoryReviewPage` in `frontend/src/app/router.tsx` (replacing the generic placeholder for this route only).

### Desktop-only behavior
- `<lg`: renders breadcrumb + a `Desktop only` card message.
- `lg+`: renders a split-pane shell with:
  - left `Research Snapshot` panel (session-local collapse toggle, independent scroll area)
  - right `Territory Cards` panel (placeholder card stack with disabled action controls)
  - sticky bottom action bar with disabled `Add New Card` and `Confirm & Proceed` buttons.

### Manual verification steps
- Ran:
  - `cd frontend && npm run lint`
  - `cd frontend && npm run typecheck`
  - `cd frontend && npm run build`
- Route checks to perform in browser:
  - `http://127.0.0.1:<port>/projects/123/versions/456/territory-review`
  - Confirm desktop (`>=1024px`) shows header badges + split panes + sticky action region.
  - Confirm tablet/mobile (`<1024px`) shows desktop-only fallback card.

## 2026-02-18 12:49 GMT - Territory Review FE data-access layer + minimal route wiring

### Files added
- `frontend/src/lib/api/territoryReview.types.ts`
- `frontend/src/lib/api/territoryReview.ts`
- `frontend/src/lib/api/territoryReview.errors.ts`
- `frontend/src/features/territoryReview/queries.ts`

### Files updated
- `frontend/src/lib/api/index.ts`
- `frontend/src/routes/TerritoryReviewPage.tsx`

### Backend contract alignment (read from Naming_BE)
- Routes matched exactly from backend routers:
  - `GET /api/v1/runs/{run_id}/research-snapshot`
  - `GET /api/v1/runs/{run_id}/territory-cards`
  - `PATCH /api/v1/territory-cards/{card_id}` with body `{ status?, card_data? }`
  - `POST /api/v1/runs/{run_id}/territory-cards/revise` with body `{ card_id, revision_prompt }`
  - `POST /api/v1/runs/{run_id}/territory-cards/add` with body `{ prompt }`
  - `POST /api/v1/runs/{run_id}/territory-cards/confirm` returning `{ approved_count }`
- Typed FE models mirror backend schemas for `ToneFingerprint`, `TerritoryCardData`, territory card list/patch response payloads, and `ResearchSnapshot`.
- Patch request typing enforces “at least one of `status` or `card_data`” using a discriminated union.

### Query keys and hook layer
- Added Territory Review query keys scoped by run:
  - `territoryReviewResearchSnapshotQueryKey(runId)`
  - `territoryReviewCardsQueryKey(runId)`
- Added hooks:
  - `useResearchSnapshot(runId)`
  - `useTerritoryCards(runId)`
  - `usePatchTerritoryCardMutation(runId)`
  - `useReviseTerritoryCardMutation(runId)`
  - `useAddTerritoryCardMutation(runId)`
  - `useConfirmTerritoryCardsMutation(runId)`

### Mutation/cache strategy decisions
- `patch` uses optimistic list updates with rollback on error.
- `patch` success merges server response into cached list row and then invalidates exact cards list key for canonical reconciliation.
- `revise` and `add` do not optimistically modify `card_data` (LLM latency expected); they wait for server and then invalidate/refetch cards list.
- `confirm` invalidates cards + research snapshot queries for the run on success.
- All Territory Review query/mutation hooks set `meta.suppressGlobalErrorToast = true` so route-level error rendering can own messaging.

### Per-card loading implementation
- Per-card pending states for `patch` and `revise` are exposed from hooks via:
  - mutation keys scoped by run id
  - `useMutationState(... status: 'pending' ...)`
  - returned helper: `isCardPending(cardId)`

### Territory-specific error parsing
- Added `parseTerritoryReviewError(error)` returning typed output:
  - `kind: 'conflict'` for HTTP 409 (state-gating/zero-approved cases)
  - `kind: 'invalid_llm_schema'` for HTTP 500 + exact detail:
    - `Territory card generation returned invalid data. Please retry.`
  - `kind: 'ai_unavailable'` for HTTP 502 + exact detail:
    - `AI service temporarily unavailable. Please retry.`
  - fallback `kind: 'unknown'`
- Parsed object preserves `status` and backend `detail` while reusing existing `getErrorMessage(...)` behavior.

### Route wiring details (`TerritoryReviewPage`)
- Replaced placeholder content with minimal data-access rendering only.
- Run resolution uses existing contract already present in FE:
  - `version.latest_run_id` from `useVersionDetailQuery(versionId)`
  - `useRunStatusQuery(latest_run_id)`
  - proceed only when `run.state === 'territory_review'`; otherwise render `No territory review run found`.
- Desktop gating behavior remains intact.
- Minimal output now includes loading states, parsed error blocks, cards count, and JSON dumps (`<pre>`) for research snapshot + territory cards.

### Commands run
- `cd frontend && npm run lint` (pass)
- `cd frontend && npm run typecheck` (pass)
- `cd frontend && npm run build` (pass)

### Deviations / follow-ups
- Backend `GET /runs/{run_id}/territory-cards` response schema currently exposes `status` (mapped from model `review_status`) and does **not** include card timestamps in the response model; FE types reflect the backend response model as implemented.
- Full Territory Review interaction UI (approve/reject/edit/revise/add/confirm controls) intentionally remains out of scope for this node; data-access hooks are in place for next phase UI work.

## 2026-02-18 13:01 GMT - Territory Review core shell: split layout + read-only snapshot renderer

### Files added
- `frontend/src/components/ui/skeleton.tsx`

### Files updated
- `frontend/src/routes/TerritoryReviewPage.tsx`

### Summary of UI changes
- Replaced debug-style Territory Review output with a desktop-only, two-region split shell:
  - Left panel (`~30%`): `Research Snapshot` (read-only)
  - Right panel (`~70%`): `Territory Cards` read-only list/grid
- Added session-local collapse behavior for the snapshot panel via React state (`useState`):
  - default expanded
  - `Collapse snapshot` / `Expand snapshot` toggle in header
  - when collapsed, cards region expands to full width
- Header now renders:
  - breadcrumbs: `Dashboard -> Project -> vN -> Territory Review`
  - version/run state badges from existing queries
  - badge skeleton placeholders during loading to avoid flashing unknown state labels

### Research Snapshot rendering
- Implemented structured, read-only sections (from existing `ResearchSnapshot` type):
  - `Competitive Clusters` as bullets
  - `Dominant Patterns` with `Prefixes` and `Suffixes` sublists
  - `Crowded Terms to Avoid` as chips/badges
  - `Whitespace Hypotheses` as numbered list with rationale (and risk when present)
- Empty/missing section data now renders `None found.` placeholders instead of hiding sections.

### Loading / error / retry behavior
- Added panel-level loading skeletons:
  - left panel snapshot skeleton blocks
  - right panel territory card skeleton cards
- Added inline panel-level error cards with retry buttons:
  - `Couldn’t load research snapshot` + `refetch()`
  - `Couldn’t load territory cards` + `refetch()`
- Error copy uses existing parsing helpers (`parseTerritoryReviewError` + message fallback via `getErrorMessage`).
- Removed raw JSON debug dumps from main UI; only concise user-facing output remains.

### Cards region (read-only)
- Added cards header with count badge.
- Rendered read-only territory cards in a responsive grid:
  - source label (`User-added` when `source_hotspot_id` is `null`; otherwise `Hotspot card <id>`)
  - status badge (`pending` / `approved` / `rejected`)
  - compact `card_data` preview (`metaphor_fields`, `imagery_nouns`, `action_verbs`, tone fingerprint)

### Commands run
- `cd frontend && npm run lint` (pass)
- `cd frontend && npm run typecheck` (pass)
- `cd frontend && npm run build` (pass)

## 2026-02-18 13:13 GMT - Territory Review status-only card grid/actions (approve/reject/restore)

### Files added
- `frontend/src/features/territoryReview/components/TerritoryCardStatusBadge.tsx`
- `frontend/src/features/territoryReview/components/TerritoryCard.tsx`
- `frontend/src/features/territoryReview/components/TerritoryCardList.tsx`

### Files updated
- `frontend/src/features/territoryReview/queries.ts`
- `frontend/src/routes/TerritoryReviewPage.tsx`

### Summary
- Replaced the prior read-only card preview with a dedicated Territory Review card grid/list component stack.
- Added per-card status badge with strong color coding:
  - Pending (amber)
  - Approved (green)
  - Rejected (red)
- Added status-only action strip per card:
  - Pending: `Approve`, `Reject`
  - Approved: `Reject`
  - Rejected: `Restore` (sets status to `pending`)
- Added rejected-card visual de-emphasis (muted background/text + lower opacity) while keeping content readable.
- Expanded dense read-only body rendering for all card data fields:
  - `metaphor_fields`
  - `imagery_nouns`
  - `action_verbs`
  - `tone_fingerprint` (compact 1-5 bar visualization)
  - `avoid_list`
  - `naming_style_rules`

### Query/mutation behavior notes
- Added `usePatchTerritoryCardStatusMutation(runId)` in `frontend/src/features/territoryReview/queries.ts` as a status-only wrapper over the existing patch mutation.
- Status changes are optimistic via existing mutation lifecycle:
  - immediate local status update in cache (`onMutate`)
  - rollback on error (`onError`)
  - invalidate/refetch on settle (`onSettled`)
- Page now wires status actions through this hook and disables card action buttons while that card is pending (`isCardPending`) to prevent double taps.
- On mutation failure, a destructive toast is shown using parsed territory-review error semantics (including 409 conflict messaging).

### Commands run
- `cd frontend && npm run lint` (pass)
- `cd frontend && npm run typecheck` (pass)
- `cd frontend && npm run build` (pass)

## 2026-02-18 13:25 GMT - Territory Review human override edit mode (full card_data inline edit)

### Files added
- None

### Files updated
- `frontend/src/features/territoryReview/components/TerritoryCard.tsx`
- `frontend/src/features/territoryReview/components/TerritoryCardList.tsx`
- `frontend/src/features/territoryReview/queries.ts`
- `frontend/src/routes/TerritoryReviewPage.tsx`

### Summary
- Added inline **Edit** mode per territory card for full `TerritoryCardData` human override path.
- Edit mode now supports all fields:
  - `metaphor_fields`, `imagery_nouns`, `action_verbs`, `avoid_list`, `naming_style_rules` via dense Textareas (one item per line)
  - `tone_fingerprint.playful|modern|premium|bold` via 1-5 Sliders
- Added `Save` and `Cancel` controls in edit mode:
  - `Save` sends PATCH with `{ card_data: ... }`
  - `Cancel` discards local draft and exits edit mode with no request
- Non-edit status-only actions (approve/reject/restore) remain intact.

### Draft representation + conversion
- Card-local typed draft state in `TerritoryCard.tsx`:
  - list fields stored as newline-delimited strings
  - tone fingerprint stored as typed slider values
- Deterministic conversion on save:
  - `split('\n') -> trim -> filter(Boolean)` for list fields
  - slider values clamped/rounded to integer range 1..5
  - output shape strictly matches `TerritoryCardData`

### Error handling and draft preservation
- Save errors (422/409/other) show destructive toast using existing territory-review error parsing.
- On save failure:
  - card remains in edit mode
  - user draft is preserved for retry
- Draft is only discarded on explicit `Cancel` (or replaced after successful save flow and re-entry).

### Query/cache behavior
- Extended patch wrapper hook with `mutateCardData(...)`:
  - `frontend/src/features/territoryReview/queries.ts`
- Reuses existing optimistic patch flow:
  - immediate optimistic card update (`onMutate`)
  - rollback on error (`onError`)
  - invalidate/refetch on settle (`onSettled`)
- For human override optimistic behavior, local patch logic now treats `card_data` patch as approved status (`status: approved`) to align with backend semantics.

### Commands run
- `cd frontend && npm run lint` (pass)
- `cd frontend && npm run typecheck` (pass)
- `cd frontend && npm run build` (pass)

## 2026-02-18 13:46 GMT - Territory Review LLM revise/add workflows with latency UX + retry handling

### Files updated
- `frontend/src/features/territoryReview/components/TerritoryCard.tsx`
- `frontend/src/features/territoryReview/components/TerritoryCardList.tsx`
- `frontend/src/features/territoryReview/queries.ts`
- `frontend/src/lib/api/territoryReview.errors.ts`
- `frontend/src/routes/TerritoryReviewPage.tsx`

### Summary of UI additions
- Added card-scoped `Prompt to Revise` dialog in `TerritoryCard`:
  - multiline prompt input
  - per-card loading overlay (`Revising territory card...`) during LLM round-trip
  - prompt text is preserved on failure for retry
  - dialog closes/reset only on successful revise
- Added board-level `Add New Card` modal in `TerritoryReviewPage`:
  - collects user prompt via textarea
  - while request is pending, modal remains open and shows `Generating territory card...` with spinner
  - close/cancel interactions are blocked during in-flight generation
  - inline modal error is shown on failure and prompt remains intact for retry
- Added card entrance animation for append events using Framer Motion in `TerritoryCardList` (`AnimatePresence` + `motion.div` with mount fade/slide).
- Added UI-only soft cap at 10 cards:
  - `Add New Card` is disabled when `cards.length >= 10`
  - button `title` + helper text explain cap: `Card limit reached (10). Remove/reject cards before adding more.`

### API endpoints invoked
- `POST /api/v1/runs/{run_id}/territory-cards/revise`
- `POST /api/v1/runs/{run_id}/territory-cards/add`

### 500 vs 502 error differentiation
- Updated `parseTerritoryReviewError(...)` in `frontend/src/lib/api/territoryReview.errors.ts` to classify by HTTP status:
  - `500` -> `invalid_llm_schema` with message `Territory card generation returned invalid data. Please retry.`
  - `502` -> `ai_unavailable` with message `AI service temporarily unavailable. Please retry.`
- Route-level revise/add handlers now surface those exact messages in destructive toasts.

### Cache update / invalidation strategy (non-optimistic)
- `useReviseTerritoryCardMutation(runId)`:
  - no optimistic `onMutate`
  - on success: replace only the matching card in `territoryReviewCardsQueryKey(runId)` via `queryClient.setQueryData`
  - then invalidate exact cards query key for canonical reconciliation
- `useAddTerritoryCardMutation(runId)`:
  - no optimistic `onMutate`
  - on success: append server-returned card to the end of cached cards list via `queryClient.setQueryData`
  - then invalidate exact cards query key for canonical reconciliation

### Manual QA / verification
- Executed:
  - `cd frontend && npm run lint` (pass)
  - `cd frontend && npm run typecheck` (pass)
  - `cd frontend && npm run build` (pass)
- Browser click-path QA was not executable in this sandbox session (no interactive browser/backend run loop available here).
- Local click paths to verify:
  - Territory Review -> card `Prompt to Revise` -> submit prompt -> confirm per-card overlay while pending -> verify card updates on success / prompt persists on failure.
  - Territory Review -> `Add New Card` -> submit prompt -> confirm modal stays open with `Generating territory card...` -> verify appended `User-added` card animates in on success.
  - With 10+ cards loaded, verify `Add New Card` is disabled with cap messaging.

## 2026-02-18 13:57 GMT - Territory Review confirm gate (Confirm & Proceed bar + dialog + mutation flow)

### Files added
- `frontend/src/components/ui/tooltip.tsx`
- `frontend/src/features/territoryReview/cardLabels.ts`

### Files updated
- `frontend/src/routes/TerritoryReviewPage.tsx`
- `frontend/src/features/territoryReview/queries.ts`
- `frontend/src/features/territoryReview/components/TerritoryCard.tsx`
- `frontend/package.json`
- `frontend/package-lock.json`

### Summary of changes
- Added a persistent sticky footer ConfirmBar to Territory Review with:
  - primary action: `Confirm & Proceed`
  - live status summary: `N approved • M rejected • K pending`
- Implemented disabled-gate behavior for confirm action:
  - button stays disabled until at least one approved card exists
  - disabled-state tooltip text is exactly: `At least one card must be approved.`
- Added confirm dialog workflow:
  - copy: `Proceeding with N approved card(s). M card(s) rejected and will be excluded from generation. This cannot be undone.`
  - verification list of approved card sources
  - cancel + confirm actions with in-flight loading/disable state
- Wired confirm mutation submission to existing endpoint integration (`useConfirmTerritoryCardsMutation`) and route-level success flow:
  - calls `POST /api/v1/runs/{run_id}/territory-cards/confirm`
  - invalidates run + version + project + versions list queries
  - navigates to Run Monitor route: `/projects/:projectId/versions/:versionId/run`
- Failure behavior:
  - surfaces backend detail via destructive toast (including 409 state-gating / zero-approved detail)
  - keeps user on Territory Review; dialog remains open for retry.

### Query/mutation wiring notes
- Added a dedicated mutation key for confirm in `frontend/src/features/territoryReview/queries.ts`:
  - `['territory-review', 'confirm-cards', runId]`
- Confirm mutation still suppresses global error toasts and uses route-level toast handling for user messaging.

### Card source list derivation assumption
- Dialog approved-card list uses the same source-label logic as card headers via shared helper `getTerritoryCardSourceLabel(...)` in `frontend/src/features/territoryReview/cardLabels.ts`:
  - `User-added` when `source_hotspot_id` is `null`
  - otherwise `Hotspot: <source_hotspot_id>`.

### Commands run
- `cd frontend && npm install @radix-ui/react-tooltip`
- `cd frontend && npm run lint` (pass)
- `cd frontend && npm run typecheck` (pass)
- `cd frontend && npm run build` (pass)

### Manual verification performed in this environment
- Verified compile/static behavior for:
  - sticky ConfirmBar rendering path and disabled/enabled state conditions
  - confirm dialog copy interpolation and approved-card source list binding
  - confirm mutation loading guard (disabled actions + blocked close interactions while pending)
  - success path query invalidation + Run Monitor navigation callsite
  - error path destructive toast using backend detail message.
- Browser click validation remains to run locally with backend:
  - 0 approved -> disabled confirm + tooltip text
  - >=1 approved -> dialog opens with counts/list
  - confirm success -> navigation to `/projects/:projectId/versions/:versionId/run`
  - confirm 409 -> destructive toast with backend detail.

## 2026-02-18 14:09 GMT - Persistent Territory Review discoverability in Run Monitor + Version Builder

### What changed
- Added a persistent Run Monitor gate card CTA when `run.state === 'territory_review'`:
  - CTA label: `Review Territory Cards`
  - route target: `/projects/:projectId/versions/:versionId/territory-review`
- Added a Version Builder banner when the latest run is gated in `territory_review`:
  - waiting-state copy + clear CTA to Territory Review
  - CTA label: `Review Territory Cards`
- Kept visibility logic fully run-state-driven from existing data sources:
  - Run Monitor uses `runStatus.state` from `useRunProgress`
  - Version Builder uses `runStatusQuery.data?.state` from existing `useRunStatusQuery`
- No SSE/polling behavior changes were made.

### Files touched
- `frontend/src/routes/RunMonitorPage.tsx`
- `frontend/src/routes/VersionBuilderPage.tsx`

### Route/path confirmation
- Verified Territory Review route remains registered as:
  - `/projects/:projectId/versions/:versionId/territory-review`
  - (`frontend/src/app/router.tsx`)
- Verified both new entry points link to that exact path.

### Persistence verification
- Code-path verification performed:
  - CTA/banner rendering is now a pure function of fetched run state `territory_review` (not transient gate event flags).
  - This ensures visibility persists across navigation away/back and refresh while backend state remains gated.
- Local browser persistence checks to run with live backend:
  1) Open Run Monitor during `territory_review`, confirm gate card visible, click CTA to Territory Review.
  2) Navigate away from Run Monitor and return; confirm gate card still visible.
  3) Refresh Run Monitor; confirm gate card still visible.
  4) Open Version Builder; confirm banner appears while run is `territory_review`.
  5) After Confirm & Proceed advances run state, verify gate card/banner disappear.

### Commands run
- `cd frontend && npm run lint` (pass)
- `cd frontend && npm run typecheck` (pass)
- `cd frontend && npm run build` (pass)

## 2026-02-18 19:14 GMT - Run Monitor Stage 2/3 SSE progress + summary alignment

### Files changed
- `frontend/src/features/runs/stageMetadata.ts`
- `frontend/src/features/runs/useRunProgress.ts`
- `frontend/src/routes/RunMonitorPage.tsx`

### What changed
- Updated stage label mapping for stage IDs 2 and 3:
  - `2` -> `Generating candidates...`
  - `3` -> `Cleaning & deduplicating...`
- Extended `getStageLabel(...)` normalization so string stage ids like `"2"`/`"stage_2"` resolve correctly.
- Fixed SSE stage update handling in `useRunProgress` so `stage_started` / `stage_progress` / `stage_completed` upsert missing stage checkpoints instead of only updating pre-existing entries.
  - This ensures Stage 2/3 rows update even if backend status snapshots initially omit those checkpoints.
- Updated Run Monitor active-stage summary card to display live stage percent (`progress_pct`) plus SSE summary text (with existing fallback copy preserved when summary is empty).

### Edge cases handled
- Stage 3 fast transitions (including effective 0 -> 100 jumps) now render cleanly:
  - progress values are clamped before render
  - missing checkpoint rows are synthesized/upserted before update application
  - no `NaN`/undefined progress values are passed to the active summary percent display.

### Verification
- Build/static verification:
  - `cd frontend && npm run lint` (pass)
  - `cd frontend && npm run typecheck` (pass)
  - `cd frontend && npm run build` (pass)
- Manual runtime verification to perform locally with backend SSE stream:
  - observe `stage_progress` for `stage_id: "2"` and `stage_id: "3"`
  - confirm stage list rows update percent + summary
  - confirm active-stage summary card reflects latest SSE summary + percent
  - confirm cancel / retry / failure flows remain unchanged.

## 2026-02-18 20:02 GMT - Version Builder partial PATCH payloads + Start Run 422 inline validation mapping

### Files changed
- `frontend/src/routes/VersionBuilderPage.tsx`

### What changed
- Updated Version Builder save serialization so section PATCH payloads include only user-entered data and omit placeholder/default enum values.
- For `brief` payloads:
  - `price_tier` is omitted when unselected.
  - `channel` is omitted when unselected.
  - text fields are still trimmed and sent as typed.
  - `differentiators` now sends non-empty trimmed items only.
- For `dials` payloads:
  - `format_mode` is omitted when unselected.
  - `trademark_posture` is omitted when unselected.
  - `social_checks` remains deduped and sent.
- For `hotspots` payloads:
  - placeholder-only rows are omitted from the request payload.
  - rows with any entered content still send `id`, trimmed text fields, and optional numeric `weight`.
- Kept save trigger mechanics unchanged (manual save button, section blur saves, and 1.5s autosave debounce).
- Updated Start Run 422 handling to parse backend validation detail and surface inline field/section errors in the form (instead of only toast copy):
  - maps parsed field errors into `serverFieldErrors`
  - maps section-level error into `serverSectionErrors`
  - auto-expands affected sections so users can immediately see/fix highlighted fields
  - shows `Cannot start run` toast with parsed summary/fallback copy

### Verification
- `cd frontend && npm run lint` (pass)
- `cd frontend && npm run typecheck` (pass)
- `cd frontend && npm run build` (pass)

### Manual verification to run locally
- On draft edits with unselected enum fields, click Save and confirm PATCH omits untouched enum keys.
- Edit only one section and confirm request contains only that top-level section key.
- Click Start Run with incomplete brief/hotspots/dials and confirm 422 produces inline field/section errors and expanded relevant section(s).

## 2026-02-18 20:27 GMT - Version Builder nested Brief payload mapping + 422 nested path remap

### Files changed
- `frontend/src/routes/VersionBuilderPage.tsx`

### What changed
- Fixed `buildPatchPayload('brief')` serialization to send a nested `brief` object shape compatible with backend `BriefPayload` expectations:
  - `brief.product.{ what_it_is, description }`
  - `brief.audience.{ target_market, audience_context, price_tier, channel, tone_sliders }`
  - `brief.differentiation.{ differentiators }`
  - `brief.constraints.{ no_go_words, must_avoid_implying }`
- Kept PATCH-permissive behavior by omitting empty/unchanged nested fields while preserving correct nested structure.
- Updated brief normalization to support both legacy flat saved payloads and nested payloads already stored in backend.
- Updated hotspots serialization to remain schema-compatible while omitting placeholder-only rows and empty per-row fields.
- Updated dials serialization to include backend key `domain_check: true` and keep optional enum omission behavior.
- Added nested validation path remapping for Start Run 422 responses so backend paths like:
  - `brief.product.what_it_is`
  - `brief.audience.tone.playful_serious`
  - `brief.differentiation.differentiators.0`
  map back to existing UI field keys (`brief.what_it_is`, `brief.playful_serious`, `brief.differentiators.0`) for inline display.

### Verification
- `cd frontend && npm run lint` (pass)
- `cd frontend && npm run typecheck` (pass)
- `cd frontend && npm run build` (pass)

### Manual verification to run locally
- Edit Brief only, save, and confirm payload is nested under top-level `brief` (no flat root brief fields).
- Start Run with intentionally invalid brief fields and confirm inline errors appear on the corresponding inputs via remapped nested 422 paths.

## 2026-02-18 21:12 GMT - Start Run 422 resolution (legacy brief cleanup + pre-run force-save)

### Files changed
- `frontend/src/routes/VersionBuilderPage.tsx`
- `../Naming_BE/api/services/version_service.py`
- `overdrive/phase_0_fe_log.md`

### What changed
- Updated Version Builder Start Run flow to force-save all three sections before `POST /runs/start`, even when no section is currently dirty:
  - `saveDirtySections(SECTION_ORDER, 'pre-run', true)`
  - Added `force` plumbing through `saveDirtySections` and `saveSection`.
- Updated Brief serialization key from `brief.audience.tone_sliders` to backend-required `brief.audience.tone`.
- Updated backend version patch behavior in `Naming_BE` to replace section payloads (`brief`, `hotspots`, `dials`) instead of merging JSON objects.
  - This removes stale legacy flat keys (for example `brief.what_it_is`, `brief.channel`) that were otherwise retained and failed run-start validation with `extra_forbidden`.

### Root cause summary
- Run-start validates persisted DB payload shape against strict Pydantic schemas (`extra='forbid'`).
- Historic flat brief keys remained in DB due merge-on-patch behavior.
- Even with nested FE payloads, stale keys persisted until backend patch switched to replace semantics.

### Verification
- FE checks:
  - `cd frontend && npm run lint` (pass)
  - `cd frontend && npm run typecheck` (pass)
  - `cd frontend && npm run build` (pass)
- BE checks:
  - `cd ../Naming_BE && python3 -m py_compile api/services/version_service.py` (pass)
- Manual runtime:
  - User confirmed Start Run now succeeds (no recurring 422).

## 2026-02-19 14:32 GMT - Generation Review names API layer (types + hooks + optimistic cache)

### Summary
- Added strict frontend API contract types for Generation Review name candidates, including:
  - list envelope (`{ items, total }`)
  - server-side names list query params (filters, sorting, pagination)
  - curation patch request restricted to `shortlisted`, `notes`, `selected_for_clearance`, `rank`
  - deep-clearance trigger response (`selected_count`)
- Added thin API wrappers for:
  - `GET /api/v1/runs/{runId}/names`
  - `PATCH /api/v1/names/{nameId}`
  - `POST /api/v1/runs/{runId}/deep-clearance`
- Added TanStack Query hooks for Generation Review data access:
  - `useRunNamesQuery(runId, params?, options?)`
  - `useRunNamesAllQuery(runId, params?, options?)` (defaults to `limit=100`, `offset=0`)
  - `usePatchNameCandidateMutation()`
  - `useRunDeepClearanceMutation()`
- Added reusable optimistic cache utilities for shortlist and selected-for-clearance toggles with rollback support across all cached names queries for the same run.

### Files created/modified
- `frontend/src/lib/api/names.types.ts`
- `frontend/src/lib/api/names.ts`
- `frontend/src/features/names/optimistic.ts`
- `frontend/src/features/names/queries.ts`
- `frontend/src/lib/api/index.ts`
- `overdrive/phase_0_fe_log.md`

### Design decisions
- Query key strategy is run-scoped and param-scoped: `['names','run',runId,normalizedParams]`, with run-prefix helpers for broad invalidation/optimistic updates.
- Optimistic toggle helpers update every cached names list for `runId` (including different filter/sort/pagination variants), store per-query snapshots, and provide rollback context consumed by mutation `onError`.
- When both toggle fields are patched in one request, rollback is applied in reverse optimistic-update order to restore the original pre-mutation cache state deterministically.
- Patch mutation applies optimistic updates only for boolean toggles (`shortlisted`, `selected_for_clearance`) and merges server response into all run caches on success for canonical row data.
- Errors continue using shared `ApiError` handling from the common client layer; no endpoint-specific auth or custom error wrappers were introduced.

### Manual sanity-check notes
- Use React Query Devtools while toggling shortlist/selected-for-clearance to confirm all cached run-name query variants update immediately and roll back on forced mutation failure.
- Call `useRunNamesAllQuery(runId)` to fetch the full Generation Review set in one request (`limit=100, offset=0`).
- Confirm deep-clearance mutation returns `selected_count` from server response and that run-scoped names queries invalidate after success.

### Commands run
- `cd frontend && npm run lint` (pass)
- `cd frontend && npm run typecheck` (pass)
- `cd frontend && npm run build` (pass)

## 2026-02-19 15:02 GMT - Generation Review route + unavailable-state navigation guards

### Files added/modified
- `frontend/src/routes/GenerationReviewPage.tsx`
- `frontend/src/app/router.tsx`
- `overdrive/phase_0_fe_log.md`

### Route path
- Added Generation Review route at:
  - `/projects/:projectId/versions/:versionId/generation-review`
- Router now maps this path to `GenerationReviewPage` (replacing the phase placeholder element for this route).

### What was implemented
- Added desktop-only Generation Review route shell with device gating:
  - `<lg` renders a single fallback card with exact text: `Best viewed on desktop`.
- Added unavailable-state guard cards (navigation-only CTAs) using run resolution via `version.latest_run_id` + run status query:
  - No run id: CTA `Go to Version Builder` -> `/projects/:projectId/versions/:versionId`
  - Run state `draft|queued|stage_0|stage_1`: CTA `Go to Run Monitor` -> `/projects/:projectId/versions/:versionId/run`
  - Run state `territory_review`: CTA `Review Territory Cards` -> `/projects/:projectId/versions/:versionId/territory-review`
  - Run state `stage_2..stage_8`: CTA `Go to Run Monitor` -> `/projects/:projectId/versions/:versionId/run`
- For available states (including `generation_review`), route renders a minimal desktop placeholder shell only.

### API activity constraints confirmation
- In unavailable states, this route triggers only read queries required for gating:
  - `useVersionDetailQuery(versionId)`
  - `useRunStatusQuery(latest_run_id)`
- No mutations/actions are mounted or triggered from this page:
  - no start-run
  - no deep-clearance trigger
  - no name patch/mutation actions
  - no names-table/list query hook usage

### Manual sanity-check steps
- Desktop (`>=1024px`):
  - Open `/projects/<projectId>/versions/<versionId>/generation-review` where `latest_run_id` is null -> verify `Go to Version Builder` CTA link.
  - With run state `queued`/`stage_0`/`stage_1` -> verify `Go to Run Monitor` CTA link.
  - With run state `territory_review` -> verify `Review Territory Cards` CTA link.
  - With run state `stage_2` through `stage_8` -> verify `Go to Run Monitor` CTA link.
  - With run state `generation_review` (or later) -> verify minimal Generation Review desktop placeholder renders (no guard CTA card).
- Mobile (`<1024px`):
  - Open same route and verify only the fallback card with text `Best viewed on desktop`.

### Commands run
- `cd frontend && npm run lint` (pass)
- `cd frontend && npm run typecheck` (pass)
- `cd frontend && npm run build` (pass)

## 2026-02-19 15:12 GMT - Phase 8 Generation Review desktop shell: sticky header/filter + names table

### Files added/modified
- `frontend/src/routes/GenerationReviewPage.tsx`
- `frontend/src/features/names/components/FastClearanceBadge.tsx`
- `frontend/src/features/names/components/NamesFilterBar.tsx`
- `frontend/src/features/names/components/NamesTable.tsx`
- `frontend/src/features/names/fast-clearance.ts`
- `frontend/src/features/names/filters.ts`
- `frontend/src/hooks/use-debounced-value.ts`
- `overdrive/phase_0_fe_log.md`

### What was implemented
- Replaced Generation Review desktop placeholder with full Phase 8 core UI on `lg+`:
  - sticky top header (breadcrumbs, version/run badges, showing count)
  - sticky filter bar (search + multi filters + clear all)
  - independently scrollable names table region
  - sticky bottom action bar placeholder (`Action bar (coming next)`)
  - legal disclaimer text:
    - `USPTO screening results are for knockout purposes only and do not constitute legal advice.`
- Kept existing unavailable-state guard CTAs and mobile fallback card behavior (`Best viewed on desktop`).

### Data/query behavior
- Names list is loaded via existing names query hook and endpoint contract:
  - `useRunNamesQuery(runId, { limit: 100, offset: 0, sort_by: 'rank', sort_dir: 'asc', selected_for_final: true })`
  - endpoint: `GET /api/v1/runs/{run_id}/names`
  - response envelope used as `{ total, items }`
- Names query is enabled only when Generation Review is in an available run state (no names query in unavailable guard states).

### Filter/sort decisions
- Search uses a 300ms debounced value (`useDebouncedValue`) and is applied client-side against `name_text`.
- Client-side filters implemented for:
  - family multi-select
  - territory multi-select (`territory_card_id`, labels from backend-provided `territory_card_label`)
  - format multi-select
  - score range (`scores.composite`)
  - fast-clearance status (`green|amber|red|unknown` normalized)
  - shortlisted toggle (All vs Starred only)
  - clear-all reset
- Default ordering implementation:
  - server pre-sort by `rank ASC`
  - client tie-break sort by `scores.composite DESC` (then name text asc).

### Table/layout decisions
- Column order: Star, Select, Rank, Name, Family, Territory, Format, Score, Meaning, Clearance.
- Responsive desktop column hiding implemented with progressive max-width breakpoints:
  - Meaning hidden first: `max-[1500px]`
  - Territory hidden next: `max-[1320px]`
  - Format hidden next: `max-[1180px]`
  - Family hidden last: `max-[1100px]`
- Meaning cell uses truncation (`truncate`) and width constraint to avoid row-height expansion.

### Edge cases handled
- Null rank renders `-` and sorts to the end.
- Missing/non-numeric composite score renders `-` and sorts as lowest tie-break value.
- Missing or non-standard `fast_clearance.status` is normalized to `unknown` and rendered with gray badge style.
- Filtered empty result set shows inline empty state with working `Clear all filters` action.
- Table loading state uses skeleton rows; error state shows retry card.

### Commands run
- `cd frontend && npm run lint` (pass)
- `cd frontend && npm run typecheck` (pass)
- `cd frontend && npm run build` (pass)

## 2026-02-19 15:22 GMT - Generation Review Name Detail drawer (Sheet) with inline curation edits

### Files added/modified
- `frontend/src/components/ui/sheet.tsx`
- `frontend/src/features/names/components/NameDetailDrawer.tsx`
- `frontend/src/features/names/components/NamesTable.tsx`
- `frontend/src/features/names/optimistic.ts`
- `frontend/src/features/names/queries.ts`
- `frontend/src/routes/GenerationReviewPage.tsx`
- `overdrive/phase_0_fe_log.md`

### What changed
- Added a shadcn-style Sheet primitive and integrated a right-side Name Detail drawer (`400px` width) for Generation Review.
- Generation Review now opens the drawer on row click by storing `selectedNameId` and deriving the selected candidate from the live names list cache.
- Drawer includes:
  - name header + family/format/territory badges
  - score breakdown (composite + dimensions)
  - fast-clearance detail (`checked_at`, unknown reason fallback, pretty raw-response JSON)
  - meaning/backstory sections
  - notes textarea with debounced autosave
  - shortlist + selected-for-clearance inline controls

### Row click exclusion behavior
- Implemented propagation guards in `NamesTable` so row click does not fire when interacting with:
  - shortlist star button
  - selected-for-clearance checkbox area
- Used `event.stopPropagation()` on both `onClick` and `onPointerDown` for those interactive controls.

### Notes autosave behavior
- Debounce interval: **700ms** via `useDebouncedValue`.
- Drawer does not PATCH on open without edits (baseline compare against current candidate notes).
- Notes PATCH payload sends only `{ notes: string | null }`.

### Optimistic update + rollback/error behavior
- Extended names optimistic utilities with `optimisticallySetNotesAcrossRunCaches(...)` so notes update immediately across all run-scoped cached name lists.
- `usePatchNameCandidateMutation` now applies optimistic updates for `shortlisted`, `selected_for_clearance`, and `notes`, with rollback contexts restored on error.
- Route/drawer mutation error handlers surface destructive toasts using backend `detail` via shared error parsing; this includes server-side 409 version-state gating responses.

### Verification
- `cd frontend && npm run lint` (pass)
- `cd frontend && npm run typecheck` (pass)
- `cd frontend && npm run build` (pass)

## 2026-02-19 15:32 GMT - Generation Review deep clearance action bar + confirmation dialog

### Files added/modified
- `frontend/src/features/names/components/DeepClearanceActionBar.tsx`
- `frontend/src/features/names/components/DeepClearanceConfirmDialog.tsx`
- `frontend/src/routes/GenerationReviewPage.tsx`
- `frontend/src/lib/api/runs.ts`
- `frontend/src/lib/api/runs.types.ts`
- `frontend/src/lib/api/names.ts`
- `frontend/src/lib/api/index.ts`
- `overdrive/phase_0_fe_log.md`

### Deep clearance API endpoint
- `POST /api/v1/runs/{run_id}/deep-clearance`

### What changed
- Replaced the Generation Review bottom placeholder with a sticky action bar:
  - left summary: `Showing X of total`
  - right CTA: `Run deep clearance on N names`
- `N` is derived from all loaded run names with `selected_for_clearance === true` (not just filtered-visible rows).
- Added a confirmation dialog that lists selected names (`name_text`) in a bounded scroll region (`max-height` + `overflow-y-auto`) to prevent unbounded modal growth.
- Confirm action triggers deep clearance mutation; cancel closes dialog with no side effects.

### Gating behavior
- CTA is disabled when `N === 0`.
  - Disabled-button tooltip message: `Select at least one name for deep clearance`.
- CTA is disabled when run state is not `generation_review` (including `phase_3_running` and all other non-`generation_review` states).
- Curation controls remain enabled regardless of run-state gating (shortlist, notes autosave, per-row selection toggles).

### Success/error flow
- On success:
  - success toast shown
  - navigates to Run Monitor route: `/projects/:projectId/versions/:versionId/run`
- On error (including HTTP 409):
  - destructive toast shows backend `detail` via shared `getErrorMessage(...)` parsing.

### Query invalidations
- Existing deep-clearance mutation hook invalidates run-scoped names queries to reconcile list data.
- Route-level success handler additionally invalidates:
  - `runStatusQueryKey(runId)`
  - `versionDetailQueryKey(versionId)`
  - `projectDetailQueryKey(projectId)`
  - `projectVersionsQueryKey(projectId)`
- Rationale: ensure run/version/project state is refreshed immediately before/after redirecting to Run Monitor.

### API layer alignment
- Added typed deep-clearance response to runs types and moved deep-clearance POST helper into `frontend/src/lib/api/runs.ts`.
- `frontend/src/lib/api/index.ts` now exports deep-clearance API from runs module.

### Commands run
- `cd frontend && npm run lint` (pass)
- `cd frontend && npm run typecheck` (pass)
- `cd frontend && npm run build` (pass)

## 2026-02-19 16:29 GMT - Generation Review CTA entry points in Run Monitor + Version Builder

### What changed
- Added a Generation Review gate-card variant in Run Monitor that surfaces a CTA only when `run.state === 'generation_review'`.
- Added a Version Builder inline banner variant for `generation_review` state with the same CTA destination.
- CTA label in both places: `Review Generated Names`.
- CTA destination in both places: `/projects/:projectId/versions/:versionId/generation-review`.

### Files touched
- `frontend/src/routes/RunMonitorPage.tsx`
- `frontend/src/routes/VersionBuilderPage.tsx`
- `overdrive/phase_0_fe_log.md`

### Manual verification steps performed
- Static code-path verification for Run Monitor:
  - Confirmed gate-card CTA render is additionally gated by strict `runState === 'generation_review'` and only for the `generation_review` gate definition.
  - Confirmed no CTA renders for other gate/state combinations.
- Static code-path verification for Version Builder:
  - Confirmed inline banner renders only when `runStatusQuery.data?.state === 'generation_review'`.
  - Confirmed CTA is absent for non-`generation_review` states.
- Build checks:
  - `cd frontend && npm run lint` (pass)
  - `cd frontend && npm run typecheck` (pass)
  - `cd frontend && npm run build` (pass)

### Follow-ups / edge cases
- Runtime browser verification with a live backend run state transition (`stage_8` -> `generation_review`) remains recommended to visually confirm CTA timing and click-through behavior in both pages.

## 2026-02-20 08:19 GMT - Deep clearance typing + name-clearance SSE payload type + cache helper

### Files changed
- `frontend/src/lib/api/names.types.ts`
- `frontend/src/lib/api/runs.types.ts`
- `frontend/src/features/names/optimistic.ts`
- `frontend/src/lib/api/index.ts`
- `overdrive/phase_0_fe_log.md`

### Summary
- Added typed deep-clearance API models in `names.types.ts`:
  - `DeepClearance`
  - `TrademarkClearance` + `TrademarkClearanceStatus` + `TrademarkSimilarMark`
  - `DomainClearance` + `DomainClearanceStatus`
  - `SocialClearance` + `SocialClearanceMap` + `SocialClearanceStatus`
- Updated `NameCandidateResponse.deep_clearance` from `Record<string, unknown> | null` to `DeepClearance | null`.
- Added SSE payload typing in `runs.types.ts`:
  - `NameClearanceType` (`'trademark' | 'domain' | 'social'`)
  - `NameClearanceUpdateEvent` with fields `event_type`, `run_id`, `name_id`, `clearance_type`, `deep_clearance`.
- Exported the new API and SSE types via `frontend/src/lib/api/index.ts`.

### Cache helper
- Added `updateNameCandidateDeepClearance(...)` in `frontend/src/features/names/optimistic.ts`.
- Helper behavior:
  - updates cached name-candidate data by `nameId` without refetch
  - scopes cache selection by existing run names key factory prefix (`runNamesRunQueryKeyPrefix(runId)`)
  - uses `queryClient.setQueriesData(..., { predicate })` for immutable cache transforms
  - merges deep-clearance snapshots top-level before assigning (`{ ...prevDeepClearance, ...incomingDeepClearance }`)
  - updates list caches (`{ items: NameCandidateResponse[] }`) and also supports candidate-shaped cache entries under the same prefix when present.

### Commands run
- `cd frontend && npm run lint`
- `cd frontend && npm run typecheck`
- `cd frontend && npm run build`

### Follow-up
- Next node should wire `NameClearanceUpdateEvent` handling into the SSE consumer to call `updateNameCandidateDeepClearance(...)` when `name_clearance_update` events are received.

## 2026-02-20 08:34 GMT - Parse `name_clearance_update` SSE + patch names cache in-place

### Files changed
- `frontend/src/lib/api/runs.types.ts`
- `frontend/src/lib/api/runs.ts`
- `frontend/src/features/runs/useRunProgress.ts`
- `frontend/src/features/names/optimistic.ts`
- `overdrive/phase_0_fe_log.md`

### Summary
- Extended run SSE event typing to include `name_clearance_update` in `RUN_SSE_EVENT_TYPES` and `SSEEvent` union.
- Added strict parsing for `name_clearance_update` payload in `parseSseEventData(...)` (including `clearance_type` and typed `deep_clearance` sub-objects).
- Kept existing `stage_progress`/run-stage SSE handling unchanged.
- Wired `useRunProgress` SSE listener to handle `name_clearance_update` events by patching TanStack Query cache via `updateNameCandidateDeepClearance(...)`.
- Added per-subtype deep-clearance merge logic with out-of-order guards:
  - `trademark` and `domain`: apply only when incoming `checked_at` is not older than cached value (best effort).
  - `social`: per-platform merge with per-platform `checked_at` guard.

### Cache update behavior
- Query cache patch is scoped to existing run names key prefix (`runNamesRunQueryKeyPrefix(runId)`).
- Matching candidate is updated by `name_id` in-place via `queryClient.setQueriesData(...)` (no refetch required).
- Candidate-not-found and malformed-event cases are safely ignored.

### Validation
- Executed:
  - `cd frontend && npm run lint` (pass)
  - `cd frontend && npm run typecheck` (pass)
  - `cd frontend && npm run build` (pass)
- Manual runtime path to verify locally with backend SSE:
  1) Open Generation Review for a run in deep-clearance flow.
  2) Trigger deep clearance.
  3) Observe row-level deep-clearance badge area update without refetch.
  4) Open Name Detail Drawer for the same candidate and confirm Deep Clearance section updates immediately as SSE events arrive.

### Edge cases handled
- Out-of-order events: guarded by `checked_at` comparisons (best effort) per sub-key/per social platform.
- Dropped/malformed `name_clearance_update` events: ignored without crashing run monitor state handling.
- Unknown `name_id` in cache: ignored safely.

## 2026-02-20 08:50 GMT - Phase 3 deep clearance UI/UX + trigger wiring on Generation Review/Results

### Files changed
- `frontend/src/app/router.tsx`
- `frontend/src/routes/GenerationReviewPage.tsx`
- `frontend/src/features/names/components/DeepClearanceActionBar.tsx`
- `frontend/src/features/names/components/DeepClearanceConfirmDialog.tsx`
- `frontend/src/features/names/components/NamesTable.tsx`
- `frontend/src/features/names/components/NameDetailDrawer.tsx`
- `frontend/src/features/names/components/DeepClearanceBadges.tsx`
- `frontend/src/features/names/deep-clearance.ts`
- `frontend/src/features/names/optimistic.ts`
- `frontend/src/features/runs/useRunProgress.ts`
- `overdrive/phase_0_fe_log.md`

### Summary of shipped UX
- Results route (`/projects/:projectId/versions/:versionId/results`) now uses the same Generation Review surface and supports version states `generation_review`, `phase_3_running`, and `complete`.
- Added generation-review post-trigger routing behavior:
  - if version state becomes `phase_3_running` while on `/generation-review` -> redirect to Run Monitor
  - if version state becomes `complete` while on `/generation-review` -> redirect to `/results`
- Deep clearance action bar/dialog updates:
  - primary CTA remains `Run deep clearance on N names`
  - complete-state disabled tooltip implemented exactly:
    `Deep clearance complete. Fork this version to run clearance on additional names.`
  - confirm dialog pending-state guards preserved (cannot dismiss while pending)
- Table clearance rendering updates:
  - if `deep_clearance` present -> render deep-clearance badges
  - else -> render fast clearance badge
  - while `phase_3_running`, selected rows without deep clearance show subtle in-progress indicator
- Name Detail Drawer updates:
  - added `Deep Clearance` section with `Trademark`, `Domain`, and `Socials` subsections
  - if not selected -> shows muted `Not selected for deep clearance`
  - if selected and subsection missing -> shows subsection skeleton loaders
  - subsection content updates from cached candidate state

### API integration note
- Deep clearance trigger remains wired to backend endpoint:
  - `POST /api/v1/runs/{run_id}/deep-clearance`
- Success path continues navigating to Run Monitor.

### SSE/cache integration note
- Existing `name_clearance_update` SSE handling in `useRunProgress` now patches names cache for matching `name_id` by replacing candidate `deep_clearance` with the payload snapshot (no refetch required).
- Generation Review page now mounts `useRunProgress` for the active run so drawer/table deep-clearance sections can update live from SSE-delivered cache patches.

### Validation
- Executed:
  - `cd frontend && npm run lint` (pass)
  - `cd frontend && npm run typecheck` (pass)
  - `cd frontend && npm run build` (pass)

### Manual test checklist
- `generation_review` state:
  - verify action bar enabled only with selected names and confirm dialog submit starts deep clearance + navigates to Run Monitor.
- `phase_3_running` state:
  - verify selected rows without deep clearance show in-progress indicator.
  - verify drawer deep-clearance subsections show skeletons for missing sections and fill in as cache updates arrive.
- `complete` state:
  - verify trigger CTA disabled with exact complete-state tooltip text.
  - verify `/results` renders list/drawer surface and `/generation-review` redirects to `/results`.

### Notes
- Interactive browser/SSE runtime verification is still required locally against a live backend stream in this environment.

## 2026-02-20 09:05 GMT - Deep clearance filter groups for trademark/domain in Names filter bar

### Files changed
- `frontend/src/features/names/filters.ts`
- `frontend/src/features/names/components/NamesFilterBar.tsx`
- `frontend/src/routes/GenerationReviewPage.tsx`
- `overdrive/phase_0_fe_log.md`

### Summary
- Extended `NamesFilterState` with:
  - `deepTrademarkStatuses: Array<'green' | 'amber' | 'red' | 'unknown'>`
  - `domainStatuses: Array<'available' | 'taken' | 'unknown'>`
- Updated filter defaults and active-filter detection to include both new fields.
- Added shared `filterNameCandidates(...)` in `filters.ts` and moved names filtering semantics into that helper.
- Added deep-clearance filter semantics:
  - trademark filter matches only `candidate.deep_clearance?.trademark?.status`
  - domain filter matches only `candidate.deep_clearance?.domain?.status`
  - missing `deep_clearance` / missing subobjects do not match (including when `unknown` is selected).
- Updated `NamesFilterBar` with new prop `showDeepClearanceFilters` and two conditional filter groups:
  - `Deep trademark` (`green`, `amber`, `red`, `unknown`)
  - `Domain` (`available`, `taken`, `unknown`)
- Updated `GenerationReviewPage` to:
  - compute `hasAnyDeepClearance` from loaded names via `hasDeepClearanceData(...)`
  - pass `showDeepClearanceFilters={hasAnyDeepClearance}` to `NamesFilterBar`
  - apply shared `filterNameCandidates(...)` logic before sorting.

### Verification
- Executed:
  - `cd frontend && npm run lint` (pass)
  - `cd frontend && npm run typecheck` (pass)
  - `cd frontend && npm run build` (pass)
- Manual logic verification performed in code paths:
  1) When all loaded candidates have `deep_clearance: null` (or no trademark/domain payload), `hasAnyDeepClearance` remains false and deep filter groups are hidden.
  2) When any candidate receives deep-clearance data (including via SSE-driven cache updates), `hasAnyDeepClearance` becomes true and both groups render without refresh.
  3) Selecting deep trademark or domain values filters by exact deep status only and combines with existing family/format/territory/search/score/fast-clearance/starred filters with AND semantics.

### Edge cases considered
- Partial deep clearance payload:
  - trademark present + domain missing: trademark filter can match; domain filter cannot match that row.
  - domain present + trademark missing: domain filter can match; trademark filter cannot match that row.
- `unknown` filter values are matched only when backend status is explicitly `unknown`, not when deep-clearance fields are absent.
