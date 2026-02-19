import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'

import {
  DEFAULT_RUN_NAMES_LIST_LIMIT,
  DEFAULT_RUN_NAMES_LIST_OFFSET,
  listRunNames,
  patchNameCandidate,
  triggerRunDeepClearance,
  type DeepClearanceTriggerResponse,
  type NameCandidateListQueryParams,
  type NameCandidateListResponse,
  type NameCandidatePatchRequest,
  type NameCandidatePatchResponse,
} from '@/lib/api'
import {
  mergePatchedCandidateAcrossRunCaches,
  optimisticallySetSelectedForClearanceAcrossRunCaches,
  optimisticallySetShortlistedAcrossRunCaches,
  rollbackRunNamesOptimisticUpdate,
  runNamesQueryKeyPrefix,
  runNamesRunQueryKeyPrefix,
  type RunNamesOptimisticRollbackContext,
} from '@/features/names/optimistic'

export type NormalizedRunNamesQueryParams = Omit<
  NameCandidateListQueryParams,
  'limit' | 'offset'
> & {
  limit: number
  offset: number
}

export function normalizeRunNamesQueryParams(
  params: NameCandidateListQueryParams = {},
): NormalizedRunNamesQueryParams {
  return {
    ...params,
    limit: params.limit ?? DEFAULT_RUN_NAMES_LIST_LIMIT,
    offset: params.offset ?? DEFAULT_RUN_NAMES_LIST_OFFSET,
  }
}

export const runNamesQueryKey = (
  runId: string,
  params: NameCandidateListQueryParams = {},
) => ['names', 'run', runId, normalizeRunNamesQueryParams(params)] as const

export type UseRunNamesQueryOptions = Omit<
  UseQueryOptions<NameCandidateListResponse>,
  'queryKey' | 'queryFn'
>

export function useRunNamesQuery(
  runId: string | undefined,
  params: NameCandidateListQueryParams = {},
  options?: UseRunNamesQueryOptions,
) {
  const normalizedParams = normalizeRunNamesQueryParams(params)

  return useQuery({
    ...(options ?? {}),
    queryKey: runId
      ? runNamesQueryKey(runId, normalizedParams)
      : [...runNamesQueryKeyPrefix, 'missing-run-id', normalizedParams],
    queryFn: () => listRunNames(runId as string, normalizedParams),
    enabled: Boolean(runId) && (options?.enabled ?? true),
    meta: {
      suppressGlobalErrorToast: true,
      ...(options?.meta && typeof options.meta === 'object'
        ? (options.meta as Record<string, unknown>)
        : {}),
    },
  })
}

export type RunNamesAllQueryParams = Omit<NameCandidateListQueryParams, 'limit' | 'offset'>

export function useRunNamesAllQuery(
  runId: string | undefined,
  params: RunNamesAllQueryParams = {},
  options?: UseRunNamesQueryOptions,
) {
  return useRunNamesQuery(
    runId,
    {
      ...params,
      limit: DEFAULT_RUN_NAMES_LIST_LIMIT,
      offset: DEFAULT_RUN_NAMES_LIST_OFFSET,
    },
    options,
  )
}

export interface PatchNameCandidateVariables {
  nameId: string
  patch: NameCandidatePatchRequest
  runId?: string
}

interface PatchNameCandidateMutationContext {
  rollbacks: RunNamesOptimisticRollbackContext[]
}

export function usePatchNameCandidateMutation() {
  const queryClient = useQueryClient()

  return useMutation<
    NameCandidatePatchResponse,
    unknown,
    PatchNameCandidateVariables,
    PatchNameCandidateMutationContext
  >({
    mutationFn: ({ nameId, patch }) => patchNameCandidate(nameId, patch),
    meta: {
      suppressGlobalErrorToast: true,
    },
    onMutate: async (variables) => {
      const runId = variables.runId
      if (!runId) {
        return { rollbacks: [] }
      }

      await queryClient.cancelQueries({
        queryKey: runNamesRunQueryKeyPrefix(runId),
      })

      const rollbacks: RunNamesOptimisticRollbackContext[] = []
      if (variables.patch.shortlisted !== undefined) {
        rollbacks.push(
          optimisticallySetShortlistedAcrossRunCaches(queryClient, {
            runId,
            nameId: variables.nameId,
            shortlisted: variables.patch.shortlisted,
          }),
        )
      }

      if (variables.patch.selected_for_clearance !== undefined) {
        rollbacks.push(
          optimisticallySetSelectedForClearanceAcrossRunCaches(queryClient, {
            runId,
            nameId: variables.nameId,
            selectedForClearance: variables.patch.selected_for_clearance,
          }),
        )
      }

      return { rollbacks }
    },
    onError: (_error, _variables, context) => {
      context?.rollbacks.forEach((rollbackContext) => {
        rollbackRunNamesOptimisticUpdate(queryClient, rollbackContext)
      })
    },
    onSuccess: (response, variables) => {
      const runId = variables.runId ?? response.run_id
      mergePatchedCandidateAcrossRunCaches(queryClient, {
        runId,
        candidate: response,
      })
    },
    onSettled: (response, _error, variables) => {
      const runId = response?.run_id ?? variables.runId
      if (!runId) {
        return
      }

      void queryClient.invalidateQueries({
        queryKey: runNamesRunQueryKeyPrefix(runId),
      })
    },
  })
}

export interface RunDeepClearanceVariables {
  runId: string
}

export function useRunDeepClearanceMutation() {
  const queryClient = useQueryClient()

  return useMutation<DeepClearanceTriggerResponse, unknown, RunDeepClearanceVariables>({
    mutationFn: ({ runId }) => triggerRunDeepClearance(runId),
    meta: {
      suppressGlobalErrorToast: true,
    },
    onSuccess: (_response, variables) => {
      void queryClient.invalidateQueries({
        queryKey: runNamesRunQueryKeyPrefix(variables.runId),
      })
    },
  })
}
