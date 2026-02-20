import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'

import {
  DEFAULT_RUN_NAMES_LIST_LIMIT,
  DEFAULT_RUN_NAMES_LIST_OFFSET,
  getNameCandidate,
  getRunNames,
  normalizeNameCandidateListQueryParams,
  patchNameCandidate,
  triggerRunDeepClearance,
  type DeepClearanceTriggerResponse,
  type NameCandidateDetailResponse,
  type NameCandidateListQueryParams,
  type NameCandidateListResponse,
  type NameCandidatePatchRequest,
  type NameCandidatePatchResponse,
  type NormalizedNameCandidateListQueryParams,
} from '@/lib/api'
import { isRunNamesQueryKey, namesKeys } from '@/features/names/queryKeys'
import {
  mergePatchedCandidateAcrossRunCaches,
  mergePatchedCandidateIntoNameDetailCache,
  optimisticallyPatchNameDetailCache,
  optimisticallySetNotesAcrossRunCaches,
  optimisticallySetSelectedForClearanceAcrossRunCaches,
  optimisticallySetShortlistedAcrossRunCaches,
  rollbackRunNamesOptimisticUpdate,
  type RunNamesOptimisticRollbackContext,
} from '@/features/names/optimistic'

export type { NormalizedNameCandidateListQueryParams }

export { namesKeys }

export const runNamesQueryKey = namesKeys.runNames
export const nameCandidateDetailQueryKey = namesKeys.detail
export const nameCandidateQueryKey = namesKeys.detail

export type UseRunNamesQueryOptions = Omit<
  UseQueryOptions<NameCandidateListResponse>,
  'queryKey' | 'queryFn'
>

export function useRunNamesQuery(
  runId: string | undefined,
  params: NameCandidateListQueryParams = {},
  options?: UseRunNamesQueryOptions,
) {
  const normalizedParams = normalizeNameCandidateListQueryParams(params)

  return useQuery({
    ...(options ?? {}),
    queryKey: runId
      ? namesKeys.runNames(runId, normalizedParams)
      : (['run', 'missing-run-id', 'names', normalizedParams] as const),
    queryFn: () => getRunNames(runId as string, normalizedParams),
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

export type UseNameCandidateDetailQueryOptions = Omit<
  UseQueryOptions<NameCandidateDetailResponse>,
  'queryKey' | 'queryFn'
>

export function useNameCandidateDetailQuery(
  nameId: string | undefined,
  options?: UseNameCandidateDetailQueryOptions,
) {
  return useQuery({
    ...(options ?? {}),
    queryKey: nameId ? namesKeys.detail(nameId) : (['name', 'missing-id'] as const),
    queryFn: () => getNameCandidate(nameId as string),
    enabled: Boolean(nameId) && (options?.enabled ?? true),
    // Prevent open/close remount churn from forcing a stale refetch.
    refetchOnMount: options?.refetchOnMount ?? false,
    meta: {
      suppressGlobalErrorToast: true,
      ...(options?.meta && typeof options.meta === 'object'
        ? (options.meta as Record<string, unknown>)
        : {}),
    },
  })
}

export const useNameCandidateQuery = useNameCandidateDetailQuery

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

      await queryClient.cancelQueries({
        queryKey: namesKeys.detail(variables.nameId),
        exact: true,
      })
      if (runId) {
        await queryClient.cancelQueries({
          queryKey: namesKeys.runNamesPrefix(runId),
        })
      } else {
        await queryClient.cancelQueries({
          predicate: (query) => isRunNamesQueryKey(query.queryKey),
        })
      }

      const rollbacks: RunNamesOptimisticRollbackContext[] = []
      rollbacks.push(
        optimisticallyPatchNameDetailCache(queryClient, {
          nameId: variables.nameId,
          patch: variables.patch,
        }),
      )

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

      if (variables.patch.notes !== undefined) {
        rollbacks.push(
          optimisticallySetNotesAcrossRunCaches(queryClient, {
            runId,
            nameId: variables.nameId,
            notes: variables.patch.notes,
          }),
        )
      }

      return { rollbacks }
    },
    onError: (_error, _variables, context) => {
      ;[...(context?.rollbacks ?? [])].reverse().forEach((rollbackContext) => {
        rollbackRunNamesOptimisticUpdate(queryClient, rollbackContext)
      })
    },
    onSuccess: (response, variables) => {
      const runId = variables.runId ?? response.run_id
      mergePatchedCandidateAcrossRunCaches(queryClient, {
        runId,
        nameId: variables.nameId,
        patch: {
          shortlisted: response.shortlisted,
          selected_for_clearance: response.selected_for_clearance,
          notes: response.notes,
        },
      })
      mergePatchedCandidateIntoNameDetailCache(queryClient, {
        nameId: variables.nameId,
        candidate: response,
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
        queryKey: namesKeys.runNamesPrefix(variables.runId),
      })
    },
  })
}
