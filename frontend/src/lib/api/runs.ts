import { getApiV1BaseUrl, request } from '@/lib/api/client'
import type {
  CancelRunResponse,
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

function isStageCheckpointResponse(value: unknown): value is StageCheckpointResponse {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    typeof value.stage_id === 'string' &&
    isStageCheckpointStatus(value.status) &&
    typeof value.progress_pct === 'number' &&
    (value.summary === null || typeof value.summary === 'string') &&
    isDateOrNull(value.started_at) &&
    isDateOrNull(value.completed_at)
  )
}

function isRunStatusResponse(value: unknown): value is RunStatusResponse {
  if (!isRecord(value)) {
    return false
  }

  if (
    typeof value.id !== 'string' ||
    typeof value.version_id !== 'string' ||
    !isRunState(value.state) ||
    (value.current_stage !== null && typeof value.current_stage !== 'string') ||
    !isRecord(value.progress) ||
    !isDateOrNull(value.started_at) ||
    !isDateOrNull(value.completed_at) ||
    (value.error_detail !== null && typeof value.error_detail !== 'string') ||
    !Array.isArray(value.stages)
  ) {
    return false
  }

  return value.stages.every((stage) => isStageCheckpointResponse(stage))
}

function assertString(value: unknown, fieldName: string, eventType: RunSSEEventType): string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid ${eventType} payload: expected string at ${fieldName}`)
  }
  return value
}

function assertNumber(value: unknown, fieldName: string, eventType: RunSSEEventType): number {
  if (typeof value !== 'number') {
    throw new Error(`Invalid ${eventType} payload: expected number at ${fieldName}`)
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

export function parseSseEventData(eventType: RunSSEEventType, rawData: string): SSEEvent {
  const payload = parseSsePayload(rawData, eventType)
  const timestamp = new Date().toISOString()

  if (eventType === 'snapshot') {
    if (!isRunStatusResponse(payload)) {
      throw new Error('Invalid snapshot payload: expected RunStatusResponse')
    }

    return {
      event_type: 'snapshot',
      timestamp,
      data: payload,
    }
  }

  if (!isRecord(payload)) {
    throw new Error(`Invalid ${eventType} payload: expected object`)
  }

  const run_id = assertString(payload.run_id, 'run_id', eventType)

  if (eventType === 'run_completed') {
    return {
      event_type: eventType,
      timestamp,
      data: { run_id },
    }
  }

  if (eventType === 'stage_started') {
    return {
      event_type: eventType,
      timestamp,
      data: {
        run_id,
        stage_id: assertNumber(payload.stage_id, 'stage_id', eventType),
      },
    }
  }

  if (eventType === 'stage_progress') {
    return {
      event_type: eventType,
      timestamp,
      data: {
        run_id,
        stage_id: assertNumber(payload.stage_id, 'stage_id', eventType),
        progress_pct: assertNumber(payload.progress_pct, 'progress_pct', eventType),
      },
    }
  }

  if (eventType === 'stage_completed') {
    return {
      event_type: eventType,
      timestamp,
      data: {
        run_id,
        stage_id: assertNumber(payload.stage_id, 'stage_id', eventType),
        summary: assertString(payload.summary, 'summary', eventType),
      },
    }
  }

  if (eventType === 'stage_failed') {
    return {
      event_type: eventType,
      timestamp,
      data: {
        run_id,
        stage_id: assertNumber(payload.stage_id, 'stage_id', eventType),
        error: assertString(payload.error, 'error', eventType),
      },
    }
  }

  if (eventType === 'gate_reached') {
    const stage_id = assertNumber(payload.stage_id, 'stage_id', eventType)
    const run_state = payload.run_state
    if (!isRunState(run_state)) {
      throw new Error(`Invalid ${eventType} payload: expected run_state RunState`)
    }

    return {
      event_type: eventType,
      timestamp,
      data: {
        run_id,
        stage_id,
        run_state,
      },
    }
  }

  const stage_id = payload.stage_id
  if (stage_id !== null && typeof stage_id !== 'number') {
    throw new Error(`Invalid ${eventType} payload: expected stage_id number|null`)
  }

  return {
    event_type: 'run_failed',
    timestamp,
    data: {
      run_id,
      stage_id,
      cancelled: assertBoolean(payload.cancelled, 'cancelled', eventType),
      error: assertString(payload.error, 'error', eventType),
    },
  }
}

export async function startRun(
  versionId: string,
  body?: StartRunRequestBody,
): Promise<RunSummaryResponse> {
  return request<RunSummaryResponse, StartRunRequestBody>(
    `/versions/${encodeURIComponent(versionId)}/runs/start`,
    {
      method: 'POST',
      ...(body ? { body } : {}),
    },
  )
}

export async function getRunStatus(runId: string): Promise<RunStatusResponse> {
  return request<RunStatusResponse>(`/runs/${encodeURIComponent(runId)}/status`, {
    method: 'GET',
  })
}

export async function cancelRun(runId: string): Promise<CancelRunResponse> {
  return request<CancelRunResponse>(`/runs/${encodeURIComponent(runId)}/cancel`, {
    method: 'POST',
  })
}

export async function retryRun(runId: string): Promise<RunStatusResponse> {
  return request<RunStatusResponse>(`/runs/${encodeURIComponent(runId)}/retry`, {
    method: 'POST',
  })
}

export function createRunProgressEventSource(runId: string): EventSource {
  return new EventSource(getRunsPath(`/runs/${encodeURIComponent(runId)}/progress/stream`))
}
