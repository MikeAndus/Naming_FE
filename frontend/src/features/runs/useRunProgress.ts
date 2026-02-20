import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { updateNameCandidateDeepClearance } from '@/features/names/optimistic'
import { getErrorMessage } from '@/lib/api/errors'
import { createRunProgressEventSource, getRunStatus, parseSseEventData } from '@/lib/api/runs'
import type { RunSSEEventType, RunState, RunStatusResponse, SSEEvent } from '@/lib/api/runs.types'

const TOTAL_STAGES = 12
const RECONNECT_DELAYS_MS = [1000, 2000, 4000] as const
const RECONNECT_DELAY_CAP_MS = 10000
const POLL_INTERVAL_MS = 5000
const POLL_SSE_RECONNECT_INTERVAL_MS = 10000
const MAX_RECONNECT_FAILURES = 3

export type RunProgressConnectionState = 'live' | 'reconnecting' | 'polling' | 'idle'

export interface UseRunProgressInput {
  runId: string | null
  enabled?: boolean
}

export interface UseRunProgressResult {
  status: RunStatusResponse | null
  connectionState: RunProgressConnectionState
  error: Error | null
  start: () => void
  stop: () => void
}

const EVENT_TYPES: RunSSEEventType[] = [
  'snapshot',
  'stage_started',
  'stage_progress',
  'stage_completed',
  'stage_failed',
  'gate_reached',
  'run_completed',
  'run_failed',
  'name_clearance_update',
]

function isTerminalRunState(state: RunState): boolean {
  return state === 'complete' || state === 'failed'
}

function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error
  }

  return new Error(getErrorMessage(error))
}

function getReconnectDelayMs(attempt: number): number {
  if (attempt <= 0) {
    return RECONNECT_DELAYS_MS[0]
  }

  const fixedDelay = RECONNECT_DELAYS_MS[attempt - 1]
  if (fixedDelay) {
    return fixedDelay
  }

  const exponent = attempt - RECONNECT_DELAYS_MS.length
  const base = RECONNECT_DELAYS_MS[RECONNECT_DELAYS_MS.length - 1]
  return Math.min(base * 2 ** exponent, RECONNECT_DELAY_CAP_MS)
}

function getStageRunState(stageId: number): RunState | null {
  if (stageId >= 0 && stageId <= 11) {
    return `stage_${stageId}` as RunState
  }
  return null
}

function calculateOverallProgress(stageId: number, stageProgressPct: number): number {
  const completedUnits = stageId * 100 + stageProgressPct
  const totalUnits = TOTAL_STAGES * 100
  return Math.trunc((completedUnits / totalUnits) * 100)
}

function updateProgressPayload(
  current: RunStatusResponse,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...(current.progress ?? {}),
    ...patch,
  }
}

function updateStageCheckpoint(
  current: RunStatusResponse,
  stageId: number,
  update: (stage: RunStatusResponse['stages'][number]) => RunStatusResponse['stages'][number],
): RunStatusResponse['stages'] {
  let foundStage = false
  const nextStages = current.stages.map((stage) => {
    if (stage.stage_id !== stageId) {
      return stage
    }

    foundStage = true
    return update(stage)
  })

  if (foundStage) {
    return nextStages
  }

  const syntheticStage = update({
    id: `stage-${stageId}`,
    stage_id: stageId,
    status: 'pending',
    progress_pct: 0,
    summary: null,
    started_at: null,
    completed_at: null,
  })

  return [...nextStages, syntheticStage].sort((a, b) => a.stage_id - b.stage_id)
}

function applySseEvent(current: RunStatusResponse | null, event: SSEEvent): RunStatusResponse | null {
  if (event.event_type === 'snapshot') {
    return event.data
  }

  if (!current) {
    return null
  }

  if (event.event_type === 'stage_started') {
    const { stage_id } = event.data
    return {
      ...current,
      state: getStageRunState(stage_id) ?? current.state,
      current_stage: stage_id,
      started_at: current.started_at ?? event.timestamp,
      progress: updateProgressPayload(current, {
        current_stage: stage_id,
        stage_progress_pct: 0,
        overall_progress_pct: calculateOverallProgress(stage_id, 0),
      }),
      stages: updateStageCheckpoint(current, stage_id, (stage) => ({
        ...stage,
        status: 'running',
        progress_pct: 0,
        summary: null,
        started_at: stage.started_at ?? event.timestamp,
        completed_at: null,
      })),
    }
  }

  if (event.event_type === 'stage_progress') {
    const { stage_id, progress_pct, summary } = event.data
    return {
      ...current,
      state: getStageRunState(stage_id) ?? current.state,
      current_stage: stage_id,
      progress: updateProgressPayload(current, {
        current_stage: stage_id,
        stage_progress_pct: progress_pct,
        overall_progress_pct: calculateOverallProgress(stage_id, progress_pct),
      }),
      stages: updateStageCheckpoint(current, stage_id, (stage) => ({
        ...stage,
        status: 'running',
        progress_pct,
        summary: summary === undefined ? stage.summary : summary,
        started_at: stage.started_at ?? event.timestamp,
      })),
    }
  }

  if (event.event_type === 'stage_completed') {
    const { stage_id, summary } = event.data
    return {
      ...current,
      current_stage: stage_id,
      progress: updateProgressPayload(current, {
        current_stage: stage_id,
        stage_progress_pct: 100,
        overall_progress_pct: calculateOverallProgress(stage_id, 100),
      }),
      stages: updateStageCheckpoint(current, stage_id, (stage) => ({
        ...stage,
        status: 'complete',
        progress_pct: 100,
        summary,
        completed_at: event.timestamp,
      })),
    }
  }

  if (event.event_type === 'stage_failed') {
    const { stage_id, error } = event.data
    return {
      ...current,
      state: 'failed',
      current_stage: stage_id,
      completed_at: current.completed_at ?? event.timestamp,
      error_detail: error,
      stages: updateStageCheckpoint(current, stage_id, (stage) => ({
        ...stage,
        status: 'failed',
        summary: error,
        completed_at: event.timestamp,
      })),
    }
  }

  if (event.event_type === 'gate_reached') {
    const { stage_id, run_state } = event.data
    return {
      ...current,
      state: run_state,
      current_stage: stage_id,
      progress: updateProgressPayload(current, {
        gate_stage: stage_id,
        stage_progress_pct: 100,
        overall_progress_pct: calculateOverallProgress(stage_id, 100),
      }),
    }
  }

  if (event.event_type === 'run_completed') {
    return {
      ...current,
      state: 'complete',
      current_stage: null,
      completed_at: current.completed_at ?? event.timestamp,
      error_detail: null,
      progress: updateProgressPayload(current, {
        current_stage: null,
        stage_progress_pct: 100,
        overall_progress_pct: 100,
      }),
    }
  }

  if (event.event_type === 'name_clearance_update') {
    return current
  }

  return {
    ...current,
    state: 'failed',
    current_stage: event.data.stage_id ?? current.current_stage,
    completed_at: current.completed_at ?? event.timestamp,
    error_detail: event.data.error,
    progress: updateProgressPayload(current, {
      cancelled: event.data.cancelled,
    }),
  }
}

function shouldRefreshAfterEvent(event: SSEEvent): boolean {
  return event.event_type === 'run_completed' || event.event_type === 'run_failed'
}

export function useRunProgress({
  runId,
  enabled = true,
}: UseRunProgressInput): UseRunProgressResult {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<RunStatusResponse | null>(null)
  const [connectionState, setConnectionState] = useState<RunProgressConnectionState>('idle')
  const [error, setError] = useState<Error | null>(null)
  const [stoppedRunId, setStoppedRunId] = useState<string | null>(null)
  const [restartTick, setRestartTick] = useState(0)
  const statusRef = useRef<RunStatusResponse | null>(null)

  useEffect(() => {
    statusRef.current = status
  }, [status])

  const shouldRun = Boolean(runId) && enabled && stoppedRunId !== runId

  useEffect(() => {
    if (!runId || !shouldRun) {
      return
    }

    let disposed = false
    let eventSource: EventSource | null = null
    let reconnectTimer: number | null = null
    let pollingTimer: number | null = null
    let pollingReconnectTimer: number | null = null
    let pollingInFlight = false
    let reconnectFailures = 0
    let isPolling = false

    const clearReconnectTimer = (): void => {
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
    }

    const clearPollingTimer = (): void => {
      if (pollingTimer !== null) {
        window.clearInterval(pollingTimer)
        pollingTimer = null
      }
    }

    const clearPollingReconnectTimer = (): void => {
      if (pollingReconnectTimer !== null) {
        window.clearInterval(pollingReconnectTimer)
        pollingReconnectTimer = null
      }
    }

    const closeEventSource = (): void => {
      if (eventSource) {
        eventSource.close()
        eventSource = null
      }
    }

    const stopNetwork = (): void => {
      clearReconnectTimer()
      clearPollingTimer()
      clearPollingReconnectTimer()
      closeEventSource()
      isPolling = false
    }

    const applyNextStatus = (nextStatus: RunStatusResponse): void => {
      if (disposed) {
        return
      }

      statusRef.current = nextStatus
      setStatus(nextStatus)
      setError(null)

      if (isTerminalRunState(nextStatus.state)) {
        stopNetwork()
        setConnectionState('idle')
      }
    }

    const refreshStatus = async (): Promise<void> => {
      if (disposed) {
        return
      }

      try {
        const latestStatus = await getRunStatus(runId)
        if (disposed) {
          return
        }
        applyNextStatus(latestStatus)
      } catch (refreshError) {
        if (disposed) {
          return
        }
        setError(toError(refreshError))
      }
    }

    const connectSse = (allowDuringPolling = false): void => {
      if (disposed) {
        return
      }

      if (isPolling && !allowDuringPolling) {
        return
      }

      if (eventSource) {
        return
      }

      try {
        eventSource = createRunProgressEventSource(runId)
      } catch (connectError) {
        setError(toError(connectError))
        if (!isPolling) {
          scheduleReconnect()
        }
        return
      }

      const handleSseEvent = (rawEvent: Event): void => {
        if (disposed) {
          return
        }

        const messageEvent = rawEvent as MessageEvent<string>
        const eventType = messageEvent.type as RunSSEEventType

        try {
          const parsedEvent = parseSseEventData(eventType, messageEvent.data)

          if (parsedEvent.event_type === 'name_clearance_update') {
            if (parsedEvent.data.run_id !== runId) {
              return
            }

            updateNameCandidateDeepClearance(queryClient, {
              runId: parsedEvent.data.run_id,
              nameId: parsedEvent.data.name_id,
              clearanceType: parsedEvent.data.clearance_type,
              deepClearance: parsedEvent.data.deep_clearance,
            })
            return
          }

          const nextStatus = applySseEvent(statusRef.current, parsedEvent)

          if (!nextStatus) {
            void refreshStatus()
            return
          }

          applyNextStatus(nextStatus)
          if (shouldRefreshAfterEvent(parsedEvent)) {
            void refreshStatus()
          }
        } catch (parseError) {
          if (eventType === 'name_clearance_update') {
            return
          }

          setError(toError(parseError))
          void refreshStatus()
        }
      }

      for (const eventType of EVENT_TYPES) {
        eventSource.addEventListener(eventType, handleSseEvent as EventListener)
      }

      eventSource.onopen = () => {
        if (disposed) {
          return
        }

        reconnectFailures = 0
        setError(null)

        if (isPolling) {
          isPolling = false
          clearPollingTimer()
          clearPollingReconnectTimer()
        }

        setConnectionState('live')
      }

      eventSource.onerror = () => {
        closeEventSource()

        if (disposed) {
          return
        }

        if (isPolling) {
          setConnectionState('polling')
          return
        }

        scheduleReconnect()
      }
    }

    const startPolling = (): void => {
      if (disposed || isPolling) {
        return
      }

      closeEventSource()
      clearReconnectTimer()
      isPolling = true
      setConnectionState('polling')

      void refreshStatus()
      pollingTimer = window.setInterval(() => {
        if (disposed || pollingInFlight) {
          return
        }

        pollingInFlight = true
        void refreshStatus().finally(() => {
          pollingInFlight = false
        })
      }, POLL_INTERVAL_MS)

      pollingReconnectTimer = window.setInterval(() => {
        connectSse(true)
      }, POLL_SSE_RECONNECT_INTERVAL_MS)
    }

    const scheduleReconnect = (): void => {
      clearReconnectTimer()
      reconnectFailures += 1

      if (reconnectFailures > MAX_RECONNECT_FAILURES) {
        startPolling()
        return
      }

      setConnectionState('reconnecting')
      const delayMs = getReconnectDelayMs(reconnectFailures)
      reconnectTimer = window.setTimeout(() => {
        connectSse()
      }, delayMs)
    }

    void refreshStatus()
    connectSse()

    return () => {
      disposed = true
      stopNetwork()
    }
  }, [queryClient, runId, shouldRun, restartTick])

  const start = useCallback(() => {
    setStoppedRunId(null)
    setRestartTick((current) => current + 1)
    setError(null)
  }, [])

  const stop = useCallback(() => {
    setStoppedRunId(runId)
  }, [runId])

  const activeStatus = runId && status?.id === runId ? status : null
  const activeConnectionState: RunProgressConnectionState = shouldRun ? connectionState : 'idle'
  const activeError = shouldRun ? error : null

  return {
    status: activeStatus,
    connectionState: activeConnectionState,
    error: activeError,
    start,
    stop,
  }
}
