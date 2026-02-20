import type { QueryClient, QueryKey } from '@tanstack/react-query'

import type {
  DeepClearance,
  NameCandidateListResponse,
  NameCandidateResponse,
} from '@/lib/api'

export const runNamesQueryKeyPrefix = ['names', 'run'] as const

export const runNamesRunQueryKeyPrefix = (runId: string) =>
  [...runNamesQueryKeyPrefix, runId] as const

function queryKeyHasPrefix(queryKey: QueryKey, prefix: readonly unknown[]): boolean {
  return prefix.every((segment, index) => queryKey[index] === segment)
}

interface RunNamesQuerySnapshot {
  queryKey: QueryKey
  previousData: NameCandidateListResponse
}

export interface RunNamesOptimisticRollbackContext {
  snapshots: RunNamesQuerySnapshot[]
}

function updateCandidateInCachedList(
  current: NameCandidateListResponse,
  nameId: string,
  update: (candidate: NameCandidateResponse) => NameCandidateResponse,
): NameCandidateListResponse {
  let changed = false
  const nextItems = current.items.map((candidate) => {
    if (candidate.id !== nameId) {
      return candidate
    }

    const nextCandidate = update(candidate)
    if (nextCandidate !== candidate) {
      changed = true
    }
    return nextCandidate
  })

  if (!changed) {
    return current
  }

  return {
    ...current,
    items: nextItems,
  }
}

export function updateNameCandidateDeepClearance(
  queryClient: QueryClient,
  params: {
    runId: string
    nameId: string
    deepClearance: DeepClearance
  },
): void {
  const { runId, nameId, deepClearance } = params
  const runScopedQueryPrefix = runNamesRunQueryKeyPrefix(runId)

  queryClient.setQueriesData<unknown>(
    {
      predicate: (query) => queryKeyHasPrefix(query.queryKey, runScopedQueryPrefix),
    },
    (current: unknown) => {
      if (current === null || current === undefined) {
        return current
      }

      if (typeof current !== 'object') {
        return current
      }

      if (Array.isArray(current)) {
        return current
      }

      if ('items' in current && Array.isArray(current.items)) {
        return updateCandidateInCachedList(
          current as NameCandidateListResponse,
          nameId,
          (candidate) => {
            const nextDeepClearance: DeepClearance = deepClearance
            if (nextDeepClearance === candidate.deep_clearance) {
              return candidate
            }

            return {
              ...candidate,
              deep_clearance: nextDeepClearance,
            }
          },
        )
      }

      if ('id' in current && current.id === nameId) {
        const candidate = current as NameCandidateResponse
        const nextDeepClearance: DeepClearance = deepClearance
        if (nextDeepClearance === candidate.deep_clearance) {
          return current
        }

        return {
          ...candidate,
          deep_clearance: nextDeepClearance,
        } satisfies NameCandidateResponse
      }

      return current
    },
  )
}

export function optimisticallySetShortlistedAcrossRunCaches(
  queryClient: QueryClient,
  params: {
    runId: string
    nameId: string
    shortlisted: boolean
  },
): RunNamesOptimisticRollbackContext {
  const { runId, nameId, shortlisted } = params
  const snapshots: RunNamesQuerySnapshot[] = []
  const runScopedQueryPrefix = runNamesRunQueryKeyPrefix(runId)
  const nowIso = new Date().toISOString()

  queryClient
    .getQueriesData<NameCandidateListResponse>({
      queryKey: runScopedQueryPrefix,
    })
    .forEach(([queryKey, current]) => {
      if (!current) {
        return
      }

      const next = updateCandidateInCachedList(current, nameId, (candidate) => ({
        ...candidate,
        shortlisted,
        updated_at: nowIso,
      }))

      if (next === current) {
        return
      }

      snapshots.push({
        queryKey,
        previousData: current,
      })
      queryClient.setQueryData<NameCandidateListResponse>(queryKey, next)
    })

  return { snapshots }
}

export function optimisticallySetSelectedForClearanceAcrossRunCaches(
  queryClient: QueryClient,
  params: {
    runId: string
    nameId: string
    selectedForClearance: boolean
  },
): RunNamesOptimisticRollbackContext {
  const { runId, nameId, selectedForClearance } = params
  const snapshots: RunNamesQuerySnapshot[] = []
  const runScopedQueryPrefix = runNamesRunQueryKeyPrefix(runId)
  const nowIso = new Date().toISOString()

  queryClient
    .getQueriesData<NameCandidateListResponse>({
      queryKey: runScopedQueryPrefix,
    })
    .forEach(([queryKey, current]) => {
      if (!current) {
        return
      }

      const next = updateCandidateInCachedList(current, nameId, (candidate) => ({
        ...candidate,
        selected_for_clearance: selectedForClearance,
        updated_at: nowIso,
      }))

      if (next === current) {
        return
      }

      snapshots.push({
        queryKey,
        previousData: current,
      })
      queryClient.setQueryData<NameCandidateListResponse>(queryKey, next)
    })

  return { snapshots }
}

export function optimisticallySetNotesAcrossRunCaches(
  queryClient: QueryClient,
  params: {
    runId: string
    nameId: string
    notes: string | null
  },
): RunNamesOptimisticRollbackContext {
  const { runId, nameId, notes } = params
  const snapshots: RunNamesQuerySnapshot[] = []
  const runScopedQueryPrefix = runNamesRunQueryKeyPrefix(runId)
  const nowIso = new Date().toISOString()

  queryClient
    .getQueriesData<NameCandidateListResponse>({
      queryKey: runScopedQueryPrefix,
    })
    .forEach(([queryKey, current]) => {
      if (!current) {
        return
      }

      const next = updateCandidateInCachedList(current, nameId, (candidate) => ({
        ...candidate,
        notes,
        updated_at: nowIso,
      }))

      if (next === current) {
        return
      }

      snapshots.push({
        queryKey,
        previousData: current,
      })
      queryClient.setQueryData<NameCandidateListResponse>(queryKey, next)
    })

  return { snapshots }
}

export function mergePatchedCandidateAcrossRunCaches(
  queryClient: QueryClient,
  params: {
    runId: string
    candidate: NameCandidateResponse
  },
): void {
  const { runId, candidate } = params
  const runScopedQueryPrefix = runNamesRunQueryKeyPrefix(runId)

  queryClient
    .getQueriesData<NameCandidateListResponse>({
      queryKey: runScopedQueryPrefix,
    })
    .forEach(([queryKey, current]) => {
      if (!current) {
        return
      }

      const next = updateCandidateInCachedList(current, candidate.id, () => candidate)
      if (next === current) {
        return
      }

      queryClient.setQueryData<NameCandidateListResponse>(queryKey, next)
    })
}

export function rollbackRunNamesOptimisticUpdate(
  queryClient: QueryClient,
  context: RunNamesOptimisticRollbackContext | undefined,
): void {
  if (!context) {
    return
  }

  context.snapshots.forEach(({ queryKey, previousData }) => {
    queryClient.setQueryData<NameCandidateListResponse>(queryKey, previousData)
  })
}
