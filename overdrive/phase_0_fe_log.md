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
