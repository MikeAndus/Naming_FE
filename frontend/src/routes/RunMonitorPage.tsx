import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Circle, CircleX, Loader2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { Breadcrumbs } from '@/components/app/Breadcrumbs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { useProjectDetailQuery } from '@/features/projects/queries'
import {
  GATE_DEFINITIONS,
  PHASE_HEADERS,
  getStageLabel,
  type GateDefinition,
} from '@/features/runs/stageMetadata'
import { useRunProgress } from '@/features/runs/useRunProgress'
import { useVersionDetailQuery } from '@/features/versions/queries'
import { cancelRun, getErrorMessage, retryRun, type RunState, type StageCheckpointResponse } from '@/lib/api'
import { toast } from '@/hooks/use-toast'

const ACTIVE_RUN_STATES: RunState[] = [
  'queued',
  'stage_0',
  'stage_1',
  'territory_review',
  'stage_2',
  'stage_3',
  'stage_4',
  'stage_5',
  'stage_6',
  'stage_7',
  'stage_8',
  'generation_review',
  'stage_9',
  'stage_10',
  'stage_11',
]

type StageRow = StageCheckpointResponse & {
  label: string
}

type TimelineRow =
  | {
      type: 'stage'
      stage: StageRow
    }
  | {
      type: 'gate'
      gate: GateDefinition
      active: boolean
    }

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

function isTerminalRunState(state: RunState): boolean {
  return state === 'complete' || state === 'failed'
}

function isCancelledRun(progress: Record<string, unknown> | null): boolean {
  if (!progress || typeof progress.cancelled !== 'boolean') {
    return false
  }

  return progress.cancelled
}

function formatDuration(durationMs: number | null): string {
  if (durationMs === null || durationMs < 0) {
    return '-'
  }

  const totalSeconds = Math.floor(durationMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`
  }

  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
}

function getDurationMs(startedAt: string | null, completedAt: string | null, nowMs: number): number | null {
  if (!startedAt) {
    return null
  }

  const startTime = new Date(startedAt).getTime()
  if (Number.isNaN(startTime)) {
    return null
  }

  const endTime = completedAt ? new Date(completedAt).getTime() : nowMs
  if (Number.isNaN(endTime)) {
    return null
  }

  return Math.max(0, endTime - startTime)
}

function parseErrorDetail(errorDetail: string | null): string | null {
  if (!errorDetail?.trim()) {
    return null
  }

  try {
    const parsed = JSON.parse(errorDetail) as unknown

    if (typeof parsed === 'string' && parsed.trim()) {
      return parsed
    }

    if (Array.isArray(parsed)) {
      const firstMessage = parsed.find((item) => typeof item === 'string')
      if (typeof firstMessage === 'string' && firstMessage.trim()) {
        return firstMessage
      }

      return JSON.stringify(parsed)
    }

    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>
      const candidates = [record.detail, record.error, record.message]
      for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim()) {
          return candidate
        }
      }

      return JSON.stringify(parsed)
    }

    return String(parsed)
  } catch {
    return errorDetail
  }
}

function getFailedStageMessage(stage: StageRow | null, runErrorDetail: string | null): string {
  if (stage?.summary?.trim()) {
    return stage.summary
  }

  if (runErrorDetail?.trim()) {
    return runErrorDetail
  }

  return 'Stage failed. See logs.'
}

function getRunStateBadgeClass(state: RunState): string {
  if (state === 'complete') {
    return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
  }
  if (state === 'failed') {
    return 'bg-destructive text-destructive-foreground hover:bg-destructive'
  }
  if (ACTIVE_RUN_STATES.includes(state)) {
    return 'bg-amber-100 text-amber-800 hover:bg-amber-100'
  }
  return ''
}

function getConnectionTone(connectionState: 'live' | 'reconnecting' | 'polling' | 'idle'): string {
  if (connectionState === 'live') {
    return 'text-emerald-700'
  }
  if (connectionState === 'reconnecting') {
    return 'text-amber-700'
  }
  if (connectionState === 'polling') {
    return 'text-blue-700'
  }
  return 'text-muted-foreground'
}

function getConnectionLabel(connectionState: 'live' | 'reconnecting' | 'polling' | 'idle'): string {
  if (connectionState === 'live') {
    return 'Live'
  }
  if (connectionState === 'reconnecting') {
    return 'Reconnecting'
  }
  if (connectionState === 'polling') {
    return 'Polling'
  }
  return 'Idle'
}

function getStageStatusIcon(status: StageCheckpointResponse['status']) {
  if (status === 'running') {
    return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
  }
  if (status === 'complete') {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" />
  }
  if (status === 'failed') {
    return <CircleX className="h-4 w-4 text-destructive" />
  }
  return <Circle className="h-4 w-4 text-muted-foreground" />
}

function buildStageRows(stages: StageCheckpointResponse[] | undefined): StageRow[] {
  const stageMap = new Map(stages?.map((stage) => [stage.stage_id, stage] as const) ?? [])

  return Array.from({ length: 12 }).map((_, stageId) => {
    const stage = stageMap.get(stageId)

    if (stage) {
      return {
        ...stage,
        label: getStageLabel(stageId),
      }
    }

    return {
      id: `stage-${stageId}`,
      stage_id: stageId,
      status: 'pending',
      progress_pct: 0,
      summary: null,
      started_at: null,
      completed_at: null,
      label: getStageLabel(stageId),
    }
  })
}

function StageCard({
  stage,
  failedMessage,
  nowMs,
}: {
  stage: StageRow
  failedMessage: string | null
  nowMs: number
}) {
  const isPending = stage.status === 'pending'
  const isRunning = stage.status === 'running'
  const isComplete = stage.status === 'complete'
  const isFailed = stage.status === 'failed'
  const stageDuration = isComplete
    ? getDurationMs(stage.started_at, stage.completed_at, nowMs)
    : null

  return (
    <motion.article
      className={`rounded-lg border bg-background p-4 ${
        isPending ? 'border-muted bg-muted/20 text-muted-foreground' : ''
      }`}
      layout
      transition={{ duration: 0.22 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Stage {stage.stage_id}</p>
          <p className="text-sm font-semibold">{stage.label}</p>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            initial={{ opacity: 0, y: 4 }}
            key={stage.status}
            transition={{ duration: 0.2 }}
          >
            {getStageStatusIcon(stage.status)}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {isRunning ? (
          <motion.div
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3"
            exit={{ opacity: 0, height: 0 }}
            initial={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Progress value={stage.progress_pct} />
            <p className="mt-1 text-xs text-muted-foreground">{stage.progress_pct}%</p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {isComplete ? (
        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
          <p>Elapsed: {formatDuration(stageDuration)}</p>
          {stage.summary ? <p>{stage.summary}</p> : null}
        </div>
      ) : null}

      <AnimatePresence initial={false}>
        {isFailed ? (
          <motion.div
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            exit={{ opacity: 0, height: 0 }}
            initial={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
          >
            {failedMessage ?? 'Stage failed. See logs.'}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.article>
  )
}

function GateCard({ active, label }: { active: boolean; label: string }) {
  return (
    <motion.article
      className={`rounded-lg border border-dashed px-4 py-3 ${
        active ? 'border-amber-300 bg-amber-50/70 text-amber-900' : 'text-muted-foreground'
      }`}
      layout
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Gate: {label}</p>
        {active ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline">Waiting</Badge>}
      </div>
    </motion.article>
  )
}

function RunTimelineSkeleton() {
  return (
    <section className="space-y-6">
      {PHASE_HEADERS.map((phaseHeader) => (
        <div className="space-y-3" key={phaseHeader.phase}>
          <div className="h-5 w-72 animate-pulse rounded bg-muted" />
          {phaseHeader.stage_ids.map((stageId) => (
            <div className="rounded-lg border bg-background p-4" key={stageId}>
              <div className="animate-pulse space-y-3">
                <div className="h-4 w-48 rounded bg-muted" />
                <div className="h-4 w-full rounded bg-muted" />
                <div className="h-2 w-1/2 rounded bg-muted" />
              </div>
            </div>
          ))}
          {GATE_DEFINITIONS.some((gate) => gate.after_stage_id === phaseHeader.stage_ids.at(-1)) ? (
            <div className="rounded-lg border border-dashed p-4">
              <div className="h-4 w-56 animate-pulse rounded bg-muted" />
            </div>
          ) : null}
        </div>
      ))}
    </section>
  )
}

export function RunMonitorPage() {
  const { projectId, versionId } = useParams<{ projectId: string; versionId: string }>()
  const isDesktop = useIsDesktop()
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)

  const projectQuery = useProjectDetailQuery(projectId)
  const versionQuery = useVersionDetailQuery(versionId)
  const latestRunId = versionQuery.data?.latest_run_id ?? null

  const {
    connectionState,
    error: runProgressError,
    start: startRunProgress,
    status: runStatus,
  } = useRunProgress({
    runId: latestRunId,
    enabled: isDesktop && Boolean(latestRunId),
  })

  const cancelMutation = useMutation({
    mutationFn: (runId: string) => cancelRun(runId),
    meta: {
      suppressGlobalErrorToast: true,
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to cancel run',
        description: getErrorMessage(error, 'Please try again.'),
      })
    },
    onSuccess: () => {
      toast({
        title: 'Cancel requested',
        description: 'The run is being cancelled.',
      })
    },
  })

  const retryMutation = useMutation({
    mutationFn: (runId: string) => retryRun(runId),
    meta: {
      suppressGlobalErrorToast: true,
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to retry run',
        description: getErrorMessage(error, 'Please try again.'),
      })
    },
    onSuccess: (retriedRun) => {
      startRunProgress()
      toast({
        title: 'Retry started',
        description: `Resumed run ${retriedRun.id}.`,
      })
    },
  })

  useEffect(() => {
    if (!runStatus?.started_at || isTerminalRunState(runStatus.state)) {
      return
    }

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [runStatus?.started_at, runStatus?.state])

  const stageRows = useMemo(() => buildStageRows(runStatus?.stages), [runStatus?.stages])

  const failedStage = useMemo(() => {
    for (let index = stageRows.length - 1; index >= 0; index -= 1) {
      if (stageRows[index].status === 'failed') {
        return stageRows[index]
      }
    }
    return null
  }, [stageRows])

  const timelineByPhase = useMemo(() => {
    const rowsByPhase = new Map<string, TimelineRow[]>()

    for (const phaseHeader of PHASE_HEADERS) {
      const rows: TimelineRow[] = []

      for (const stageId of phaseHeader.stage_ids) {
        const stage = stageRows[stageId]
        if (stage) {
          rows.push({ type: 'stage', stage })
        }
      }

      const gate = GATE_DEFINITIONS.find(
        (entry) => entry.after_stage_id === phaseHeader.stage_ids[phaseHeader.stage_ids.length - 1],
      )
      if (gate) {
        rows.push({
          type: 'gate',
          gate,
          active: runStatus?.state === gate.run_state,
        })
      }

      rowsByPhase.set(phaseHeader.phase, rows)
    }

    return rowsByPhase
  }, [runStatus?.state, stageRows])

  const runErrorDetail = parseErrorDetail(runStatus?.error_detail ?? null)
  const failedStageMessage = getFailedStageMessage(failedStage, runErrorDetail)
  const isCancelled = isCancelledRun(runStatus?.progress ?? null)
  const canRetry = runStatus?.state === 'failed' && !isCancelled && Boolean(failedStage)
  const canCancel = Boolean(latestRunId) && (runStatus ? !isTerminalRunState(runStatus.state) : false)

  const elapsedMs = getDurationMs(
    runStatus?.started_at ?? null,
    isTerminalRunState(runStatus?.state ?? 'queued') ? runStatus?.completed_at ?? null : null,
    nowMs,
  )

  const projectLabel = projectQuery.data?.name?.trim() || 'Project'
  const versionLabel =
    versionQuery.data?.version_number !== undefined
      ? `v${versionQuery.data.version_number}`
      : versionId
        ? `v${versionId.slice(0, 8)}`
        : 'Version'

  if (!projectId || !versionId) {
    return (
      <section className="space-y-4">
        <h1 className="text-xl font-semibold">Run Monitor unavailable</h1>
        <p className="text-sm text-muted-foreground">
          A project and version id are required to view run progress.
        </p>
        <Button asChild>
          <Link to="/projects">Back to Dashboard</Link>
        </Button>
      </section>
    )
  }

  if (!isDesktop) {
    return (
      <section className="space-y-4">
        <Breadcrumbs
          items={[
            { label: 'Projects', to: '/projects' },
            { label: projectLabel, to: `/projects/${projectId}` },
            { label: versionLabel, to: `/projects/${projectId}/versions/${versionId}` },
            { label: 'Run' },
          ]}
        />
        <div className="rounded-lg border bg-background p-6">
          <h1 className="text-lg font-semibold">Best viewed on desktop</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Open this page on a larger viewport to see the full run timeline.
          </p>
        </div>
      </section>
    )
  }

  if (versionQuery.isLoading) {
    return (
      <section className="space-y-6 pb-28">
        <div className="space-y-2">
          <div className="h-4 w-80 animate-pulse rounded bg-muted" />
          <div className="h-8 w-96 animate-pulse rounded bg-muted" />
        </div>
        <RunTimelineSkeleton />
      </section>
    )
  }

  if (versionQuery.isError || !versionQuery.data) {
    return (
      <section className="space-y-5">
        <Breadcrumbs
          items={[
            { label: 'Projects', to: '/projects' },
            { label: projectLabel, to: `/projects/${projectId}` },
            { label: 'Run' },
          ]}
        />
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6">
          <h1 className="text-xl font-semibold text-destructive">Unable to load version</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {getErrorMessage(versionQuery.error, 'Please try again.')}
          </p>
          <div className="mt-4">
            <Button onClick={() => void versionQuery.refetch()} type="button" variant="outline">
              Retry
            </Button>
          </div>
        </div>
      </section>
    )
  }

  if (!latestRunId) {
    return (
      <section className="space-y-6 pb-28">
        <header className="space-y-3">
          <Breadcrumbs
            items={[
              { label: 'Projects', to: '/projects' },
              { label: projectLabel, to: `/projects/${projectId}` },
              { label: versionLabel, to: `/projects/${projectId}/versions/${versionId}` },
              { label: 'Run' },
            ]}
          />
          <div className="flex items-center gap-2">
            <Badge>{versionLabel}</Badge>
            <Badge variant="outline">No run</Badge>
          </div>
        </header>

        <div className="rounded-lg border bg-background p-6">
          <h1 className="text-xl font-semibold">No run started yet</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Go to Version Builder to configure inputs and start a run.
          </p>
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link to={`/projects/${projectId}/versions/${versionId}`}>Go to Version Builder</Link>
            </Button>
          </div>
        </div>

      <RunActionBar
        backHref={`/projects/${projectId}/versions/${versionId}`}
        canCancel={false}
        showRetry={false}
        retryDisabled
        cancelDialogOpen={cancelDialogOpen}
        cancelLabel="Cancel Run"
        onCancelConfirm={() => undefined}
        onCancelDialogOpenChange={setCancelDialogOpen}
        onRetry={() => undefined}
          retryLabel="Retry"
        />
      </section>
    )
  }

  const showInitialRunSkeleton =
    !runStatus && !runProgressError && !versionQuery.isError && !versionQuery.isLoading

  return (
    <section className="space-y-6 pb-28">
      <header className="space-y-3">
        <Breadcrumbs
          items={[
            { label: 'Projects', to: '/projects' },
            { label: projectLabel, to: `/projects/${projectId}` },
            { label: versionLabel, to: `/projects/${projectId}/versions/${versionId}` },
            { label: 'Run' },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Badge>{versionLabel}</Badge>
          {runStatus ? (
            <Badge className={getRunStateBadgeClass(runStatus.state)}>
              {runStatus.state.replaceAll('_', ' ')}
            </Badge>
          ) : (
            <Badge variant="outline">Loading run</Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Elapsed:</span> {formatDuration(elapsedMs)}
          </p>
          <p>
            <span className="font-medium text-foreground">Connection:</span>{' '}
            <span className={getConnectionTone(connectionState)}>
              {getConnectionLabel(connectionState)}
            </span>
          </p>
        </div>
      </header>

      {showInitialRunSkeleton ? <RunTimelineSkeleton /> : null}

      {runProgressError && !runStatus ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-5">
          <p className="text-sm font-medium text-destructive">Unable to connect to run updates.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {getErrorMessage(runProgressError, 'Please try reconnecting.')}
          </p>
          <div className="mt-4">
            <Button onClick={startRunProgress} type="button" variant="outline">
              Reconnect
            </Button>
          </div>
        </div>
      ) : null}

      {runStatus ? (
        <div className="space-y-6">
          {PHASE_HEADERS.map((phaseHeader) => (
            <section className="space-y-3" key={phaseHeader.phase}>
              <h2 className="text-sm font-semibold tracking-wide text-muted-foreground">
                {phaseHeader.label}
              </h2>
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {(timelineByPhase.get(phaseHeader.phase) ?? []).map((row) => {
                    if (row.type === 'gate') {
                      return (
                        <motion.div
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          initial={{ opacity: 0, y: 6 }}
                          key={`gate-${row.gate.after_stage_id}`}
                          layout
                          transition={{ duration: 0.2 }}
                        >
                          <GateCard active={row.active} label={row.gate.label} />
                        </motion.div>
                      )
                    }

                    return (
                      <motion.div
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        initial={{ opacity: 0, y: 6 }}
                        key={`stage-${row.stage.stage_id}`}
                        layout
                        transition={{ duration: 0.22 }}
                      >
                        <StageCard
                          failedMessage={
                            row.stage.status === 'failed'
                              ? getFailedStageMessage(row.stage, runErrorDetail)
                              : null
                          }
                          nowMs={nowMs}
                          stage={row.stage}
                        />
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </section>
          ))}
        </div>
      ) : null}

      <RunActionBar
        backHref={`/projects/${projectId}/versions/${versionId}`}
        canCancel={canCancel && !cancelMutation.isPending}
        showRetry={canRetry || retryMutation.isPending}
        retryDisabled={retryMutation.isPending}
        cancelDialogOpen={cancelDialogOpen}
        cancelLabel={cancelMutation.isPending ? 'Cancelling...' : 'Cancel Run'}
        onCancelConfirm={() => {
          if (!latestRunId) {
            return
          }

          cancelMutation.mutate(latestRunId, {
            onSettled: () => {
              setCancelDialogOpen(false)
              startRunProgress()
            },
          })
        }}
        onCancelDialogOpenChange={setCancelDialogOpen}
        onRetry={() => {
          if (!latestRunId) {
            return
          }
          retryMutation.mutate(latestRunId)
        }}
        retryLabel={
          retryMutation.isPending
            ? 'Retrying...'
            : failedStage
              ? `Retry from Stage ${failedStage.stage_id}`
              : 'Retry'
        }
      />

      {runStatus?.state === 'failed' && failedStage ? (
        <p className="text-xs text-muted-foreground">
          Latest failure at Stage {failedStage.stage_id}: {failedStageMessage}
        </p>
      ) : null}
    </section>
  )
}

function RunActionBar({
  backHref,
  canCancel,
  showRetry,
  retryDisabled,
  cancelDialogOpen,
  cancelLabel,
  onCancelConfirm,
  onCancelDialogOpenChange,
  onRetry,
  retryLabel,
}: {
  backHref: string
  canCancel: boolean
  showRetry: boolean
  retryDisabled: boolean
  cancelDialogOpen: boolean
  cancelLabel: string
  onCancelConfirm: () => void
  onCancelDialogOpenChange: (open: boolean) => void
  onRetry: () => void
  retryLabel: string
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <Dialog onOpenChange={onCancelDialogOpenChange} open={cancelDialogOpen}>
            <Button
              disabled={!canCancel}
              onClick={() => onCancelDialogOpenChange(true)}
              type="button"
              variant="destructive"
            >
              {cancelLabel}
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cancel this run?</DialogTitle>
                <DialogDescription>
                  Cancel this run? Progress up to the current stage will be preserved.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={() => onCancelDialogOpenChange(false)} type="button" variant="outline">
                  Keep running
                </Button>
                <Button onClick={onCancelConfirm} type="button" variant="destructive">
                  Confirm cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {showRetry ? (
            <Button disabled={retryDisabled} onClick={onRetry} type="button" variant="secondary">
              {retryLabel}
            </Button>
          ) : null}
        </div>

        <Button asChild type="button" variant="link">
          <Link to={backHref}>Back</Link>
        </Button>
      </div>
    </div>
  )
}
