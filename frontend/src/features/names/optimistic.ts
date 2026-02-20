import type { QueryClient, QueryKey } from '@tanstack/react-query'

import { isRunNamesQueryKey, namesKeys } from '@/features/names/queryKeys'
import type {
  DeepClearance,
  NameCandidateDetailResponse,
  NameCandidateListResponse,
  NameCandidatePatchRequest,
  NameCandidateResponse,
} from '@/lib/api'

interface RunNamesQuerySnapshot {
  queryKey: QueryKey
  previousData: unknown
}

export interface RunNamesOptimisticRollbackContext {
  snapshots: RunNamesQuerySnapshot[]
}

interface NameCandidatePatchShape {
  shortlisted?: NameCandidatePatchRequest['shortlisted']
  notes?: NameCandidatePatchRequest['notes']
  selected_for_clearance?: NameCandidatePatchRequest['selected_for_clearance']
}

function getRunNamesQueryPredicate(runId?: string): (query: { queryKey: QueryKey }) => boolean {
  return (query) => isRunNamesQueryKey(query.queryKey, runId)
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

function patchCandidateInList(
  candidate: NameCandidateResponse,
  patch: NameCandidatePatchShape,
  nowIso: string,
): NameCandidateResponse {
  const nextShortlisted = patch.shortlisted ?? candidate.shortlisted
  const nextSelectedForClearance =
    patch.selected_for_clearance ?? candidate.selected_for_clearance
  const nextNotes = patch.notes !== undefined ? patch.notes : candidate.notes

  if (
    nextShortlisted === candidate.shortlisted &&
    nextSelectedForClearance === candidate.selected_for_clearance &&
    nextNotes === candidate.notes
  ) {
    return candidate
  }

  return {
    ...candidate,
    shortlisted: nextShortlisted,
    selected_for_clearance: nextSelectedForClearance,
    notes: nextNotes,
    updated_at: nowIso,
  }
}

function patchNameDetailCandidate(
  candidate: NameCandidateDetailResponse,
  patch: NameCandidatePatchShape,
): NameCandidateDetailResponse {
  const nextShortlisted = patch.shortlisted ?? candidate.shortlisted
  const nextSelectedForClearance =
    patch.selected_for_clearance ?? candidate.selected_for_clearance
  const nextNotes = patch.notes !== undefined ? patch.notes : candidate.notes

  if (
    nextShortlisted === candidate.shortlisted &&
    nextSelectedForClearance === candidate.selected_for_clearance &&
    nextNotes === candidate.notes
  ) {
    return candidate
  }

  return {
    ...candidate,
    shortlisted: nextShortlisted,
    selected_for_clearance: nextSelectedForClearance,
    notes: nextNotes,
  }
}

function patchRunNamesCaches(
  queryClient: QueryClient,
  params: {
    runId?: string
    nameId: string
    patch: NameCandidatePatchShape
  },
): RunNamesOptimisticRollbackContext {
  const { runId, nameId, patch } = params
  const snapshots: RunNamesQuerySnapshot[] = []
  const nowIso = new Date().toISOString()

  queryClient
    .getQueriesData<NameCandidateListResponse>({
      predicate: getRunNamesQueryPredicate(runId),
    })
    .forEach(([queryKey, current]) => {
      if (!current) {
        return
      }

      const next = updateCandidateInCachedList(current, nameId, (candidate) =>
        patchCandidateInList(candidate, patch, nowIso),
      )

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

function areDeepClearanceEqual(
  left: NameCandidateResponse['deep_clearance'],
  right: NameCandidateResponse['deep_clearance'],
): boolean {
  if (left === right) {
    return true
  }

  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null)
}

function isEquivalentAuthoritativeCandidate(
  current: NameCandidateResponse,
  incoming: NameCandidateResponse,
): boolean {
  return (
    current.updated_at === incoming.updated_at &&
    current.shortlisted === incoming.shortlisted &&
    current.selected_for_clearance === incoming.selected_for_clearance &&
    current.selected_for_final === incoming.selected_for_final &&
    current.rank === incoming.rank &&
    current.notes === incoming.notes &&
    current.fast_clearance_status === incoming.fast_clearance_status &&
    current.deep_trademark_status === incoming.deep_trademark_status &&
    current.deep_domain_status === incoming.deep_domain_status &&
    current.deep_social_status === incoming.deep_social_status &&
    areDeepClearanceEqual(current.deep_clearance, incoming.deep_clearance)
  )
}

function isSameQueryKey(left: QueryKey, right: QueryKey): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function reconcileRunNamesCachesFromAuthoritativeList(
  queryClient: QueryClient,
  params: {
    runId: string
    source: NameCandidateListResponse
    skipQueryKey?: QueryKey
  },
): void {
  const incomingById = new Map(params.source.items.map((candidate) => [candidate.id, candidate]))

  queryClient
    .getQueriesData<NameCandidateListResponse>({
      predicate: getRunNamesQueryPredicate(params.runId),
    })
    .forEach(([queryKey, current]) => {
      if (!current) {
        return
      }

      if (params.skipQueryKey && isSameQueryKey(queryKey, params.skipQueryKey)) {
        return
      }

      let changed = false
      const nextItems = current.items.map((candidate) => {
        const incoming = incomingById.get(candidate.id)
        if (!incoming) {
          return candidate
        }

        if (isEquivalentAuthoritativeCandidate(candidate, incoming)) {
          return candidate
        }

        changed = true
        return {
          ...candidate,
          ...incoming,
        }
      })

      if (!changed) {
        return
      }

      queryClient.setQueryData<NameCandidateListResponse>(queryKey, {
        ...current,
        items: nextItems,
      })
    })
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

  queryClient.setQueriesData<unknown>(
    {
      predicate: getRunNamesQueryPredicate(runId),
    },
    (current: unknown) => {
      if (!current || typeof current !== 'object' || Array.isArray(current)) {
        return current
      }

      if ('items' in current && Array.isArray(current.items)) {
        return updateCandidateInCachedList(
          current as NameCandidateListResponse,
          nameId,
          (candidate) => {
            if (deepClearance === candidate.deep_clearance) {
              return candidate
            }

            return {
              ...candidate,
              deep_clearance: deepClearance,
            }
          },
        )
      }

      return current
    },
  )
}

export function optimisticallyPatchNameDetailCache(
  queryClient: QueryClient,
  params: {
    nameId: string
    patch: NameCandidatePatchShape
  },
): RunNamesOptimisticRollbackContext {
  const { nameId, patch } = params
  const detailQueryKey = namesKeys.detail(nameId)
  const current = queryClient.getQueryData<NameCandidateDetailResponse>(detailQueryKey)

  if (!current) {
    return { snapshots: [] }
  }

  const next = patchNameDetailCandidate(current, patch)
  if (next === current) {
    return { snapshots: [] }
  }

  queryClient.setQueryData<NameCandidateDetailResponse>(detailQueryKey, next)

  return {
    snapshots: [
      {
        queryKey: detailQueryKey,
        previousData: current,
      },
    ],
  }
}

export function optimisticallySetShortlistedAcrossRunCaches(
  queryClient: QueryClient,
  params: {
    runId?: string
    nameId: string
    shortlisted: boolean
  },
): RunNamesOptimisticRollbackContext {
  return patchRunNamesCaches(queryClient, {
    runId: params.runId,
    nameId: params.nameId,
    patch: {
      shortlisted: params.shortlisted,
    },
  })
}

export function optimisticallySetSelectedForClearanceAcrossRunCaches(
  queryClient: QueryClient,
  params: {
    runId?: string
    nameId: string
    selectedForClearance: boolean
  },
): RunNamesOptimisticRollbackContext {
  return patchRunNamesCaches(queryClient, {
    runId: params.runId,
    nameId: params.nameId,
    patch: {
      selected_for_clearance: params.selectedForClearance,
    },
  })
}

export function optimisticallySetNotesAcrossRunCaches(
  queryClient: QueryClient,
  params: {
    runId?: string
    nameId: string
    notes: string | null
  },
): RunNamesOptimisticRollbackContext {
  return patchRunNamesCaches(queryClient, {
    runId: params.runId,
    nameId: params.nameId,
    patch: {
      notes: params.notes,
    },
  })
}

export function mergePatchedCandidateAcrossRunCaches(
  queryClient: QueryClient,
  params: {
    runId: string
    nameId: string
    patch: NameCandidatePatchShape
  },
): void {
  const { runId, nameId, patch } = params
  const nowIso = new Date().toISOString()

  queryClient
    .getQueriesData<NameCandidateListResponse>({
      predicate: getRunNamesQueryPredicate(runId),
    })
    .forEach(([queryKey, current]) => {
      if (!current) {
        return
      }

      const next = updateCandidateInCachedList(current, nameId, (candidate) =>
        patchCandidateInList(candidate, patch, nowIso),
      )
      if (next === current) {
        return
      }

      queryClient.setQueryData<NameCandidateListResponse>(queryKey, next)
    })
}

export function mergePatchedCandidateIntoNameDetailCache(
  queryClient: QueryClient,
  params: {
    nameId: string
    candidate: Pick<
      NameCandidateDetailResponse,
      'shortlisted' | 'selected_for_clearance' | 'notes'
    >
  },
): void {
  const { nameId, candidate } = params

  queryClient.setQueryData<NameCandidateDetailResponse>(
    namesKeys.detail(nameId),
    (current) => {
      if (!current) {
        return current
      }

      return patchNameDetailCandidate(current, {
        shortlisted: candidate.shortlisted,
        selected_for_clearance: candidate.selected_for_clearance,
        notes: candidate.notes,
      })
    },
  )
}

export function rollbackRunNamesOptimisticUpdate(
  queryClient: QueryClient,
  context: RunNamesOptimisticRollbackContext | undefined,
): void {
  if (!context) {
    return
  }

  context.snapshots.forEach(({ queryKey, previousData }) => {
    queryClient.setQueryData(queryKey, previousData)
  })
}
