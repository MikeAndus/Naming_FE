import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { projectDetailQueryKey } from '@/features/projects/queries'
import { projectVersionsQueryKey, versionDetailQueryKey } from '@/features/versions/queries'
import { getRunStatus, startRun, type RunState, type RunStatusResponse, type RunSummaryResponse } from '@/lib/api'

export const runStatusQueryKey = (runId: string) => ['runs', 'status', runId] as const

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

export interface StartRunVariables {
  projectId: string
  versionId: string
  previousLatestRunId?: string | null
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
      void queryClient.invalidateQueries({
        queryKey: projectVersionsQueryKey(variables.projectId),
        exact: true,
      })
    },
  })
}
