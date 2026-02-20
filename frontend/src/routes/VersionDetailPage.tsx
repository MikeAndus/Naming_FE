import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { RefreshCcw, WifiOff } from 'lucide-react'
import { Link, Navigate, Outlet, useLocation, useParams } from 'react-router-dom'

import { Breadcrumbs } from '@/components/app/Breadcrumbs'
import { InlineBanner } from '@/components/app/InlineBanner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { reconcileRunNamesCachesFromAuthoritativeList } from '@/features/names/optimistic'
import { runNamesQueryKey, useRunNamesQuery } from '@/features/names/queries'
import { useProjectDetailQuery } from '@/features/projects/queries'
import { useRunProgress } from '@/features/runs/useRunProgress'
import { getHighestStateOrder, getStateOrder } from '@/features/versions/stateOrder'
import { useVersionDetailQuery } from '@/features/versions/queries'
import { getErrorMessage, type NameCandidateListQueryParams, type RunState } from '@/lib/api'
import { type VersionDetailOutletContextValue } from '@/routes/versionDetailContext'

type VersionDetailTabId = 'results' | 'executive-summary' | 'run-monitor'

const POLLING_INTERVAL_MS = 5000
const PHASE_3_RUNNING_STATES = new Set<RunState>(['stage_9', 'stage_10', 'stage_11'])
const RESULTS_VISIBLE_STATES = new Set([
  'generation_review',
  'phase_3_running',
  'stage_9',
  'stage_10',
  'stage_11',
  'complete',
])
const EXECUTIVE_SUMMARY_MIN_STATE = 'territory_review'
const POLLING_QUERY_PARAMS: NameCandidateListQueryParams = {
  limit: 100,
  offset: 0,
  selected_for_final: true,
  sort_by: 'score',
  sort_dir: 'desc',
}

function formatStateLabel(state: string): string {
  return state.replaceAll('_', ' ')
}

function getActiveTab(pathname: string): VersionDetailTabId | null {
  if (pathname.endsWith('/results') || pathname.endsWith('/generation-review')) {
    return 'results'
  }

  if (pathname.endsWith('/executive-summary')) {
    return 'executive-summary'
  }

  if (pathname.endsWith('/run-monitor') || pathname.endsWith('/run')) {
    return 'run-monitor'
  }

  return null
}

function getComparableRunState(state: RunState | null, currentStage: number | null): string | null {
  if (state !== 'failed') {
    return state
  }

  if (currentStage === null || currentStage < 0) {
    return null
  }

  return `stage_${currentStage}`
}

export function VersionDetailPage() {
  const { projectId, versionId } = useParams<{ projectId: string; versionId: string }>()
  const location = useLocation()
  const queryClient = useQueryClient()
  const isMissingParams = !projectId || !versionId

  const projectQuery = useProjectDetailQuery(projectId ?? undefined)
  const versionQuery = useVersionDetailQuery(versionId ?? undefined)

  const runId = versionQuery.data?.latest_run_id ?? null
  const runProgress = useRunProgress({
    runId,
    enabled: Boolean(runId),
  })

  const comparableRunState = getComparableRunState(
    runProgress.status?.state ?? null,
    runProgress.status?.current_stage ?? null,
  )
  const visibilityStates = [comparableRunState, versionQuery.data?.state]
  const effectiveStateOrder = getHighestStateOrder(versionQuery.data?.state, comparableRunState)
  const executiveSummaryThreshold = getStateOrder(EXECUTIVE_SUMMARY_MIN_STATE)
  const isResultsVisible = visibilityStates.some((state) =>
    state !== null && state !== undefined ? RESULTS_VISIBLE_STATES.has(state) : false,
  )
  const isExecutiveSummaryVisible =
    effectiveStateOrder !== null &&
    executiveSummaryThreshold !== null &&
    effectiveStateOrder >= executiveSummaryThreshold
  const isRunMonitorVisible = true

  const runState = runProgress.status?.state ?? null
  const isPhase3Running =
    versionQuery.data?.state === 'phase_3_running' ||
    comparableRunState === 'phase_3_running' ||
    (runState !== null && PHASE_3_RUNNING_STATES.has(runState))
  const isStreamDegraded =
    runProgress.connectionState === 'reconnecting' || runProgress.connectionState === 'polling'
  const shouldPollNames = Boolean(runId && isPhase3Running && isStreamDegraded)
  const pollingQueryKey = runId ? runNamesQueryKey(runId, POLLING_QUERY_PARAMS) : null

  const namesPollingQuery = useRunNamesQuery(runId ?? undefined, POLLING_QUERY_PARAMS, {
    enabled: shouldPollNames,
    refetchInterval: shouldPollNames ? POLLING_INTERVAL_MS : false,
    refetchOnWindowFocus: false,
    meta: {
      suppressGlobalErrorToast: true,
    },
  })

  useEffect(() => {
    if (!runId || !namesPollingQuery.data || !pollingQueryKey) {
      return
    }

    reconcileRunNamesCachesFromAuthoritativeList(queryClient, {
      runId,
      source: namesPollingQuery.data,
      skipQueryKey: pollingQueryKey,
    })
  }, [namesPollingQuery.data, pollingQueryKey, queryClient, runId])

  if (isMissingParams) {
    return (
      <section className="space-y-4">
        <Breadcrumbs items={[{ label: 'Dashboard', to: '/projects' }, { label: 'Version Detail' }]} />
        <Card>
          <CardContent className="pt-6">
            <h1 className="text-lg font-semibold">Version Detail unavailable</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Project and version ids are required to view this page.
            </p>
            <div className="mt-4">
              <Button asChild variant="outline">
                <Link to="/projects">Back to Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    )
  }

  const versionHref = `/projects/${projectId}/versions/${versionId}`
  const projectHref = `/projects/${projectId}`

  const tabs = [
    {
      id: 'results' as const,
      label: 'Results',
      to: `${versionHref}/results`,
      visible: versionQuery.data ? isResultsVisible : true,
    },
    {
      id: 'executive-summary' as const,
      label: 'Executive Summary',
      to: `${versionHref}/executive-summary`,
      visible: versionQuery.data ? isExecutiveSummaryVisible : true,
    },
    {
      id: 'run-monitor' as const,
      label: 'Run Monitor',
      to: `${versionHref}/run-monitor`,
      visible: versionQuery.data ? isRunMonitorVisible : true,
    },
  ].filter((tab) => tab.visible)

  const activeTabId = getActiveTab(location.pathname)
  const firstVisibleTab = tabs[0]

  if (versionQuery.data && activeTabId) {
    const activeTab = tabs.find((tab) => tab.id === activeTabId)
    if (!activeTab && firstVisibleTab) {
      return <Navigate replace to={firstVisibleTab.to} />
    }
  }

  const projectLabel = projectQuery.data?.name?.trim() || 'Project'
  const versionLabel =
    versionQuery.data?.version_number !== undefined
      ? `v${versionQuery.data.version_number}`
      : `v${versionId.slice(0, 8)}`

  const outletContext: VersionDetailOutletContextValue = {
    projectId,
    versionId,
    runId,
    runStatus: runProgress.status,
    connectionState: runProgress.connectionState,
    runProgressError: runProgress.error,
    restartRunProgress: runProgress.start,
  }

  return (
    <section className="space-y-4">
      <header className="space-y-3">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', to: '/projects' },
            { label: projectLabel, to: projectHref },
            { label: versionLabel, to: versionHref },
            { label: 'Version Detail' },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          {tabs.map((tab) => (
            <Button
              asChild
              key={tab.id}
              size="sm"
              variant={activeTabId === tab.id ? 'default' : 'outline'}
            >
              <Link to={tab.to}>{tab.label}</Link>
            </Button>
          ))}
        </div>

        {runId && isPhase3Running && isStreamDegraded ? (
          <InlineBanner
            description={
              runProgress.connectionState === 'polling'
                ? 'Realtime stream degraded. Polling names every 5s until SSE reconnects.'
                : 'Reconnecting to live run updates...'
            }
            icon={<WifiOff className="h-4 w-4" />}
            title="Reconnecting..."
            variant="warning"
          />
        ) : null}

        {shouldPollNames && namesPollingQuery.isError ? (
          <InlineBanner
            action={
              <Button
                onClick={() => {
                  void namesPollingQuery.refetch()
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                <RefreshCcw className="mr-1 h-3.5 w-3.5" /> Retry
              </Button>
            }
            description={getErrorMessage(namesPollingQuery.error, 'Please try again.')}
            title="Polling fallback failed"
            variant="destructive"
          />
        ) : null}

        {runProgress.error && !runProgress.status ? (
          <InlineBanner
            description={getErrorMessage(runProgress.error, 'Please try again.')}
            title="Run stream error"
            variant="destructive"
          />
        ) : null}

        {runState ? (
          <p className="text-xs text-muted-foreground">
            Current run state: <span className="font-medium text-foreground">{formatStateLabel(runState)}</span>
          </p>
        ) : null}
      </header>

      <Outlet context={outletContext} />
    </section>
  )
}
