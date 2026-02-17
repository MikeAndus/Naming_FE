export { getApiV1BaseUrl, request } from '@/lib/api/client'
export { ApiError, getErrorMessage, isApiError, parseApiErrorDetail } from '@/lib/api/errors'
export {
  createProject,
  DEFAULT_PROJECTS_LIST_LIMIT,
  DEFAULT_PROJECTS_LIST_OFFSET,
  getProjectById,
  listProjects,
  type CreateProjectPayload,
  type ListProjectsResponse,
  type Project,
} from '@/lib/api/projects'
