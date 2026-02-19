import { request } from '@/lib/api/client'
import {
  DEFAULT_RUN_NAMES_LIST_LIMIT,
  DEFAULT_RUN_NAMES_LIST_OFFSET,
  type DeepClearanceTriggerResponse,
  type NameCandidateListQueryParams,
  type NameCandidateListResponse,
  type NameCandidatePatchRequest,
  type NameCandidatePatchResponse,
} from '@/lib/api/names.types'

function appendQueryParam(
  query: URLSearchParams,
  key: string,
  value: string | number | boolean | undefined,
): void {
  if (value === undefined) {
    return
  }

  query.set(key, String(value))
}

export async function listRunNames(
  runId: string,
  params: NameCandidateListQueryParams = {},
): Promise<NameCandidateListResponse> {
  const query = new URLSearchParams()
  appendQueryParam(query, 'family', params.family)
  appendQueryParam(query, 'territory_card_id', params.territory_card_id)
  appendQueryParam(query, 'format', params.format)
  appendQueryParam(query, 'score_min', params.score_min)
  appendQueryParam(query, 'score_max', params.score_max)
  appendQueryParam(query, 'clearance_status', params.clearance_status)
  appendQueryParam(query, 'shortlisted', params.shortlisted)
  appendQueryParam(query, 'selected_for_clearance', params.selected_for_clearance)
  appendQueryParam(query, 'selected_for_final', params.selected_for_final)
  appendQueryParam(query, 'search', params.search)
  appendQueryParam(query, 'sort_by', params.sort_by)
  appendQueryParam(query, 'sort_dir', params.sort_dir)
  appendQueryParam(query, 'limit', params.limit ?? DEFAULT_RUN_NAMES_LIST_LIMIT)
  appendQueryParam(query, 'offset', params.offset ?? DEFAULT_RUN_NAMES_LIST_OFFSET)

  const encodedRunId = encodeURIComponent(runId)
  const queryString = query.toString()

  return request<NameCandidateListResponse>(`/runs/${encodedRunId}/names?${queryString}`, {
    method: 'GET',
  })
}

export async function patchNameCandidate(
  nameId: string,
  patch: NameCandidatePatchRequest,
): Promise<NameCandidatePatchResponse> {
  return request<NameCandidatePatchResponse, NameCandidatePatchRequest>(
    `/names/${encodeURIComponent(nameId)}`,
    {
      method: 'PATCH',
      body: patch,
    },
  )
}

export async function triggerRunDeepClearance(
  runId: string,
): Promise<DeepClearanceTriggerResponse> {
  return request<DeepClearanceTriggerResponse>(
    `/runs/${encodeURIComponent(runId)}/deep-clearance`,
    {
      method: 'POST',
    },
  )
}
