import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { projectDetailQueryKey } from '@/features/projects/queries'
import { runsKeys } from '@/features/runs/queryKeys'
import {
  projectVersionsQueryKey,
  projectVersionsQueryKeyPrefix,
  versionDetailQueryKey,
} from '@/features/versions/queries'
import {
  cancelRun,
  getRunExecutiveSummary,
  getRunStatus,
  retryRun,
  startRun,
  type ExecutiveSummaryResponse,
  type RetryRunRequestBody,
  type RunState,
  type RunStatusResponse,
  type RunSummaryResponse,
} from '@/lib/api'

export const runStatusQueryKey = runsKeys.status
export const execSummaryQueryKey = runsKeys.executiveSummary

export function isTerminalRunState(state: RunState): boolean {
  return state === 'complete' || state === 'failed'
}

export function useRunStatusQuery(runId: string | undefined) {
  return useQuery({
    queryKey: runId ? runStatusQueryKey(runId) : ['runs', 'status', 'missing-id'],
    queryFn: () => getRunStatus(runId as string),
    enabled: Boolean(runId),
    refetchInterval: (query) => {
      const data = query.state.data as RunStatusResponse | undefined
      if (!data) {
        return 5000
      }

      return isTerminalRunState(data.state) ? false : 5000
    },
    meta: {
      suppressGlobalErrorToast: true,
    },
  })
}

export function useExecutiveSummaryQuery(runId: string | undefined) {
  return useQuery<ExecutiveSummaryResponse>({
    queryKey: runId ? execSummaryQueryKey(runId) : ['run', 'missing-id', 'exec-summary'],
    queryFn: () => getRunExecutiveSummary(runId as string),
    enabled: Boolean(runId),
    meta: {
      suppressGlobalErrorToast: true,
    },
  })
}

export const useRunExecutiveSummaryQuery = useExecutiveSummaryQuery

export interface StartRunVariables {
  projectId: string
  versionId: string
  previousLatestRunId?: string | null
}

function invalidateProjectVersionsList(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId?: string,
): void {
  if (projectId) {
    void queryClient.invalidateQueries({
      queryKey: projectVersionsQueryKey(projectId),
      exact: true,
    })
    return
  }

  void queryClient.invalidateQueries({
    queryKey: projectVersionsQueryKeyPrefix,
  })
}

export function useStartRunMutation() {
  const queryClient = useQueryClient()

  return useMutation<RunSummaryResponse, unknown, StartRunVariables>({
    mutationFn: ({ versionId }) => startRun(versionId),
    meta: {
      suppressGlobalErrorToast: true,
    },
    onSuccess: (runSummary, variables) => {
      queryClient.removeQueries({
        queryKey: runStatusQueryKey(runSummary.id),
        exact: true,
      })
      if (variables.previousLatestRunId) {
        queryClient.removeQueries({
          queryKey: runStatusQueryKey(variables.previousLatestRunId),
          exact: true,
        })
      }

      void queryClient.invalidateQueries({
        queryKey: versionDetailQueryKey(variables.versionId),
        exact: true,
      })
      void queryClient.invalidateQueries({
        queryKey: projectDetailQueryKey(variables.projectId),
        exact: true,
      })
      invalidateProjectVersionsList(queryClient, variables.projectId)
    },
  })
}

export interface CancelRunVariables {
  runId: string
  projectId?: string
  versionId?: string
}

export function useCancelRunMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ runId }: CancelRunVariables) => cancelRun(runId),
    meta: {
      suppressGlobalErrorToast: true,
    },
    onSuccess: (_response, variables) => {
      void queryClient.invalidateQueries({
        queryKey: runStatusQueryKey(variables.runId),
        exact: true,
      })
      if (variables.versionId) {
        void queryClient.invalidateQueries({
          queryKey: versionDetailQueryKey(variables.versionId),
          exact: true,
        })
      }
      if (variables.projectId) {
        void queryClient.invalidateQueries({
          queryKey: projectDetailQueryKey(variables.projectId),
          exact: true,
        })
      }
      invalidateProjectVersionsList(queryClient, variables.projectId)
    },
  })
}

export interface RetryRunVariables {
  runId: string
  projectId?: string
  versionId?: string
  payload?: RetryRunRequestBody
}

export function useRetryRunMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ runId, payload }: RetryRunVariables) => retryRun(runId, payload),
    meta: {
      suppressGlobalErrorToast: true,
    },
    onSuccess: (runStatus, variables) => {
      queryClient.setQueryData(runStatusQueryKey(runStatus.id), runStatus)

      if (variables.versionId) {
        void queryClient.invalidateQueries({
          queryKey: versionDetailQueryKey(variables.versionId),
          exact: true,
        })
      }
      if (variables.projectId) {
        void queryClient.invalidateQueries({
          queryKey: projectDetailQueryKey(variables.projectId),
          exact: true,
        })
      }
      invalidateProjectVersionsList(queryClient, variables.projectId)
    },
  })
}
