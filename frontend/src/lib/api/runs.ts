import { getApiV1BaseUrl, request } from '@/lib/api/client'
import type {
  CancelRunResponse,
  DeepClearanceTriggerResponse,
  RunSSEEventType,
  RunState,
  RunStatusResponse,
  RunSummaryResponse,
  SSEEvent,
  StageCheckpointResponse,
  StageCheckpointStatus,
  StartRunRequestBody,
} from '@/lib/api/runs.types'

function getRunsPath(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${getApiV1BaseUrl()}${normalizedPath}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isRunState(value: unknown): value is RunState {
  return (
    value === 'queued' ||
    value === 'stage_0' ||
    value === 'stage_1' ||
    value === 'territory_review' ||
    value === 'stage_2' ||
    value === 'stage_3' ||
    value === 'stage_4' ||
    value === 'stage_5' ||
    value === 'stage_6' ||
    value === 'stage_7' ||
    value === 'stage_8' ||
    value === 'generation_review' ||
    value === 'stage_9' ||
    value === 'stage_10' ||
    value === 'stage_11' ||
    value === 'complete' ||
    value === 'failed'
  )
}

function isStageCheckpointStatus(value: unknown): value is StageCheckpointStatus {
  return value === 'pending' || value === 'running' || value === 'complete' || value === 'failed'
}

function isDateOrNull(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function toStageId(value: unknown, fieldName: string): number {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (/^\d+$/.test(trimmed)) {
      return Number(trimmed)
    }
    if (trimmed.startsWith('stage_')) {
      const rawStage = trimmed.slice('stage_'.length)
      if (/^\d+$/.test(rawStage)) {
        return Number(rawStage)
      }
    }
  }

  throw new Error(`Invalid run payload: expected numeric ${fieldName}`)
}

function parseStageCheckpointResponse(value: unknown): StageCheckpointResponse {
  if (!isRecord(value)) {
    throw new Error('Invalid run payload: stage checkpoint is not an object')
  }

  if (typeof value.id !== 'string') {
    throw new Error('Invalid run payload: stage checkpoint id must be a string')
  }

  if (!isStageCheckpointStatus(value.status)) {
    throw new Error('Invalid run payload: stage checkpoint status is invalid')
  }

  if (typeof value.progress_pct !== 'number') {
    throw new Error('Invalid run payload: stage checkpoint progress_pct must be a number')
  }

  if (value.summary !== null && typeof value.summary !== 'string') {
    throw new Error('Invalid run payload: stage checkpoint summary must be string|null')
  }

  if (!isDateOrNull(value.started_at) || !isDateOrNull(value.completed_at)) {
    throw new Error('Invalid run payload: stage checkpoint timestamps must be string|null')
  }

  return {
    id: value.id,
    stage_id: toStageId(value.stage_id, 'stage_id'),
    status: value.status,
    progress_pct: value.progress_pct,
    summary: value.summary,
    started_at: value.started_at,
    completed_at: value.completed_at,
  }
}

function parseProgress(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value === 'undefined') {
    return null
  }

  if (isRecord(value)) {
    return value
  }

  return null
}

export function parseRunStatusResponse(value: unknown): RunStatusResponse {
  if (!isRecord(value)) {
    throw new Error('Invalid run payload: status response is not an object')
  }

  if (typeof value.id !== 'string') {
    throw new Error('Invalid run payload: id must be a string')
  }
  if (typeof value.version_id !== 'string') {
    throw new Error('Invalid run payload: version_id must be a string')
  }
  if (!isRunState(value.state)) {
    throw new Error('Invalid run payload: state is invalid')
  }
  if (!isDateOrNull(value.started_at) || !isDateOrNull(value.completed_at)) {
    throw new Error('Invalid run payload: run timestamps must be string|null')
  }
  if (value.error_detail !== null && typeof value.error_detail !== 'string') {
    throw new Error('Invalid run payload: error_detail must be string|null')
  }
  if (!Array.isArray(value.stages)) {
    throw new Error('Invalid run payload: stages must be an array')
  }

  const parsedStages = value.stages
    .map((stage) => parseStageCheckpointResponse(stage))
    .sort((a, b) => a.stage_id - b.stage_id)

  const current_stage =
    value.current_stage === null || typeof value.current_stage === 'undefined'
      ? null
      : toStageId(value.current_stage, 'current_stage')

  return {
    id: value.id,
    version_id: value.version_id,
    state: value.state,
    current_stage,
    progress: parseProgress(value.progress),
    started_at: value.started_at,
    completed_at: value.completed_at,
    error_detail: value.error_detail,
    stages: parsedStages,
  }
}

function parseRunSummaryResponse(value: unknown): RunSummaryResponse {
  if (!isRecord(value)) {
    throw new Error('Invalid run payload: summary response is not an object')
  }

  if (
    typeof value.id !== 'string' ||
    !isRunState(value.state) ||
    !isDateOrNull(value.started_at)
  ) {
    throw new Error('Invalid run payload: malformed run summary')
  }

  return {
    id: value.id,
    state: value.state,
    started_at: value.started_at,
  }
}

function parseCancelRunResponse(value: unknown): CancelRunResponse {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.cancelled !== 'boolean') {
    throw new Error('Invalid run payload: malformed cancel response')
  }

  return {
    id: value.id,
    cancelled: value.cancelled,
  }
}

function assertString(value: unknown, fieldName: string, eventType: RunSSEEventType): string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid ${eventType} payload: expected string at ${fieldName}`)
  }
  return value
}

function assertBoolean(value: unknown, fieldName: string, eventType: RunSSEEventType): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid ${eventType} payload: expected boolean at ${fieldName}`)
  }
  return value
}

function parseSsePayload(rawData: string, eventType: RunSSEEventType): unknown {
  try {
    return JSON.parse(rawData) as unknown
  } catch {
    throw new Error(`Invalid JSON payload for ${eventType} event`)
  }
}

function resolveTimestamp(value: unknown): string {
  if (typeof value === 'string' && !Number.isNaN(new Date(value).getTime())) {
    return value
  }

  return new Date().toISOString()
}

function unwrapSsePayload(
  payload: unknown,
  eventType: RunSSEEventType,
): { data: unknown; timestamp: string } {
  if (
    isRecord(payload) &&
    typeof payload.event_type === 'string' &&
    payload.event_type === eventType &&
    'data' in payload
  ) {
    return {
      data: payload.data,
      timestamp: resolveTimestamp(payload.timestamp),
    }
  }

  return {
    data: payload,
    timestamp: new Date().toISOString(),
  }
}

export function parseSseEventData(eventType: RunSSEEventType, rawData: string): SSEEvent {
  const payload = parseSsePayload(rawData, eventType)
  const { data, timestamp } = unwrapSsePayload(payload, eventType)

  if (eventType === 'snapshot') {
    return {
      event_type: 'snapshot',
      timestamp,
      data: parseRunStatusResponse(data),
    }
  }

  if (!isRecord(data)) {
    throw new Error(`Invalid ${eventType} payload: expected object`)
  }

  const run_id = assertString(data.run_id, 'run_id', eventType)

  if (eventType === 'run_completed') {
    return {
      event_type: 'run_completed',
      timestamp,
      data: { run_id },
    }
  }

  if (eventType === 'stage_started') {
    return {
      event_type: 'stage_started',
      timestamp,
      data: {
        run_id,
        stage_id: toStageId(data.stage_id, 'stage_id'),
      },
    }
  }

  if (eventType === 'stage_progress') {
    if (typeof data.progress_pct !== 'number') {
      throw new Error('Invalid stage_progress payload: expected number at progress_pct')
    }

    let summary: string | null | undefined
    if ('summary' in data) {
      if (data.summary !== null && typeof data.summary !== 'string') {
        throw new Error('Invalid stage_progress payload: expected string|null at summary')
      }
      summary = data.summary
    }

    return {
      event_type: 'stage_progress',
      timestamp,
      data: {
        run_id,
        stage_id: toStageId(data.stage_id, 'stage_id'),
        progress_pct: data.progress_pct,
        ...(summary === undefined ? {} : { summary }),
      },
    }
  }

  if (eventType === 'stage_completed') {
    return {
      event_type: 'stage_completed',
      timestamp,
      data: {
        run_id,
        stage_id: toStageId(data.stage_id, 'stage_id'),
        summary: assertString(data.summary, 'summary', eventType),
      },
    }
  }

  if (eventType === 'stage_failed') {
    return {
      event_type: 'stage_failed',
      timestamp,
      data: {
        run_id,
        stage_id: toStageId(data.stage_id, 'stage_id'),
        error: assertString(data.error, 'error', eventType),
      },
    }
  }

  if (eventType === 'gate_reached') {
    if (!isRunState(data.run_state)) {
      throw new Error('Invalid gate_reached payload: run_state is invalid')
    }
    return {
      event_type: 'gate_reached',
      timestamp,
      data: {
        run_id,
        stage_id: toStageId(data.stage_id, 'stage_id'),
        run_state: data.run_state,
      },
    }
  }

  return {
    event_type: 'run_failed',
    timestamp,
    data: {
      run_id,
      stage_id: data.stage_id === null || typeof data.stage_id === 'undefined' ? null : toStageId(data.stage_id, 'stage_id'),
      cancelled: assertBoolean(data.cancelled, 'cancelled', eventType),
      error: assertString(data.error, 'error', eventType),
    },
  }
}

export async function startRun(
  versionId: string,
  body?: StartRunRequestBody,
): Promise<RunSummaryResponse> {
  const response = await request<unknown, StartRunRequestBody>(
    `/versions/${encodeURIComponent(versionId)}/runs/start`,
    {
      method: 'POST',
      ...(body ? { body } : {}),
    },
  )

  return parseRunSummaryResponse(response)
}

export async function getRunStatus(runId: string): Promise<RunStatusResponse> {
  const response = await request<unknown>(`/runs/${encodeURIComponent(runId)}/status`, {
    method: 'GET',
  })
  return parseRunStatusResponse(response)
}

export async function cancelRun(runId: string): Promise<CancelRunResponse> {
  const response = await request<unknown>(`/runs/${encodeURIComponent(runId)}/cancel`, {
    method: 'POST',
  })
  return parseCancelRunResponse(response)
}

export async function retryRun(runId: string): Promise<RunStatusResponse> {
  const response = await request<unknown>(`/runs/${encodeURIComponent(runId)}/retry`, {
    method: 'POST',
  })
  return parseRunStatusResponse(response)
}

export async function triggerRunDeepClearance(
  runId: string,
): Promise<DeepClearanceTriggerResponse> {
  return request<DeepClearanceTriggerResponse>(`/runs/${encodeURIComponent(runId)}/deep-clearance`, {
    method: 'POST',
  })
}

export function createRunProgressEventSource(runId: string): EventSource {
  return new EventSource(getRunsPath(`/runs/${encodeURIComponent(runId)}/progress/stream`))
}
