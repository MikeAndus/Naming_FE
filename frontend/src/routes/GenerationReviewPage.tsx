import { useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { AlertTriangle, RefreshCcw, WifiOff } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'

import { Breadcrumbs } from '@/components/app/Breadcrumbs'
import { EmptyState } from '@/components/app/EmptyState'
import { InlineBanner } from '@/components/app/InlineBanner'
import { SkeletonSection } from '@/components/app/SkeletonSection'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DeepClearanceActionBar,
} from '@/features/names/components/DeepClearanceActionBar'
import {
  DeepClearanceConfirmDialog,
} from '@/features/names/components/DeepClearanceConfirmDialog'
import {
  NameDetailDrawer,
} from '@/features/names/components/NameDetailDrawer'
import {
  NamesFilterBar,
} from '@/features/names/components/NamesFilterBar'
import { NamesTable } from '@/features/names/components/NamesTable'
import { getSocialsAggregateStatus } from '@/features/names/deep-clearance'
import {
  buildRunNamesQueryParams,
  createDefaultNamesFilters,
  getNamesFilterScoreRange,
  isNamesFilterStateActive,
  sortNameCandidatesForDisplay,
  sortTerritoryOptions,
  type NamesFilterState,
  type NamesSortBy,
} from '@/features/names/filters'
import {
  usePatchNameCandidateMutation,
  useRunDeepClearanceMutation,
  useRunNamesQuery,
} from '@/features/names/queries'
import { projectDetailQueryKey, useProjectDetailQuery } from '@/features/projects/queries'
import { runStatusQueryKey, useRunStatusQuery } from '@/features/runs/queries'
import { useRunProgress } from '@/features/runs/useRunProgress'
import {
  projectVersionsQueryKey,
  useVersionDetailQuery,
  versionDetailQueryKey,
} from '@/features/versions/queries'
import { getErrorMessage, type NameCandidateResponse, type RunState } from '@/lib/api'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { toast } from '@/hooks/use-toast'

function subscribeDesktop(callback: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const mediaQuery = window.matchMedia('(min-width: 1024px)')
  const listener = () => callback()
  mediaQuery.addEventListener('change', listener)
  return () => {
    mediaQuery.removeEventListener('change', listener)
  }
}

function getDesktopSnapshot(): boolean {
  if (typeof window === 'undefined') {
    return true
  }

  return window.matchMedia('(min-width: 1024px)').matches
}

function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribeDesktop, getDesktopSnapshot, () => true)
}

function formatStateLabel(state: string): string {
  return state.replaceAll('_', ' ')
}

type UnavailableCta = {
  buttonLabel: string
  href: string
  description: string
}

const PRE_REVIEW_STATES = new Set<string>(['draft', 'queued', 'stage_0', 'stage_1'])
const MID_RUN_STATES = new Set<RunState>([
  'stage_2',
  'stage_3',
  'stage_4',
  'stage_5',
  'stage_6',
  'stage_7',
  'stage_8',
])
const PHASE_3_RUN_STATES = new Set<RunState>(['stage_9', 'stage_10', 'stage_11'])
const RESULTS_ELIGIBLE_VERSION_STATES = new Set([
  'generation_review',
  'phase_3_running',
  'complete',
])

function getUnavailableCta(
  runState: RunState,
  paths: {
    runMonitorHref: string
    territoryReviewHref: string
  },
): UnavailableCta | null {
  if (PRE_REVIEW_STATES.has(runState)) {
    return {
      buttonLabel: 'Go to Run Monitor',
      href: paths.runMonitorHref,
      description: 'Results become available after the run reaches generation review.',
    }
  }

  if (runState === 'territory_review') {
    return {
      buttonLabel: 'Review Territory Cards',
      href: paths.territoryReviewHref,
      description: 'Finish Territory Review to continue this run toward Results.',
    }
  }

  if (MID_RUN_STATES.has(runState)) {
    return {
      buttonLabel: 'Go to Run Monitor',
      href: paths.runMonitorHref,
      description: 'This run is still processing. Track progress in Run Monitor.',
    }
  }

  return null
}

function getVersionStateBadgeClass(state: string): string {
  if (state === 'complete') {
    return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
  }

  if (state === 'failed') {
    return 'bg-destructive text-destructive-foreground hover:bg-destructive'
  }

  if (
    state === 'phase_1_running' ||
    state === 'territory_review' ||
    state === 'phase_2_running' ||
    state === 'generation_review' ||
    state === 'phase_3_running'
  ) {
    return 'bg-amber-100 text-amber-800 hover:bg-amber-100'
  }

  return ''
}

function getRunStateBadgeClass(state: string): string {
  if (state === 'complete') {
    return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
  }

  if (state === 'failed') {
    return 'bg-destructive text-destructive-foreground hover:bg-destructive'
  }

  return 'bg-amber-100 text-amber-800 hover:bg-amber-100'
}

function getDeepTrademarkStatus(candidate: NameCandidateResponse, isPhase3Running: boolean): string {
  const value = candidate.deep_clearance?.trademark?.status
  if (value) {
    return value
  }

  return isPhase3Running && candidate.selected_for_clearance ? 'pending' : 'unknown'
}

function getDomainStatus(candidate: NameCandidateResponse, isPhase3Running: boolean): string {
  const value = candidate.deep_clearance?.domain?.status
  if (value) {
    return value
  }

  return isPhase3Running && candidate.selected_for_clearance ? 'pending' : 'unknown'
}

function getSocialStatus(candidate: NameCandidateResponse, isPhase3Running: boolean): string {
  if (candidate.deep_clearance?.socials) {
    return getSocialsAggregateStatus(candidate.deep_clearance.socials)
  }

  return isPhase3Running && candidate.selected_for_clearance ? 'pending' : 'unknown'
}

const EMPTY_NAMES: NameCandidateResponse[] = []

export function GenerationReviewPage() {
  const { projectId, versionId } = useParams<{ projectId: string; versionId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isDesktop = useIsDesktop()
  const isResultsRoute = location.pathname.endsWith('/results')

  const resolvedProjectId = projectId && isDesktop ? projectId : undefined
  const resolvedVersionId = projectId && versionId && isDesktop ? versionId : undefined
  const projectQuery = useProjectDetailQuery(resolvedProjectId)
  const versionQuery = useVersionDetailQuery(resolvedVersionId)
  const runId = versionQuery.data?.latest_run_id ?? undefined
  const runStatusQuery = useRunStatusQuery(isDesktop ? runId : undefined)

  const versionBuilderHref = projectId && versionId ? `/projects/${projectId}/versions/${versionId}` : '/projects'
  const runMonitorHref = `${versionBuilderHref}/run`
  const territoryReviewHref = `${versionBuilderHref}/territory-review`
  const resultsHref = `${versionBuilderHref}/results`
  const executiveSummaryHref = runId
    ? `${versionBuilderHref}/runs/${runId}/executive-summary`
    : null

  const runProgress = useRunProgress({
    runId: isDesktop && runId ? runId : null,
    enabled: Boolean(isDesktop && runId),
  })
  const resolvedRunState = runProgress.status?.state ?? runStatusQuery.data?.state

  const unavailableCta = resolvedRunState
    ? getUnavailableCta(resolvedRunState, {
        runMonitorHref,
        territoryReviewHref,
      })
    : null

  const [filters, setFilters] = useState<NamesFilterState>(() => createDefaultNamesFilters())
  const [selectedNameId, setSelectedNameId] = useState<string | null>(null)
  const [isDeepClearanceDialogOpen, setIsDeepClearanceDialogOpen] = useState(false)
  const lastDrawerTriggerRef = useRef<HTMLElement | null>(null)
  const patchNameCandidateMutation = usePatchNameCandidateMutation()
  const deepClearanceMutation = useRunDeepClearanceMutation()

  const debouncedSearch = useDebouncedValue(filters.search, 300)
  const effectiveFilters = useMemo(
    () => ({
      ...filters,
      search: debouncedSearch,
    }),
    [debouncedSearch, filters],
  )
  const scoreRange = useMemo(() => getNamesFilterScoreRange(effectiveFilters), [effectiveFilters])
  const filteredQueryParams = useMemo(
    () => buildRunNamesQueryParams(effectiveFilters, scoreRange),
    [effectiveFilters, scoreRange],
  )

  const shouldLoadNames = Boolean(
    isDesktop && runId && resolvedRunState && !unavailableCta && projectId && versionId,
  )
  const isPhase3Running = Boolean(resolvedRunState && PHASE_3_RUN_STATES.has(resolvedRunState))
  const useNamesPollingFallback =
    isPhase3Running && runProgress.connectionState !== 'live'

  const allNamesQuery = useRunNamesQuery(
    shouldLoadNames ? runId : undefined,
    {
      limit: 100,
      offset: 0,
      selected_for_final: true,
      sort_by: 'score',
      sort_dir: 'desc',
    },
    {
      enabled: shouldLoadNames,
      refetchInterval: useNamesPollingFallback ? 5000 : false,
    },
  )

  const filteredNamesQuery = useRunNamesQuery(
    shouldLoadNames ? runId : undefined,
    {
      limit: 100,
      offset: 0,
      selected_for_final: true,
      ...filteredQueryParams,
    },
    {
      enabled: shouldLoadNames,
      refetchInterval: useNamesPollingFallback ? 5000 : false,
    },
  )

  const allNames = allNamesQuery.data?.items ?? EMPTY_NAMES
  const filteredNames = filteredNamesQuery.data?.items ?? EMPTY_NAMES
  const displayedNames = useMemo(
    () => sortNameCandidatesForDisplay(filteredNames, filters),
    [filteredNames, filters],
  )

  const selectedNameCandidate = useMemo(
    () => allNames.find((candidate) => candidate.id === selectedNameId) ?? null,
    [allNames, selectedNameId],
  )
  const territoryOptions = useMemo(() => sortTerritoryOptions(allNames), [allNames])

  const totalCount = filteredNamesQuery.data?.total ?? displayedNames.length
  const showingCount = displayedNames.length
  const starredCount = displayedNames.filter((candidate) => candidate.shortlisted).length
  const selectedVisibleCount = displayedNames.filter(
    (candidate) => candidate.selected_for_clearance,
  ).length
  const selectedForClearanceNames = useMemo(
    () => allNames.filter((candidate) => candidate.selected_for_clearance),
    [allNames],
  )
  const selectedForClearanceCount = selectedForClearanceNames.length

  const hasActiveFilters = isNamesFilterStateActive(filters)

  const projectLabel = projectQuery.data?.name?.trim() || 'Project'
  const versionLabel =
    versionQuery.data?.version_number !== undefined
      ? `v${versionQuery.data.version_number}`
      : versionId
        ? `v${versionId.slice(0, 8)}`
        : 'Version'

  const breadcrumbs = [
    { label: 'Dashboard', to: '/projects' },
    { label: projectLabel, to: projectId ? `/projects/${projectId}` : '/projects' },
    { label: versionLabel, to: versionBuilderHref },
    { label: isResultsRoute ? 'Results' : 'Generation review' },
  ]

  const isNamesLoading =
    filteredNamesQuery.isLoading || (filteredNamesQuery.isFetching && !filteredNamesQuery.data)
  const isDeepClearanceRunStateEligible = resolvedRunState === 'generation_review'
  const isVersionComplete = versionQuery.data?.state === 'complete'

  const warnings = useMemo(() => {
    let unknownCount = 0
    let pendingCount = 0

    for (const candidate of displayedNames) {
      const statuses = [
        getDeepTrademarkStatus(candidate, isPhase3Running),
        getDomainStatus(candidate, isPhase3Running),
        getSocialStatus(candidate, isPhase3Running),
      ]

      statuses.forEach((status) => {
        if (status === 'pending') {
          pendingCount += 1
        } else if (status === 'unknown') {
          unknownCount += 1
        }
      })
    }

    const runProgressData = runProgress.status?.progress
    let diversityShortfallMessage: string | null = null
    if (runProgressData && typeof runProgressData === 'object') {
      const diversityShortfall = runProgressData['diversity_shortfall']
      if (typeof diversityShortfall === 'string' && diversityShortfall.trim().length > 0) {
        diversityShortfallMessage = diversityShortfall
      } else if (diversityShortfall === true) {
        diversityShortfallMessage = 'Diversity shortfall detected in generated names.'
      }
    }

    return {
      pendingCount,
      unknownCount,
      diversityShortfallMessage,
    }
  }, [displayedNames, isPhase3Running, runProgress.status?.progress])

  const handleToggleShortlisted = (candidate: NameCandidateResponse) => {
    if (!runId) {
      return
    }

    patchNameCandidateMutation.mutate(
      {
        nameId: candidate.id,
        runId,
        patch: {
          shortlisted: !candidate.shortlisted,
        },
      },
      {
        onError: (error) => {
          toast({
            variant: 'destructive',
            title: 'Failed to update shortlist',
            description: getErrorMessage(error, 'Please try again.'),
          })
        },
      },
    )
  }

  const handleToggleSelectedForClearance = (candidate: NameCandidateResponse) => {
    if (!runId) {
      return
    }

    patchNameCandidateMutation.mutate(
      {
        nameId: candidate.id,
        runId,
        patch: {
          selected_for_clearance: !candidate.selected_for_clearance,
        },
      },
      {
        onError: (error) => {
          toast({
            variant: 'destructive',
            title: 'Failed to update clearance selection',
            description: getErrorMessage(error, 'Please try again.'),
          })
        },
      },
    )
  }

  const handleRunDeepClearance = () => {
    if (!runId || !isDeepClearanceRunStateEligible || isVersionComplete) {
      return
    }

    deepClearanceMutation.mutate(
      {
        runId,
      },
      {
        onSuccess: (response) => {
          setIsDeepClearanceDialogOpen(false)
          toast({
            title: 'Deep clearance started',
            description: `Running deep clearance on ${response.selected_count} names.`,
          })

          void queryClient.invalidateQueries({
            queryKey: runStatusQueryKey(runId),
            exact: true,
          })

          if (versionId) {
            void queryClient.invalidateQueries({
              queryKey: versionDetailQueryKey(versionId),
              exact: true,
            })
          }

          if (projectId) {
            void queryClient.invalidateQueries({
              queryKey: projectDetailQueryKey(projectId),
              exact: true,
            })
            void queryClient.invalidateQueries({
              queryKey: projectVersionsQueryKey(projectId),
              exact: true,
            })
          }

          navigate(runMonitorHref)
        },
        onError: (error) => {
          toast({
            variant: 'destructive',
            title: 'Failed to run deep clearance',
            description: getErrorMessage(error, 'Please try again.'),
          })
        },
      },
    )
  }

  if (!projectId || !versionId) {
    return (
      <section className="space-y-4">
        <h1 className="text-xl font-semibold">Results unavailable</h1>
        <p className="text-sm text-muted-foreground">
          A project and version id are required to open this page.
        </p>
        <Button asChild variant="outline">
          <Link to="/projects">Back to Dashboard</Link>
        </Button>
      </section>
    )
  }

  if (!isDesktop) {
    return (
      <section>
        <Card>
          <CardContent className="pt-6">
            <h1 className="text-lg font-semibold">Best viewed on desktop</h1>
          </CardContent>
        </Card>
      </section>
    )
  }

  if (versionQuery.isLoading) {
    return (
      <section className="space-y-4">
        <Breadcrumbs items={breadcrumbs} />
        <SkeletonSection rowCount={6} rows={[{ className: 'h-8 w-full' }]} />
      </section>
    )
  }

  if (versionQuery.isError || !versionQuery.data) {
    return (
      <section className="space-y-4">
        <Breadcrumbs items={breadcrumbs} />
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Couldn&apos;t load version</CardTitle>
            <CardDescription>{getErrorMessage(versionQuery.error, 'Please try again.')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void versionQuery.refetch()} type="button" variant="outline">
              Retry
            </Button>
          </CardContent>
        </Card>
      </section>
    )
  }

  if (!runId) {
    return (
      <section className="space-y-4">
        <Breadcrumbs items={breadcrumbs} />
        <Card>
          <CardHeader>
            <CardTitle>Results unavailable</CardTitle>
            <CardDescription>
              No run exists for this version yet. Start from Version Builder first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to={versionBuilderHref}>Go to Version Builder</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    )
  }

  if (runStatusQuery.isLoading) {
    return (
      <section className="space-y-4">
        <Breadcrumbs items={breadcrumbs} />
        <SkeletonSection rowCount={6} rows={[{ className: 'h-8 w-full' }]} />
      </section>
    )
  }

  if (runStatusQuery.isError || !runStatusQuery.data) {
    return (
      <section className="space-y-4">
        <Breadcrumbs items={breadcrumbs} />
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Couldn&apos;t load run state</CardTitle>
            <CardDescription>{getErrorMessage(runStatusQuery.error, 'Please try again.')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void runStatusQuery.refetch()} type="button" variant="outline">
              Retry
            </Button>
          </CardContent>
        </Card>
      </section>
    )
  }

  if (
    !isResultsRoute &&
    (versionQuery.data.state === 'phase_3_running' ||
      (resolvedRunState ? PHASE_3_RUN_STATES.has(resolvedRunState) : false))
  ) {
    return <Navigate replace to={runMonitorHref} />
  }

  if (
    !isResultsRoute &&
    (versionQuery.data.state === 'complete' || resolvedRunState === 'complete')
  ) {
    return <Navigate replace to={resultsHref} />
  }

  if (isResultsRoute && !RESULTS_ELIGIBLE_VERSION_STATES.has(versionQuery.data.state)) {
    return (
      <section className="space-y-4">
        <Breadcrumbs items={breadcrumbs} />
        <Card>
          <CardHeader>
            <CardTitle>Results unavailable</CardTitle>
            <CardDescription>
              Results open after generation review begins.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to={versionBuilderHref}>Go to Version Builder</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    )
  }

  if (unavailableCta) {
    return (
      <section className="space-y-4">
        <Breadcrumbs items={breadcrumbs} />
        <Card>
          <CardHeader>
            <CardTitle>Results unavailable</CardTitle>
            <CardDescription>{unavailableCta.description}</CardDescription>
            <div className="pt-1">
              <Badge variant="outline">Run state: {formatStateLabel(resolvedRunState ?? 'unknown')}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to={unavailableCta.href}>{unavailableCta.buttonLabel}</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
    <section className="flex h-[calc(100vh-10rem)] min-h-[560px] flex-col gap-3">
      <div className="sticky top-0 z-20 shrink-0 space-y-3 bg-muted/30 pb-1">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-2">
                <Breadcrumbs items={breadcrumbs} />
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={getVersionStateBadgeClass(versionQuery.data.state)}>
                    {formatStateLabel(versionQuery.data.state)}
                  </Badge>
                  <Badge className={getRunStateBadgeClass(resolvedRunState ?? 'queued')}>
                    {formatStateLabel(resolvedRunState ?? 'queued')}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {executiveSummaryHref ? (
                  <Button asChild size="sm" variant="outline">
                    <Link to={executiveSummaryHref}>Executive Summary</Link>
                  </Button>
                ) : null}

                <div className="text-sm text-muted-foreground">
                  Showing {showingCount} of {totalCount}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <NamesFilterBar
          filters={filters}
          hasActiveFilters={hasActiveFilters}
          onChange={(updater) => {
            setFilters((current) => updater(current))
          }}
          onClearAll={() => {
            setFilters(createDefaultNamesFilters())
          }}
          selectedCount={selectedVisibleCount}
          showingCount={showingCount}
          starredCount={starredCount}
          territoryOptions={territoryOptions}
          totalResults={totalCount}
        />

        {allNamesQuery.data && allNamesQuery.data.total < 90 ? (
          <InlineBanner
            description={`Fewer than 90 names returned (${allNamesQuery.data.total}). Results quality may be constrained.`}
            icon={<AlertTriangle className="h-4 w-4" />}
            title="Name volume shortfall"
            variant="warning"
          />
        ) : null}

        {warnings.diversityShortfallMessage ? (
          <InlineBanner
            description={warnings.diversityShortfallMessage}
            icon={<AlertTriangle className="h-4 w-4" />}
            title="Diversity shortfall"
            variant="warning"
          />
        ) : null}

        {warnings.pendingCount > 0 || warnings.unknownCount > 0 ? (
          <InlineBanner
            description={`${warnings.pendingCount} pending and ${warnings.unknownCount} unknown deep-clearance statuses in the current grid.`}
            icon={<AlertTriangle className="h-4 w-4" />}
            title="Clearance coverage"
            variant={warnings.pendingCount > 0 ? 'info' : 'warning'}
          />
        ) : null}

        {useNamesPollingFallback ? (
          <InlineBanner
            description="Realtime stream degraded. Polling every 5s until the SSE connection recovers."
            icon={<WifiOff className="h-4 w-4" />}
            title="Reconnecting"
            variant="warning"
          />
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border bg-background">
        {isNamesLoading ? (
          <div className="p-4">
            <SkeletonSection
              rowCount={12}
              rows={Array.from({ length: 12 }, () => ({ className: 'h-8 w-full' }))}
              showHeader={false}
            />
          </div>
        ) : filteredNamesQuery.isError ? (
          <div className="p-4">
            <InlineBanner
              action={
                <Button
                  onClick={() => {
                    void filteredNamesQuery.refetch()
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <RefreshCcw className="mr-1 h-3.5 w-3.5" /> Retry
                </Button>
              }
              description={getErrorMessage(filteredNamesQuery.error, 'Please try again.')}
              title="Couldn’t load Results names"
              variant="destructive"
            />
          </div>
        ) : displayedNames.length === 0 ? (
          <div className="p-4">
            <EmptyState
              cta={
                <Button
                  disabled={!hasActiveFilters}
                  onClick={() => {
                    setFilters(createDefaultNamesFilters())
                  }}
                  type="button"
                  variant="outline"
                >
                  Reset filters
                </Button>
              }
              description="No names match the current filter combination."
              title="No matching names"
            />
          </div>
        ) : (
          <NamesTable
            isPhase3Running={isPhase3Running}
            items={displayedNames}
            onRowClick={(candidate, triggerElement) => {
              lastDrawerTriggerRef.current = triggerElement
              setSelectedNameId(candidate.id)
            }}
            onSortChange={(nextSortBy: NamesSortBy) => {
              setFilters((current) => {
                if (current.sortBy === nextSortBy) {
                  return {
                    ...current,
                    sortDir: current.sortDir === 'asc' ? 'desc' : 'asc',
                  }
                }

                return {
                  ...current,
                  sortBy: nextSortBy,
                  sortDir: nextSortBy === 'name_text' ? 'asc' : 'desc',
                }
              })
            }}
            onToggleSelectedForClearance={handleToggleSelectedForClearance}
            onToggleShortlisted={handleToggleShortlisted}
            sortBy={filters.sortBy}
            sortDir={filters.sortDir}
          />
        )}
      </div>

      <p className="shrink-0 text-xs text-muted-foreground">
        USPTO screening results are for knockout purposes only and do not constitute legal advice.
      </p>

      <DeepClearanceActionBar
        isPending={deepClearanceMutation.isPending}
        isTerminalComplete={isVersionComplete}
        isRunStateEligible={isDeepClearanceRunStateEligible}
        onRunDeepClearance={() => {
          setIsDeepClearanceDialogOpen(true)
        }}
        selectedCount={selectedForClearanceCount}
        showingCount={showingCount}
        totalCount={totalCount}
      />

      <DeepClearanceConfirmDialog
        isPending={deepClearanceMutation.isPending}
        isTerminalComplete={isVersionComplete}
        isRunStateEligible={isDeepClearanceRunStateEligible}
        onConfirm={handleRunDeepClearance}
        onOpenChange={setIsDeepClearanceDialogOpen}
        open={isDeepClearanceDialogOpen}
        selectedNames={selectedForClearanceNames}
      />

      <NameDetailDrawer
        candidate={selectedNameCandidate}
        onClose={() => {
          setSelectedNameId(null)
        }}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedNameId(null)
          }
        }}
        onReturnFocus={() => {
          lastDrawerTriggerRef.current?.focus()
        }}
        onToggleSelectedForClearance={handleToggleSelectedForClearance}
        onToggleShortlisted={handleToggleShortlisted}
        open={selectedNameId !== null}
        runId={runId}
      />
    </section>
  )
}
