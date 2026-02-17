import { useQuery } from '@tanstack/react-query'

import {
  DEFAULT_PROJECTS_LIST_LIMIT,
  DEFAULT_PROJECTS_LIST_OFFSET,
  getProjectById,
  listProjects,
} from '@/lib/api'

export const projectsListQueryKey = (limit: number, offset: number) =>
  ['projects', 'list', { limit, offset }] as const

export const defaultProjectsListQueryKey = projectsListQueryKey(
  DEFAULT_PROJECTS_LIST_LIMIT,
  DEFAULT_PROJECTS_LIST_OFFSET,
)

export const projectDetailQueryKey = (projectId: string) =>
  ['projects', 'detail', projectId] as const

export function useProjectsListQuery() {
  const limit = DEFAULT_PROJECTS_LIST_LIMIT
  const offset = DEFAULT_PROJECTS_LIST_OFFSET

  return useQuery({
    queryKey: defaultProjectsListQueryKey,
    queryFn: () => listProjects({ limit, offset }),
  })
}

export function useProjectDetailQuery(projectId?: string) {
  return useQuery({
    queryKey: projectId ? projectDetailQueryKey(projectId) : ['projects', 'detail', 'missing-id'],
    queryFn: () => getProjectById(projectId as string),
    enabled: Boolean(projectId),
    meta: {
      suppressGlobalErrorToast: true,
    },
  })
}
