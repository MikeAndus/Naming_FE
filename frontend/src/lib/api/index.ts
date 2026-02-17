export { getApiV1BaseUrl, request } from '@/lib/api/client'
export { ApiError, getErrorMessage, isApiError, parseApiErrorDetail } from '@/lib/api/errors'
export {
  DEFAULT_PROJECTS_LIST_LIMIT,
  DEFAULT_PROJECTS_LIST_OFFSET,
  listProjects,
  type ListProjectsResponse,
  type Project,
} from '@/lib/api/projects'
