import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Circle, CircleX, Loader2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Breadcrumbs } from '@/components/app/Breadcrumbs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { useProjectDetailQuery } from '@/features/projects/queries'
import {
  useCancelRunMutation,
  useRetryRunMutation,
  useStartRunMutation,
} from '@/features/runs/queries'
import {
  GATE_DEFINITIONS,
  PHASE_HEADERS,
  getStageLabel,
  type GateDefinition,
} from '@/features/runs/stageMetadata'
import { useVersionDetailQuery } from '@/features/versions/queries'
import {
  getErrorMessage,
  type RunStageIndex,
  type RunState,
  type RunStatusResponse,
  type StageCheckpointResponse,
} from '@/lib/api'
import { useVersionDetailOutletContext } from '@/routes/versionDetailContext'
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

function clampProgress(progressPct: number): number {
  if (!Number.isFinite(progressPct)) {
    return 0
  }

  return Math.min(100, Math.max(0, Math.round(progressPct)))
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

function getNonNegativeInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.round(value)
  }

  return null
}

function isPhase3Stage(stageId: number): boolean {
  return stageId >= 9 && stageId <= 11
}

function getStageCheckedTotal(stage: StageRow): { checked: number | null; total: number | null } {
  if (!isPhase3Stage(stage.stage_id)) {
    return {
      checked: null,
      total: null,
    }
  }

  const artifacts = asRecord(stage.artifacts)
  if (!artifacts) {
    return {
      checked: null,
      total: null,
    }
  }

  return {
    checked: getNonNegativeInteger(artifacts.checked),
    total: getNonNegativeInteger(artifacts.total),
  }
}

function selectProgressPct(
  stage: StageRow,
  checked: number | null,
  total: number | null,
): number {
  const reportedProgress = clampProgress(stage.progress_pct)
  if (checked === null || total === null || total <= 0) {
    return reportedProgress
  }

  const computedProgress = clampProgress((checked / total) * 100)
  const progressDrift = Math.abs(reportedProgress - computedProgress)
  if (
    progressDrift > 35 ||
    (reportedProgress === 0 && checked > 0) ||
    (reportedProgress === 100 && checked < total)
  ) {
    return computedProgress
  }

  return reportedProgress
}

function formatStatusBreakdown(
  statuses: Record<string, unknown> | null,
  order: Array<{ key: string; label: string }>,
): string | null {
  if (!statuses) {
    return null
  }

  const parts = order
    .map(({ key, label }) => {
      const count = getNonNegativeInteger(statuses[key])
      if (count === null) {
        return null
      }

      return `${label} ${count}`
    })
    .filter((part): part is string => Boolean(part))

  if (parts.length === 0) {
    return null
  }

  return parts.join(' • ')
}

function getPerPlatformSummary(stage: StageRow): string | null {
  const artifacts = asRecord(stage.artifacts)
  const rawPerPlatformSummary = asRecord(artifacts?.per_platform_summary)
  if (!rawPerPlatformSummary) {
    return null
  }

  const platformSummaries = Object.entries(rawPerPlatformSummary)
    .map(([platform, rawSummary]) => {
      const summary = asRecord(rawSummary)
      if (!summary) {
        return null
      }

      const clear = getNonNegativeInteger(summary.clear)
      const busy = getNonNegativeInteger(summary.busy)
      const mixed = getNonNegativeInteger(summary.mixed)
      const unknown = getNonNegativeInteger(summary.unknown)
      const parts = [
        clear !== null ? `clear ${clear}` : null,
        busy !== null ? `busy ${busy}` : null,
        mixed !== null ? `mixed ${mixed}` : null,
        unknown !== null ? `unknown ${unknown}` : null,
      ].filter((part): part is string => Boolean(part))

      if (parts.length === 0) {
        return null
      }

      return `${platform}: ${parts.join(', ')}`
    })
    .filter((entry): entry is string => Boolean(entry))

  if (platformSummaries.length === 0) {
    return null
  }

  return platformSummaries.join('; ')
}

function getStageCompletionBreakdown(stage: StageRow): string | null {
  const artifacts = asRecord(stage.artifacts)
  if (!artifacts) {
    return null
  }

  if (stage.stage_id === 9) {
    return formatStatusBreakdown(asRecord(artifacts.statuses), [
      { key: 'green', label: 'Green' },
      { key: 'amber', label: 'Amber' },
      { key: 'red', label: 'Red' },
      { key: 'unknown', label: 'Unknown' },
    ])
  }

  if (stage.stage_id === 10) {
    return formatStatusBreakdown(asRecord(artifacts.statuses), [
      { key: 'available', label: 'Available' },
      { key: 'taken', label: 'Taken' },
      { key: 'unknown', label: 'Unknown' },
    ])
  }

  if (stage.stage_id === 11) {
    return getPerPlatformSummary(stage)
  }

  return null
}

function getStageCompletionSummary(stage: StageRow): string | null {
  const summary = stage.summary?.trim() || null
  const breakdown = getStageCompletionBreakdown(stage)
  if (summary && breakdown) {
    return `${summary} • ${breakdown}`
  }

  return summary ?? breakdown
}

function getActiveStageFallbackSummary(stage: StageRow): string {
  if (stage.stage_id === 0) {
    return 'Research snapshot is in progress.'
  }
  if (stage.stage_id === 1) {
    return 'Generating territory cards...'
  }
  if (stage.stage_id === 2) {
    return 'Generating candidates...'
  }
  if (stage.stage_id === 3) {
    return 'Cleaning and deduplicating candidates...'
  }
  if (stage.stage_id === 9) {
    return 'Running trademark deep clearance...'
  }
  if (stage.stage_id === 10) {
    return 'Checking .com availability...'
  }
  if (stage.stage_id === 11) {
    return 'Checking social handles...'
  }
  return 'Stage is in progress.'
}

function getActiveStageLine(stage: StageRow): string {
  if (stage.status === 'complete') {
    return 'Completed.'
  }

  if (stage.status === 'failed') {
    return 'Stage failed. Review details below.'
  }

  return stage.summary?.trim() || getActiveStageFallbackSummary(stage)
}

function getStageIdFromRunState(state: RunState | undefined): number | null {
  if (!state || !state.startsWith('stage_')) {
    return null
  }

  const parsed = Number(state.slice('stage_'.length))
  if (!Number.isInteger(parsed) || parsed < 0) {
    return null
  }

  return parsed
}

function parseErrorDetailPayload(errorDetail: string | null): unknown {
  if (!errorDetail?.trim()) {
    return null
  }

  try {
    return JSON.parse(errorDetail) as unknown
  } catch {
    return errorDetail
  }
}

function getErrorDetailSummary(errorDetail: string | null): string | null {
  const payload = parseErrorDetailPayload(errorDetail)
  if (!payload) {
    return null
  }

  if (typeof payload === 'string') {
    const trimmed = payload.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  if (Array.isArray(payload)) {
    const firstMessage = payload.find((item) => typeof item === 'string')
    if (typeof firstMessage === 'string' && firstMessage.trim()) {
      return firstMessage
    }
    return null
  }

  if (typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    for (const key of ['detail', 'error', 'message']) {
      const candidate = record[key]
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate
      }
    }
  }

  return null
}

function formatErrorDetail(errorDetail: string | null): string {
  const payload = parseErrorDetailPayload(errorDetail)
  if (!payload) {
    return 'No additional error detail was provided.'
  }

  if (typeof payload === 'string') {
    return payload
  }

  try {
    return JSON.stringify(payload, null, 2)
  } catch {
    return String(payload)
  }
}

function toRunStageIndex(value: number | null | undefined): RunStageIndex {
  if (value === null || value === undefined || !Number.isInteger(value)) {
    return 0
  }

  if (value <= 0) {
    return 0
  }

  if (value >= 11) {
    return 11
  }

  return value as RunStageIndex
}

function getFailedStageMessage(stage: StageRow | null, runErrorSummary: string | null): string {
  if (stage?.summary?.trim()) {
    return stage.summary
  }

  if (runErrorSummary?.trim()) {
    return runErrorSummary
  }

  return 'Stage failed. See logs.'
}

function getOverallProgressPct(runStatus: RunStatusResponse | null): number {
  if (!runStatus) {
    return 0
  }

  if (runStatus.state === 'complete') {
    return 100
  }

  const reported = runStatus.progress?.overall_progress_pct
  if (typeof reported === 'number' && Number.isFinite(reported)) {
    return clampProgress(reported)
  }

  const sortedStages = [...runStatus.stages].sort((left, right) => left.stage_id - right.stage_id)
  let completed = 0
  let runningProgress = 0

  for (const stage of sortedStages) {
    if (stage.status === 'complete') {
      completed += 1
      continue
    }

    if (stage.status === 'running') {
      runningProgress = clampProgress(stage.progress_pct)
      break
    }

    if (stage.status === 'failed') {
      runningProgress = clampProgress(stage.progress_pct)
      break
    }

    break
  }

  return clampProgress(((completed * 100 + runningProgress) / (12 * 100)) * 100)
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
  const isPhase3 = isPhase3Stage(stage.stage_id)
  const { checked, total } = getStageCheckedTotal(stage)
  const checkedTotalLabel =
    isPhase3 && checked !== null && total !== null
      ? `${checked}/${total} complete`
      : isPhase3
        ? '—/— complete'
        : null
  const normalizedProgress = selectProgressPct(stage, checked, total)
  const stageDuration = getDurationMs(
    stage.started_at,
    stage.status === 'running' ? null : stage.completed_at,
    nowMs,
  )
  const summary =
    stage.status === 'complete'
      ? getStageCompletionSummary(stage)
      : (stage.summary?.trim() ?? null)

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

      {!isPending ? (
        <div className="mt-3 space-y-1">
          <Progress value={normalizedProgress} />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <p>{checkedTotalLabel ?? `${normalizedProgress}%`}</p>
            <p>
              {checkedTotalLabel ? `${normalizedProgress}% • ` : ''}
              Elapsed: {formatDuration(stageDuration)}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <p>{checkedTotalLabel ?? 'Pending'}</p>
          <p>Elapsed: {formatDuration(stageDuration)}</p>
        </div>
      )}

      {(isRunning || isComplete || isFailed) && summary ? (
        <p className="mt-2 text-sm text-muted-foreground">{summary}</p>
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

function GateCard({
  active,
  gate,
  runState,
  generationReviewHref,
}: {
  active: boolean
  gate: GateDefinition
  runState: RunState | undefined
  generationReviewHref: string
}) {
  const isGenerationReviewGate = gate.run_state === 'generation_review'
  const showGenerationReviewCta =
    isGenerationReviewGate && runState === 'generation_review'

  return (
    <motion.article
      className={`rounded-lg border border-dashed px-4 py-3 ${
        active ? 'border-amber-300 bg-amber-50/70 text-amber-900' : 'text-muted-foreground'
      }`}
      layout
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Gate: {gate.label}</p>
        {active ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline">Waiting</Badge>}
      </div>

      {showGenerationReviewCta ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm">
            Names are ready for curation. Open Generation Review to shortlist and select names.
          </p>
          <Button asChild type="button">
            <Link to={generationReviewHref}>Review Generated Names</Link>
          </Button>
        </div>
      ) : null}
    </motion.article>
  )
}

function ActiveStageSummaryCard({ stage }: { stage: StageRow }) {
  const isPhase3 = isPhase3Stage(stage.stage_id)
  const { checked, total } = getStageCheckedTotal(stage)
  const checkedTotalLabel =
    isPhase3 && checked !== null && total !== null
      ? `${checked}/${total} complete`
      : isPhase3
        ? '—/— complete'
        : null
  const progressPct = selectProgressPct(stage, checked, total)
  const statusLabel =
    stage.status === 'running'
      ? 'In progress'
      : stage.status === 'complete'
        ? 'Completed'
        : stage.status === 'failed'
          ? 'Failed'
          : 'Pending'
  const completionSummary = stage.status === 'complete' ? getStageCompletionSummary(stage) : null
  const activeStageLine = getActiveStageLine(stage)

  return (
    <Card>
      <CardHeader className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Active stage summary</p>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm">
            Stage {stage.stage_id}: {stage.label}
          </CardTitle>
          <Badge variant="outline">{statusLabel}</Badge>
        </div>
        <CardDescription>{activeStageLine}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Progress value={progressPct} />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <p>{checkedTotalLabel ?? `${progressPct}%`}</p>
          <p>{checkedTotalLabel ? `${progressPct}%` : 'Live progress'}</p>
        </div>
        {completionSummary ? (
          <p className="text-sm text-muted-foreground">{completionSummary}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function OverallProgressCard({
  runState,
  currentStageId,
  overallProgressPct,
}: {
  runState: RunState
  currentStageId: number | null
  overallProgressPct: number
}) {
  const stageLabel =
    currentStageId !== null ? `Stage ${currentStageId}: ${getStageLabel(currentStageId)}` : 'No active stage'

  return (
    <Card>
      <CardHeader className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Overall progress</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm">{stageLabel}</CardTitle>
          <Badge variant="outline">{runState.replaceAll('_', ' ')}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <Progress value={overallProgressPct} />
        <p className="text-xs text-muted-foreground">{overallProgressPct}% complete</p>
      </CardContent>
    </Card>
  )
}

function RunErrorPanel({
  failedStageId,
  summary,
  detailText,
}: {
  failedStageId: number | null
  summary: string
  detailText: string
}) {
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardHeader className="space-y-2">
        <CardTitle className="text-base text-destructive">
          {failedStageId !== null ? `Stage ${failedStageId} failed` : 'Run failed'}
        </CardTitle>
        <CardDescription>{summary}</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion collapsible defaultValue="error-detail" type="single">
          <AccordionItem className="border-destructive/30" value="error-detail">
            <AccordionTrigger className="text-destructive hover:no-underline">
              Error details
            </AccordionTrigger>
            <AccordionContent>
              <Textarea className="min-h-28 font-mono text-xs" readOnly value={detailText} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  )
}

function RetryRunDialog({
  open,
  onOpenChange,
  retryStage,
  retryLabel,
  isPending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  retryStage: RunStageIndex
  retryLabel: string
  isPending: boolean
  onConfirm: () => void
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{retryLabel}</DialogTitle>
          <DialogDescription>
            This resumes the current run from Stage {retryStage}. Completed stage outputs remain
            available.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            disabled={isPending}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={isPending} onClick={onConfirm} type="button" variant="secondary">
            {isPending ? 'Retrying...' : `Retry from Stage ${retryStage}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TerritoryReviewPausedCard({ territoryReviewHref }: { territoryReviewHref: string }) {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50/70 p-4 text-amber-900">
      <p className="text-sm font-semibold">Gate reached: Territory Review</p>
      <p className="mt-2 text-sm">
        Stage 1 is complete. This run is paused at Territory Review. Review and confirm territory
        cards to continue to Phase 2.
      </p>
      <div className="mt-4">
        <Button asChild type="button">
          <Link to={territoryReviewHref}>Review Territory Cards</Link>
        </Button>
      </div>
    </div>
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
  const versionDetailContext = useVersionDetailOutletContext()
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [retryDialogOpen, setRetryDialogOpen] = useState(false)
  const [startOverDialogOpen, setStartOverDialogOpen] = useState(false)
  const hasRedirectedToResultsRef = useRef(false)

  const projectQuery = useProjectDetailQuery(projectId)
  const versionQuery = useVersionDetailQuery(versionId)
  const latestRunId = versionDetailContext?.runId ?? versionQuery.data?.latest_run_id ?? null
  const executiveSummaryHref = latestRunId
    ? `/projects/${projectId}/versions/${versionId}/executive-summary`
    : null

  const connectionState = versionDetailContext?.connectionState ?? 'idle'
  const runProgressError = versionDetailContext?.runProgressError ?? null
  const startRunProgress = versionDetailContext?.restartRunProgress ?? (() => undefined)
  const runStatus = versionDetailContext?.runStatus ?? null

  const cancelMutation = useCancelRunMutation()
  const retryMutation = useRetryRunMutation()
  const startRunMutation = useStartRunMutation()

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
  const stage11 = stageRows[11] ?? null

  const failedStage = useMemo(() => {
    for (let index = stageRows.length - 1; index >= 0; index -= 1) {
      if (stageRows[index].status === 'failed') {
        return stageRows[index]
      }
    }
    return null
  }, [stageRows])

  const activeStage = (() => {
    const runningStage = stageRows.find((stage) => stage.status === 'running')
    if (runningStage) {
      return runningStage
    }

    const stageFromRunState = getStageIdFromRunState(runStatus?.state)
    if (stageFromRunState !== null) {
      return stageRows[stageFromRunState] ?? null
    }

    if (runStatus?.state === 'territory_review') {
      return stageRows[1] ?? null
    }

    if (runStatus?.current_stage !== null && runStatus?.current_stage !== undefined) {
      return stageRows[runStatus.current_stage] ?? null
    }

    return null
  })()

  useEffect(() => {
    if (!projectId || !versionId) {
      return
    }

    if (runStatus?.state === 'complete') {
      if (hasRedirectedToResultsRef.current) {
        return
      }

      hasRedirectedToResultsRef.current = true
      navigate(`/projects/${projectId}/versions/${versionId}/results`, { replace: true })
      return
    }

    if (stage11?.status === 'complete' && runStatus?.state !== 'failed') {
      if (hasRedirectedToResultsRef.current) {
        return
      }

      hasRedirectedToResultsRef.current = true
      navigate(`/projects/${projectId}/versions/${versionId}/results`, { replace: true })
      return
    }

    hasRedirectedToResultsRef.current = false
  }, [navigate, projectId, runStatus?.state, stage11?.status, versionId])

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

  const runErrorSummary = getErrorDetailSummary(runStatus?.error_detail ?? null)
  const failedStageMessage = getFailedStageMessage(failedStage, runErrorSummary)
  const runErrorDetailText = formatErrorDetail(runStatus?.error_detail ?? null)
  const failureSummaryText =
    failedStageMessage?.trim() ||
    getErrorMessage(runStatus?.error_detail, 'Run failed. Retry to continue from the last checkpoint.')
  const isCancelled = isCancelledRun(runStatus?.progress ?? null)
  const canRetry = runStatus?.state === 'failed' && !isCancelled
  const canCancel = Boolean(latestRunId) && (runStatus ? !isTerminalRunState(runStatus.state) : false)
  const canStartOver = Boolean(projectId && versionId) && !startRunMutation.isPending
  const retryFromStage = toRunStageIndex(
    failedStage?.stage_id ?? runStatus?.current_stage ?? runStatus?.stages.at(-1)?.stage_id ?? 0,
  )
  const retryLabel = failedStage ? `Retry from Stage ${retryFromStage}` : 'Retry run'
  const overallProgressPct = getOverallProgressPct(runStatus)
  const showTerritoryReviewPaused = runStatus?.state === 'territory_review'

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

  const handleCancelConfirm = () => {
    if (!latestRunId) {
      return
    }

    cancelMutation.mutate(
      {
        runId: latestRunId,
        projectId,
        versionId,
      },
      {
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
        onSettled: () => {
          setCancelDialogOpen(false)
          startRunProgress()
        },
      },
    )
  }

  const handleRetryConfirm = () => {
    if (!latestRunId) {
      return
    }

    retryMutation.mutate(
      {
        runId: latestRunId,
        projectId,
        versionId,
        payload: {
          from_stage: retryFromStage,
        },
      },
      {
        onError: (error) => {
          toast({
            variant: 'destructive',
            title: 'Failed to retry run',
            description: getErrorMessage(error, 'Please try again.'),
          })
        },
        onSuccess: (retriedRun) => {
          setRetryDialogOpen(false)
          startRunProgress()
          toast({
            title: 'Retry started',
            description: `Resumed run ${retriedRun.id} from Stage ${retryFromStage}.`,
          })
        },
      },
    )
  }

  const handleStartOverConfirm = () => {
    if (!projectId || !versionId) {
      return
    }

    startRunMutation.mutate(
      {
        projectId,
        versionId,
        previousLatestRunId: latestRunId,
      },
      {
        onError: (error) => {
          toast({
            variant: 'destructive',
            title: 'Failed to start over',
            description: getErrorMessage(error, 'Please try again.'),
          })
        },
        onSuccess: (runSummary) => {
          setStartOverDialogOpen(false)
          startRunProgress()
          toast({
            title: 'New run started',
            description: `Started run ${runSummary.id}.`,
          })
          navigate(`/projects/${projectId}/versions/${versionId}/run-monitor`, { replace: true })
        },
      },
    )
  }

  if (!projectId || !versionId) {
    return (
      <section className="space-y-4">
        <Breadcrumbs items={[{ label: 'Dashboard', to: '/projects' }, { label: 'Run' }]} />
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
            { label: 'Dashboard', to: '/projects' },
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
            { label: 'Dashboard', to: '/projects' },
            { label: projectLabel, to: `/projects/${projectId}` },
            { label: versionLabel, to: `/projects/${projectId}/versions/${versionId}` },
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
              { label: 'Dashboard', to: '/projects' },
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
          canStartOver={canStartOver}
          showRetry={false}
          retryDisabled
          retryLabel="Retry run"
          cancelDialogOpen={cancelDialogOpen}
          cancelLabel="Cancel Run"
          startOverDialogOpen={startOverDialogOpen}
          startOverLabel={startRunMutation.isPending ? 'Starting over...' : 'Start Over'}
          onCancelConfirm={() => undefined}
          onCancelDialogOpenChange={setCancelDialogOpen}
          onRetry={() => setRetryDialogOpen(true)}
          onStartOverConfirm={handleStartOverConfirm}
          onStartOverDialogOpenChange={setStartOverDialogOpen}
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
            { label: 'Dashboard', to: '/projects' },
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

          {executiveSummaryHref ? (
            <Button asChild size="sm" variant="outline">
              <Link to={executiveSummaryHref}>Executive Summary</Link>
            </Button>
          ) : null}
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
          <OverallProgressCard
            currentStageId={runStatus.current_stage}
            overallProgressPct={overallProgressPct}
            runState={runStatus.state}
          />

          {activeStage ? <ActiveStageSummaryCard stage={activeStage} /> : null}

          {showTerritoryReviewPaused ? (
            <TerritoryReviewPausedCard
              territoryReviewHref={`/projects/${projectId}/versions/${versionId}/territory-review`}
            />
          ) : null}

          {runStatus.state === 'failed' ? (
            <div className="space-y-3">
              <RunErrorPanel
                detailText={runErrorDetailText}
                failedStageId={failedStage?.stage_id ?? null}
                summary={failureSummaryText}
              />
              {canRetry || retryMutation.isPending ? (
                <Button
                  disabled={retryMutation.isPending}
                  onClick={() => setRetryDialogOpen(true)}
                  type="button"
                  variant="secondary"
                >
                  {retryMutation.isPending ? 'Retrying...' : retryLabel}
                </Button>
              ) : null}
            </div>
          ) : null}

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
                          <GateCard
                            active={row.active}
                            gate={row.gate}
                            generationReviewHref={`/projects/${projectId}/versions/${versionId}/generation-review`}
                            runState={runStatus?.state}
                          />
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
                              ? getFailedStageMessage(row.stage, runErrorSummary)
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
        canStartOver={canStartOver}
        showRetry={canRetry || retryMutation.isPending}
        retryDisabled={retryMutation.isPending}
        cancelDialogOpen={cancelDialogOpen}
        cancelLabel={cancelMutation.isPending ? 'Cancelling...' : 'Cancel Run'}
        startOverDialogOpen={startOverDialogOpen}
        startOverLabel={startRunMutation.isPending ? 'Starting over...' : 'Start Over'}
        onCancelConfirm={handleCancelConfirm}
        onCancelDialogOpenChange={setCancelDialogOpen}
        onRetry={() => setRetryDialogOpen(true)}
        onStartOverConfirm={handleStartOverConfirm}
        onStartOverDialogOpenChange={setStartOverDialogOpen}
        retryLabel={retryMutation.isPending ? 'Retrying...' : retryLabel}
      />

      <RetryRunDialog
        isPending={retryMutation.isPending}
        onConfirm={handleRetryConfirm}
        onOpenChange={setRetryDialogOpen}
        open={retryDialogOpen}
        retryLabel={retryLabel}
        retryStage={retryFromStage}
      />

    </section>
  )
}

function RunActionBar({
  backHref,
  canCancel,
  canStartOver,
  showRetry,
  retryDisabled,
  retryLabel,
  cancelDialogOpen,
  cancelLabel,
  startOverDialogOpen,
  startOverLabel,
  onCancelConfirm,
  onCancelDialogOpenChange,
  onRetry,
  onStartOverConfirm,
  onStartOverDialogOpenChange,
}: {
  backHref: string
  canCancel: boolean
  canStartOver: boolean
  showRetry: boolean
  retryDisabled: boolean
  retryLabel: string
  cancelDialogOpen: boolean
  cancelLabel: string
  startOverDialogOpen: boolean
  startOverLabel: string
  onCancelConfirm: () => void
  onCancelDialogOpenChange: (open: boolean) => void
  onRetry: () => void
  onStartOverConfirm: () => void
  onStartOverDialogOpenChange: (open: boolean) => void
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

          <Dialog onOpenChange={onStartOverDialogOpenChange} open={startOverDialogOpen}>
            <Button
              disabled={!canStartOver}
              onClick={() => onStartOverDialogOpenChange(true)}
              type="button"
              variant="outline"
            >
              {startOverLabel}
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start over with a new run?</DialogTitle>
                <DialogDescription>
                  This starts a fresh run for the current version using the existing run creation
                  flow.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  onClick={() => onStartOverDialogOpenChange(false)}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button onClick={onStartOverConfirm} type="button">
                  {startOverLabel}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Button asChild type="button" variant="link">
          <Link to={backHref}>Back to Version Builder</Link>
        </Button>
      </div>
    </div>
  )
}
