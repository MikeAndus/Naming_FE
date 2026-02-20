import { useMemo, useState, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'

import { Breadcrumbs } from '@/components/app/Breadcrumbs'
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
import { getNormalizedFastClearanceStatus } from '@/features/names/fast-clearance'
import {
  createDefaultNamesFilters,
  getNamesFilterScoreRange,
  isNamesFilterStateActive,
  sortTerritoryOptions,
  type NamesFilterState,
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
import { type NameCandidateResponse, getErrorMessage, type RunState } from '@/lib/api'
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
      description: 'Generation Review becomes available after the run reaches generation review.',
    }
  }

  if (runState === 'territory_review') {
    return {
      buttonLabel: 'Review Territory Cards',
      href: paths.territoryReviewHref,
      description: 'Finish Territory Review to continue this run toward Generation Review.',
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

function getCompositeScore(candidate: NameCandidateResponse): number {
  const value = candidate.scores.composite
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return Number.NEGATIVE_INFINITY
  }

  return value
}

function compareNameCandidates(left: NameCandidateResponse, right: NameCandidateResponse): number {
  const leftRank = left.rank ?? Number.POSITIVE_INFINITY
  const rightRank = right.rank ?? Number.POSITIVE_INFINITY
  if (leftRank !== rightRank) {
    return leftRank - rightRank
  }

  const leftScore = getCompositeScore(left)
  const rightScore = getCompositeScore(right)
  if (leftScore !== rightScore) {
    return rightScore - leftScore
  }

  return left.name_text.localeCompare(right.name_text)
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

  const shouldLoadNames = Boolean(
    isDesktop && runId && resolvedRunState && !unavailableCta && projectId && versionId,
  )
  const namesQuery = useRunNamesQuery(
    shouldLoadNames ? runId : undefined,
    {
      limit: 100,
      offset: 0,
      sort_by: 'rank',
      sort_dir: 'asc',
      selected_for_final: true,
    },
    {
      enabled: shouldLoadNames,
    },
  )

  const [filters, setFilters] = useState<NamesFilterState>(() => createDefaultNamesFilters())
  const [selectedNameId, setSelectedNameId] = useState<string | null>(null)
  const [isDeepClearanceDialogOpen, setIsDeepClearanceDialogOpen] = useState(false)
  const patchNameCandidateMutation = usePatchNameCandidateMutation()
  const deepClearanceMutation = useRunDeepClearanceMutation()
  const debouncedSearch = useDebouncedValue(filters.search, 300)

  const allNames = namesQuery.data?.items ?? EMPTY_NAMES
  const selectedNameCandidate = useMemo(
    () => allNames.find((candidate) => candidate.id === selectedNameId) ?? null,
    [allNames, selectedNameId],
  )
  const territoryOptions = useMemo(() => sortTerritoryOptions(allNames), [allNames])

  const scoreRange = useMemo(() => getNamesFilterScoreRange(filters), [filters])

  const filteredNames = useMemo(() => {
    const searchValue = debouncedSearch.trim().toLowerCase()

    return allNames
      .filter((candidate) => {
        if (searchValue && !candidate.name_text.toLowerCase().includes(searchValue)) {
          return false
        }

        if (filters.families.length > 0 && !filters.families.includes(candidate.family)) {
          return false
        }

        if (
          filters.territories.length > 0 &&
          !filters.territories.includes(candidate.territory_card_id)
        ) {
          return false
        }

        if (filters.formats.length > 0 && !filters.formats.includes(candidate.format)) {
          return false
        }

        if (filters.shortlistedOnly && !candidate.shortlisted) {
          return false
        }

        const clearanceStatus = getNormalizedFastClearanceStatus(candidate.fast_clearance)
        if (
          filters.clearanceStatuses.length > 0 &&
          !filters.clearanceStatuses.includes(clearanceStatus)
        ) {
          return false
        }

        const score = getCompositeScore(candidate)
        if (scoreRange.min !== null && score < scoreRange.min) {
          return false
        }
        if (scoreRange.max !== null && score > scoreRange.max) {
          return false
        }

        return true
      })
      .sort(compareNameCandidates)
  }, [
    allNames,
    debouncedSearch,
    filters.clearanceStatuses,
    filters.families,
    filters.formats,
    filters.shortlistedOnly,
    filters.territories,
    scoreRange.max,
    scoreRange.min,
  ])

  const totalCount = namesQuery.data?.total ?? allNames.length
  const showingCount = filteredNames.length
  const starredCount = filteredNames.filter((candidate) => candidate.shortlisted).length
  const selectedVisibleCount = filteredNames.filter(
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

  const isNamesLoading = namesQuery.isLoading || (namesQuery.isFetching && !namesQuery.data)
  const isDeepClearanceRunStateEligible = resolvedRunState === 'generation_review'
  const isVersionPhase3Running = versionQuery.data?.state === 'phase_3_running'
  const isVersionComplete = versionQuery.data?.state === 'complete'

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
        <h1 className="text-xl font-semibold">Generation Review unavailable</h1>
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
        <Card>
          <CardHeader>
            <CardTitle>Loading Generation Review</CardTitle>
          </CardHeader>
        </Card>
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
            <CardTitle>Generation Review unavailable</CardTitle>
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
        <Card>
          <CardHeader>
            <CardTitle>Loading run state</CardTitle>
          </CardHeader>
        </Card>
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
            <CardTitle>Generation Review unavailable</CardTitle>
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

              <div className="text-sm text-muted-foreground">
                Showing {showingCount} of {totalCount}
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
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border bg-background">
        <NamesTable
          errorMessage={getErrorMessage(namesQuery.error, 'Please try again.')}
          hasActiveFilters={hasActiveFilters}
          isError={namesQuery.isError}
          isLoading={isNamesLoading}
          isPhase3Running={isVersionPhase3Running}
          items={filteredNames}
          onClearFilters={() => {
            setFilters(createDefaultNamesFilters())
          }}
          onRowClick={(candidate) => {
            setSelectedNameId(candidate.id)
          }}
          onRetry={() => {
            void namesQuery.refetch()
          }}
          onToggleSelectedForClearance={handleToggleSelectedForClearance}
          onToggleShortlisted={handleToggleShortlisted}
        />
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
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedNameId(null)
          }
        }}
        onToggleSelectedForClearance={handleToggleSelectedForClearance}
        onToggleShortlisted={handleToggleShortlisted}
        open={selectedNameId !== null}
        runId={runId}
      />
    </section>
  )
}
