import { request } from '@/lib/api/client'
import {
  type NameCandidateDetailEnvelope,
  normalizeNameCandidateListQueryParams,
  type NameCandidateDetailResponse,
  type NameCandidateListQueryParams,
  type NameCandidateListResponse,
  type NameCandidatePatchEnvelope,
  type NameCandidatePatchRequest,
  type NameCandidatePatchResponse,
  type NormalizedNameCandidateListQueryParams,
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

export function normalizeRunNamesParams(
  params: NameCandidateListQueryParams = {},
): NormalizedNameCandidateListQueryParams {
  return normalizeNameCandidateListQueryParams(params)
}

export async function getRunNames(
  runId: string,
  params: NameCandidateListQueryParams = {},
): Promise<NameCandidateListResponse> {
  const normalizedParams = normalizeRunNamesParams(params)
  const query = new URLSearchParams()

  appendQueryParam(query, 'family', normalizedParams.family)
  appendQueryParam(query, 'territory_card_id', normalizedParams.territory_card_id)
  appendQueryParam(query, 'format', normalizedParams.format)
  appendQueryParam(query, 'score_min', normalizedParams.score_min)
  appendQueryParam(query, 'score_max', normalizedParams.score_max)
  appendQueryParam(query, 'clearance_status', normalizedParams.clearance_status)
  appendQueryParam(query, 'deep_uspto_status', normalizedParams.deep_uspto_status)
  appendQueryParam(query, 'domain_status', normalizedParams.domain_status)
  appendQueryParam(query, 'social_status', normalizedParams.social_status)
  appendQueryParam(query, 'platform', normalizedParams.platform)
  appendQueryParam(query, 'shortlisted', normalizedParams.shortlisted)
  appendQueryParam(
    query,
    'selected_for_clearance',
    normalizedParams.selected_for_clearance,
  )
  appendQueryParam(query, 'selected_for_final', normalizedParams.selected_for_final)
  appendQueryParam(query, 'search', normalizedParams.search)
  appendQueryParam(query, 'sort_by', normalizedParams.sort_by)
  appendQueryParam(query, 'sort_dir', normalizedParams.sort_dir)
  appendQueryParam(query, 'limit', normalizedParams.limit)
  appendQueryParam(query, 'offset', normalizedParams.offset)

  const encodedRunId = encodeURIComponent(runId)
  const queryString = query.toString()

  return request<NameCandidateListResponse>(`/runs/${encodedRunId}/names?${queryString}`, {
    method: 'GET',
  })
}

export const listRunNames = getRunNames

export async function getNameCandidate(nameId: string): Promise<NameCandidateDetailResponse> {
  const response = await request<NameCandidateDetailEnvelope>(
    `/names/${encodeURIComponent(nameId)}`,
    {
      method: 'GET',
    },
  )

  return response.item
}

export async function patchNameCandidate(
  nameId: string,
  payload: NameCandidatePatchRequest,
): Promise<NameCandidatePatchResponse> {
  const response = await request<NameCandidatePatchEnvelope, NameCandidatePatchRequest>(
    `/names/${encodeURIComponent(nameId)}`,
    {
      method: 'PATCH',
      body: payload,
    },
  )

  return response.item
}
