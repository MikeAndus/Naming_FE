import { request } from '@/lib/api/client'

export const DEFAULT_PROJECTS_LIST_LIMIT = 100
export const DEFAULT_PROJECTS_LIST_OFFSET = 0

export interface Project {
  id: string
  name: string
  description: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface ListProjectsResponse {
  total: number
  items: Project[]
  limit?: number
  offset?: number
}

export interface ListProjectsParams {
  limit?: number
  offset?: number
}

export async function listProjects(params: ListProjectsParams = {}): Promise<ListProjectsResponse> {
  const limit = params.limit ?? DEFAULT_PROJECTS_LIST_LIMIT
  const offset = params.offset ?? DEFAULT_PROJECTS_LIST_OFFSET
  const path = `/projects?limit=${limit}&offset=${offset}`

  return request<ListProjectsResponse>(path, { method: 'GET' })
}
