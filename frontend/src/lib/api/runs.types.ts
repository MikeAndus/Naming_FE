import type { DeepClearance } from '@/lib/api/names.types'
import type { TerritoryCard } from '@/lib/api/territoryReview.types'

export const RUN_SSE_EVENT_TYPES = [
  'snapshot',
  'stage_started',
  'stage_progress',
  'stage_completed',
  'stage_failed',
  'gate_reached',
  'run_completed',
  'run_failed',
  'name_clearance_update',
] as const

export type RunSSEEventType = (typeof RUN_SSE_EVENT_TYPES)[number]

export type RunState =
  | 'queued'
  | 'stage_0'
  | 'stage_1'
  | 'territory_review'
  | 'stage_2'
  | 'stage_3'
  | 'stage_4'
  | 'stage_5'
  | 'stage_6'
  | 'stage_7'
  | 'stage_8'
  | 'generation_review'
  | 'stage_9'
  | 'stage_10'
  | 'stage_11'
  | 'complete'
  | 'failed'

export type StageCheckpointStatus = 'pending' | 'running' | 'complete' | 'failed'

export interface RunSummaryResponse {
  id: string
  state: RunState
  started_at: string | null
}

export interface StageCheckpointResponse {
  id: string
  stage_id: number
  status: StageCheckpointStatus
  progress_pct: number
  summary: string | null
  artifacts?: Record<string, unknown> | null
  started_at: string | null
  completed_at: string | null
}

export interface RunStatusResponse {
  id: string
  version_id: string
  state: RunState
  current_stage: number | null
  progress: Record<string, unknown> | null
  started_at: string | null
  completed_at: string | null
  error_detail: string | null
  stages: StageCheckpointResponse[]
}

export interface CancelRunResponse {
  id: string
  cancelled: boolean
}

export interface DeepClearanceTriggerResponse {
  selected_count: number
}

export type RunStageIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11

export interface RetryRunRequestBody {
  from_stage?: RunStageIndex
  name_candidate_ids?: string[]
}

export type NameClearanceType = 'trademark' | 'domain' | 'social'

export interface NameClearanceUpdateEvent {
  event_type: 'name_clearance_update'
  run_id: string
  name_id: string
  clearance_type: NameClearanceType
  deep_clearance: DeepClearance
}

type BaseSSEEvent<TEventType extends RunSSEEventType, TData> = {
  event_type: TEventType
  timestamp: string
  data: TData
}

export type SnapshotSSEEvent = BaseSSEEvent<'snapshot', RunStatusResponse>

export type StageStartedSSEEvent = BaseSSEEvent<
  'stage_started',
  { run_id: string; stage_id: number }
>

export type StageProgressSSEEvent = BaseSSEEvent<
  'stage_progress',
  {
    run_id: string
    stage_id: number
    progress_pct: number
    summary?: string | null
  }
>

export type StageCompletedSSEEvent = BaseSSEEvent<
  'stage_completed',
  {
    run_id: string
    stage_id: number
    summary: string
  }
>

export type StageFailedSSEEvent = BaseSSEEvent<
  'stage_failed',
  {
    run_id: string
    stage_id: number
    error: string
  }
>

export type GateReachedSSEEvent = BaseSSEEvent<
  'gate_reached',
  {
    run_id: string
    stage_id: number
    run_state: RunState
  }
>

export type RunCompletedSSEEvent = BaseSSEEvent<'run_completed', { run_id: string }>

export type RunFailedSSEEvent = BaseSSEEvent<
  'run_failed',
  {
    run_id: string
    stage_id: number | null
    cancelled: boolean
    error: string
  }
>

export type NameClearanceUpdateSSEEvent = BaseSSEEvent<
  'name_clearance_update',
  NameClearanceUpdateEvent
>

export type SSEEvent =
  | SnapshotSSEEvent
  | StageStartedSSEEvent
  | StageProgressSSEEvent
  | StageCompletedSSEEvent
  | StageFailedSSEEvent
  | GateReachedSSEEvent
  | RunCompletedSSEEvent
  | RunFailedSSEEvent
  | NameClearanceUpdateSSEEvent

export interface StartRunRequestBody {
  fail_at_stage?: number | null
}

export interface ExecutiveSummaryBriefSnapshot {
  brief?: Record<string, unknown> | null
  dials?: Record<string, unknown> | null
}

export interface ExecutiveSummaryRunSettingsSnapshot {
  run_state?: RunState | string
  current_stage?: string | null
  started_at?: string | null
  completed_at?: string | null
  progress?: Record<string, unknown>
  version_dials?: Record<string, unknown> | null
}

export interface ExecutiveSummaryConstraintShortfallsSnapshot {
  from_progress?: Record<string, unknown> | null
  from_stage8_artifacts?: Record<string, unknown> | null
}

export interface ExecutiveSummaryResponse {
  run_id: string
  brief_snapshot?: ExecutiveSummaryBriefSnapshot | null
  research_snapshot?: Record<string, unknown> | null
  approved_territory_cards?: TerritoryCard[] | null
  run_settings?: ExecutiveSummaryRunSettingsSnapshot | null
  constraint_shortfalls?: ExecutiveSummaryConstraintShortfallsSnapshot | null
}
