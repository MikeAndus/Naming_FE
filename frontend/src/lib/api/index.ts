export { getApiV1BaseUrl, request } from '@/lib/api/client'
export { ApiError, getErrorMessage, isApiError, parseApiErrorDetail } from '@/lib/api/errors'
export {
  parseTerritoryReviewError,
  TERRITORY_REVIEW_AI_UNAVAILABLE_DETAIL,
  TERRITORY_REVIEW_INVALID_LLM_SCHEMA_DETAIL,
  type ParsedTerritoryReviewError,
  type TerritoryReviewErrorKind,
} from '@/lib/api/territoryReview.errors'
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
export {
  createBlankVersion,
  forkVersion,
  getVersionById,
  listProjectVersions,
  patchVersion,
  type ListProjectVersionsResponse,
  type PatchVersionPayload,
  type ProjectVersionListItem,
  type VersionDetail,
} from '@/lib/api/versions'
export {
  cancelRun,
  createRunProgressEventSource,
  getRunStatus,
  parseSseEventData,
  retryRun,
  startRun,
} from '@/lib/api/runs'
export {
  RUN_SSE_EVENT_TYPES,
  type CancelRunResponse,
  type RunSSEEventType,
  type RunState,
  type RunStatusResponse,
  type RunSummaryResponse,
  type SSEEvent,
  type StageCheckpointResponse,
  type StageCheckpointStatus,
  type StartRunRequestBody,
} from '@/lib/api/runs.types'
export {
  addTerritoryCard,
  confirmTerritoryCards,
  getResearchSnapshot,
  listTerritoryCards,
  patchTerritoryCard,
  reviseTerritoryCard,
} from '@/lib/api/territoryReview'
export type {
  AddTerritoryCardRequest,
  AddTerritoryCardResponse,
  ConfirmTerritoryCardsResponse,
  ListTerritoryCardsResponse,
  PatchTerritoryCardRequest,
  ResearchSnapshot,
  ReviseTerritoryCardRequest,
  ReviseTerritoryCardResponse,
  TerritoryCard,
  TerritoryCardData,
  TerritoryCardPatchResponse,
  TerritoryCardReviewStatus,
  ToneFingerprint,
} from '@/lib/api/territoryReview.types'
