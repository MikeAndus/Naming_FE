import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createBlankVersion,
  forkVersion,
  getVersionById,
  listProjectVersions,
  patchVersion,
  type PatchVersionPayload,
  type ProjectVersionListItem,
  type VersionDetail,
} from '@/lib/api'

const ACTIVE_VERSION_STATES = new Set([
  'phase_1_running',
  'territory_review',
  'phase_2_running',
  'generation_review',
  'phase_3_running',
])

export const projectVersionsQueryKey = (projectId: string) =>
  ['versions', 'project', projectId] as const

export const projectVersionsQueryKeyPrefix = ['versions', 'project'] as const

export const versionDetailQueryKey = (versionId: string) =>
  ['versions', 'detail', versionId] as const

export function isActiveVersionState(state: string): boolean {
  return ACTIVE_VERSION_STATES.has(state)
}

function toProjectVersionListItem(version: VersionDetail): ProjectVersionListItem {
  return {
    id: version.id,
    version_number: version.version_number,
    state: version.state,
    created_at: version.created_at,
    updated_at: version.updated_at,
    summary_snippet: null,
  }
}

function prependOrReplaceProjectVersion(
  current: ProjectVersionListItem[] | undefined,
  incoming: ProjectVersionListItem,
): ProjectVersionListItem[] {
  const existing = current?.find((item) => item.id === incoming.id)
  const nextItem =
    existing && incoming.summary_snippet === null
      ? { ...incoming, summary_snippet: existing.summary_snippet }
      : incoming

  const withoutIncoming = (current ?? []).filter((item) => item.id !== incoming.id)
  return [nextItem, ...withoutIncoming]
}

function getOptimisticVersionNumber(current: ProjectVersionListItem[] | undefined): number {
  if (!current) {
    return -1
  }

  const maxVersionNumber = current.reduce(
    (max, version) => Math.max(max, version.version_number),
    0,
  )
  return maxVersionNumber + 1
}

export function useProjectVersionsQuery(projectId: string | undefined) {
  return useQuery({
    queryKey: projectId
      ? projectVersionsQueryKey(projectId)
      : ['versions', 'project', 'missing-id'],
    queryFn: () => listProjectVersions(projectId as string),
    enabled: Boolean(projectId),
    refetchInterval: (query) => {
      const versions = query.state.data as ProjectVersionListItem[] | undefined
      if (!versions || versions.length === 0) {
        return false
      }

      return versions.some((version) => isActiveVersionState(version.state)) ? 5000 : false
    },
  })
}

export const useProjectVersions = useProjectVersionsQuery

export function useVersion(versionId: string | undefined) {
  return useQuery({
    queryKey: versionId ? versionDetailQueryKey(versionId) : ['versions', 'detail', 'missing-id'],
    queryFn: () => getVersionById(versionId as string),
    enabled: Boolean(versionId),
  })
}

export const useVersionDetailQuery = useVersion

export interface CreateBlankVersionVariables {
  projectId: string
}

interface CreateBlankVersionMutationContext {
  optimisticId: string
  previousVersions?: ProjectVersionListItem[]
}

export function useCreateBlankVersionMutation() {
  const queryClient = useQueryClient()

  return useMutation<
    VersionDetail,
    unknown,
    CreateBlankVersionVariables,
    CreateBlankVersionMutationContext
  >({
    mutationFn: ({ projectId }) => createBlankVersion(projectId),
    meta: {
      suppressGlobalErrorToast: true,
    },
    onMutate: async ({ projectId }) => {
      const listQueryKey = projectVersionsQueryKey(projectId)
      await queryClient.cancelQueries({
        queryKey: listQueryKey,
        exact: true,
      })

      const previousVersions = queryClient.getQueryData<ProjectVersionListItem[]>(listQueryKey)
      const optimisticId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `optimistic-${Date.now()}`
      const nowIso = new Date().toISOString()
      const optimisticVersion: ProjectVersionListItem = {
        id: optimisticId,
        version_number: getOptimisticVersionNumber(previousVersions),
        state: 'draft',
        created_at: nowIso,
        updated_at: nowIso,
        summary_snippet: null,
      }

      queryClient.setQueryData<ProjectVersionListItem[]>(listQueryKey, (current) => {
        const currentList = current ?? []
        return [optimisticVersion, ...currentList]
      })

      return {
        optimisticId,
        previousVersions,
      }
    },
    onError: (_error, { projectId }, context) => {
      const listQueryKey = projectVersionsQueryKey(projectId)
      if (context?.previousVersions) {
        queryClient.setQueryData(listQueryKey, context.previousVersions)
        return
      }

      queryClient.removeQueries({
        queryKey: listQueryKey,
        exact: true,
      })
    },
    onSuccess: (version, { projectId }, context) => {
      queryClient.setQueryData(versionDetailQueryKey(version.id), version)
      queryClient.setQueryData<ProjectVersionListItem[]>(
        projectVersionsQueryKey(version.project_id),
        (current) => {
          const incoming = toProjectVersionListItem(version)
          if (!current) {
            return [incoming]
          }

          const optimisticId = context?.optimisticId
          const withoutServerDuplicate = current.filter((item) => item.id !== version.id)
          if (!optimisticId) {
            return prependOrReplaceProjectVersion(withoutServerDuplicate, incoming)
          }

          const optimisticIndex = withoutServerDuplicate.findIndex((item) => item.id === optimisticId)
          if (optimisticIndex < 0) {
            return prependOrReplaceProjectVersion(withoutServerDuplicate, incoming)
          }

          const nextVersions = [...withoutServerDuplicate]
          nextVersions[optimisticIndex] = incoming
          return nextVersions
        },
      )
      if (projectId !== version.project_id) {
        void queryClient.invalidateQueries({
          queryKey: projectVersionsQueryKey(projectId),
          exact: true,
        })
      }
    },
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({
        queryKey: projectVersionsQueryKey(variables.projectId),
        exact: true,
      })
    },
  })
}

export interface PatchVersionVariables {
  versionId: string
  patch: PatchVersionPayload
}

interface PatchVersionMutationContext {
  previousVersion?: VersionDetail
}

export function usePatchVersionMutation() {
  const queryClient = useQueryClient()

  return useMutation<VersionDetail, unknown, PatchVersionVariables, PatchVersionMutationContext>({
    mutationFn: ({ versionId, patch }) => patchVersion(versionId, patch),
    meta: {
      suppressGlobalErrorToast: true,
    },
    onMutate: async ({ versionId, patch }) => {
      const detailQueryKey = versionDetailQueryKey(versionId)
      await queryClient.cancelQueries({
        queryKey: detailQueryKey,
        exact: true,
      })

      const previousVersion = queryClient.getQueryData<VersionDetail>(detailQueryKey)
      if (previousVersion) {
        queryClient.setQueryData<VersionDetail>(detailQueryKey, {
          ...previousVersion,
          ...patch,
          updated_at: new Date().toISOString(),
        })
      }

      return { previousVersion }
    },
    onError: (_error, { versionId }, context) => {
      if (context?.previousVersion) {
        queryClient.setQueryData(versionDetailQueryKey(versionId), context.previousVersion)
      }
    },
    onSuccess: (version) => {
      queryClient.setQueryData(versionDetailQueryKey(version.id), version)
      queryClient.setQueryData<ProjectVersionListItem[]>(
        projectVersionsQueryKey(version.project_id),
        (current) => {
          if (!current) {
            return current
          }

          return current.map((item) =>
            item.id === version.id
              ? {
                  ...item,
                  version_number: version.version_number,
                  state: version.state,
                  created_at: version.created_at,
                  updated_at: version.updated_at,
                }
              : item,
          )
        },
      )
      void queryClient.invalidateQueries({
        queryKey: projectVersionsQueryKey(version.project_id),
        exact: true,
      })
    },
  })
}

export interface ForkVersionVariables {
  versionId: string
}

export function useForkVersionMutation() {
  const queryClient = useQueryClient()

  return useMutation<VersionDetail, unknown, ForkVersionVariables>({
    mutationFn: ({ versionId }) => forkVersion(versionId),
    meta: {
      suppressGlobalErrorToast: true,
    },
    onSuccess: (version) => {
      queryClient.setQueryData(versionDetailQueryKey(version.id), version)
      queryClient.setQueryData<ProjectVersionListItem[]>(
        projectVersionsQueryKey(version.project_id),
        (current) => prependOrReplaceProjectVersion(current, toProjectVersionListItem(version)),
      )
      void queryClient.invalidateQueries({
        queryKey: projectVersionsQueryKey(version.project_id),
        exact: true,
      })
    },
  })
}
