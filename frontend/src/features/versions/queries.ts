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

export const projectVersionsQueryKey = (projectId: string) =>
  ['versions', 'project', projectId] as const

export const versionDetailQueryKey = (versionId: string) =>
  ['versions', 'detail', versionId] as const

function sortVersionsNewestFirst(versions: ProjectVersionListItem[]): ProjectVersionListItem[] {
  return [...versions].sort((left, right) => right.version_number - left.version_number)
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

function upsertProjectVersion(
  current: ProjectVersionListItem[] | undefined,
  incoming: ProjectVersionListItem,
): ProjectVersionListItem[] {
  const existing = current?.find((item) => item.id === incoming.id)
  const nextItem =
    existing && incoming.summary_snippet === null
      ? { ...incoming, summary_snippet: existing.summary_snippet }
      : incoming

  const withoutIncoming = (current ?? []).filter((item) => item.id !== incoming.id)
  return sortVersionsNewestFirst([...withoutIncoming, nextItem])
}

export function useProjectVersions(projectId: string | undefined) {
  return useQuery({
    queryKey: projectId
      ? projectVersionsQueryKey(projectId)
      : ['versions', 'project', 'missing-id'],
    queryFn: () => listProjectVersions(projectId as string),
    enabled: Boolean(projectId),
    select: (versions) => sortVersionsNewestFirst(versions),
  })
}

export function useVersion(versionId: string | undefined) {
  return useQuery({
    queryKey: versionId ? versionDetailQueryKey(versionId) : ['versions', 'detail', 'missing-id'],
    queryFn: () => getVersionById(versionId as string),
    enabled: Boolean(versionId),
  })
}

export interface CreateBlankVersionVariables {
  projectId: string
}

export function useCreateBlankVersionMutation() {
  const queryClient = useQueryClient()

  return useMutation<VersionDetail, unknown, CreateBlankVersionVariables>({
    mutationFn: ({ projectId }) => createBlankVersion(projectId),
    onSuccess: (version) => {
      queryClient.setQueryData(versionDetailQueryKey(version.id), version)
      queryClient.setQueryData<ProjectVersionListItem[]>(
        projectVersionsQueryKey(version.project_id),
        (current) => upsertProjectVersion(current, toProjectVersionListItem(version)),
      )
      void queryClient.invalidateQueries({
        queryKey: projectVersionsQueryKey(version.project_id),
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
    onSuccess: (version) => {
      queryClient.setQueryData(versionDetailQueryKey(version.id), version)
      queryClient.setQueryData<ProjectVersionListItem[]>(
        projectVersionsQueryKey(version.project_id),
        (current) => upsertProjectVersion(current, toProjectVersionListItem(version)),
      )
      void queryClient.invalidateQueries({
        queryKey: projectVersionsQueryKey(version.project_id),
        exact: true,
      })
    },
  })
}
