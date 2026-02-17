export const RUN_SSE_EVENT_TYPES = [
  'snapshot',
  'stage_started',
  'stage_progress',
  'stage_completed',
  'stage_failed',
  'gate_reached',
  'run_completed',
  'run_failed',
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
  stage_id: string
  status: StageCheckpointStatus
  progress_pct: number
  summary: string | null
  started_at: string | null
  completed_at: string | null
}

export interface RunStatusResponse {
  id: string
  version_id: string
  state: RunState
  current_stage: string | null
  progress: Record<string, unknown>
  started_at: string | null
  completed_at: string | null
  error_detail: string | null
  stages: StageCheckpointResponse[]
}

export interface CancelRunResponse {
  id: string
  cancelled: boolean
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

export type SSEEvent =
  | SnapshotSSEEvent
  | StageStartedSSEEvent
  | StageProgressSSEEvent
  | StageCompletedSSEEvent
  | StageFailedSSEEvent
  | GateReachedSSEEvent
  | RunCompletedSSEEvent
  | RunFailedSSEEvent

export interface StartRunRequestBody {
  fail_at_stage?: number | null
}
