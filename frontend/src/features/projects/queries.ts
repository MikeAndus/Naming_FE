import { useQuery } from '@tanstack/react-query'

import { DEFAULT_PROJECTS_LIST_LIMIT, DEFAULT_PROJECTS_LIST_OFFSET, listProjects } from '@/lib/api'

export const projectsListQueryKey = (limit: number, offset: number) =>
  ['projects', 'list', { limit, offset }] as const

export function useProjectsListQuery() {
  const limit = DEFAULT_PROJECTS_LIST_LIMIT
  const offset = DEFAULT_PROJECTS_LIST_OFFSET

  return useQuery({
    queryKey: projectsListQueryKey(limit, offset),
    queryFn: () => listProjects({ limit, offset }),
  })
}
