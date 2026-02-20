export const DEFAULT_RUN_NAMES_LIST_LIMIT = 100
export const DEFAULT_RUN_NAMES_LIST_OFFSET = 0

export type NameFamily = 'real' | 'hybrid' | 'synthetic'

export type NameFormat = 'one_word' | 'two_word'

export type NameCandidateSocialPlatform =
  | 'instagram'
  | 'x'
  | 'tiktok'
  | 'facebook'
  | 'linkedin'

export interface NameCandidateScoresCore {
  composite: number
  fit: number
  distinctiveness: number
  whitespace: number
  usability: number
  extendability: number
}

export type NameCandidateScores = NameCandidateScoresCore & Record<string, unknown>

export type FastClearanceSuccessStatus = 'green' | 'amber' | 'red'

export interface FastClearanceSuccess {
  status: FastClearanceSuccessStatus
  checked_at: string
  raw_response: unknown
}

export interface FastClearanceUnknown {
  status: 'unknown'
  reason: string
  checked_at: string
  raw_response?: unknown
}

export interface FastClearancePending {
  status: 'pending'
  checked_at?: string
  reason?: string
  raw_response?: unknown
}

export type FastClearance = FastClearanceSuccess | FastClearanceUnknown | FastClearancePending

export type TrademarkClearanceStatus = 'green' | 'amber' | 'red' | 'unknown' | 'pending'
export type TrademarkClearanceFilterStatus = Exclude<TrademarkClearanceStatus, 'pending'>

export interface TrademarkSimilarMark {
  mark_name: string
  serial_number?: string
  registration_number?: string
  status?: string
  class_codes?: Array<string | number>
  description?: string
}

export interface TrademarkClearance {
  status: TrademarkClearanceStatus
  checked_at: string
  reason?: string
  similar_marks: TrademarkSimilarMark[]
  raw_response?: unknown
}

export type DomainClearanceStatus = 'available' | 'taken' | 'unknown' | 'pending'
export type DomainClearanceFilterStatus = Exclude<DomainClearanceStatus, 'pending'>

export interface DomainClearance {
  status: DomainClearanceStatus
  domain_name: string
  checked_at: string
  reason?: string
}

export type SocialClearanceStatus = 'clear' | 'busy' | 'mixed' | 'unknown' | 'pending'
export type SocialClearanceFilterStatus = Exclude<SocialClearanceStatus, 'pending'>

export interface SocialClearance {
  status: SocialClearanceStatus
  handle: string
  checked_at: string
  reason?: string
}

export type SocialClearanceMap = Record<string, SocialClearance>

export interface DeepClearance {
  trademark?: TrademarkClearance
  domain?: DomainClearance
  socials?: SocialClearanceMap
}

export interface NameCandidateResponse {
  id: string
  run_id: string
  territory_card_id: string
  territory_card_label: string
  name_text: string
  family: NameFamily
  format: NameFormat
  meaning: string
  backstory: string | null
  scores: NameCandidateScores
  fast_clearance: FastClearance
  deep_clearance: DeepClearance | null
  score_total_weighted?: number | null
  fast_clearance_status?: string | null
  deep_trademark_status?: TrademarkClearanceStatus | null
  deep_domain_status?: DomainClearanceStatus | null
  deep_social_status?: SocialClearanceStatus | null
  origin: Record<string, unknown> | null
  selected_for_clearance: boolean
  selected_for_final: boolean
  shortlisted: boolean
  rank: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface NameCandidateListResponse {
  items: NameCandidateResponse[]
  total: number
}

export type NameCandidateSortBy =
  | 'rank'
  | 'score'
  | 'name'
  | 'name_text'
  | 'created_at'
  | 'deep_uspto_status'
  | 'deep_trademark_status'
  | 'domain_status'
  | 'social_status'

export type NameCandidateSortDirection = 'asc' | 'desc'

export interface NameCandidateListQueryParams {
  family?: NameFamily
  territory_card_id?: string
  format?: NameFormat
  score_min?: number
  score_max?: number
  clearance_status?: string
  deep_uspto_status?: TrademarkClearanceFilterStatus
  domain_status?: DomainClearanceFilterStatus
  social_status?: SocialClearanceFilterStatus
  platform?: NameCandidateSocialPlatform
  shortlisted?: boolean
  selected_for_clearance?: boolean
  selected_for_final?: boolean
  search?: string
  sort_by?: NameCandidateSortBy
  sort_dir?: NameCandidateSortDirection
  limit?: number
  offset?: number
}

export type NormalizedNameCandidateListQueryParams = Omit<
  NameCandidateListQueryParams,
  'limit' | 'offset' | 'search' | 'clearance_status'
> & {
  clearance_status?: string
  search?: string
  limit: number
  offset: number
}

function normalizeOptionalTrimmedString(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

export function normalizeNameCandidateListQueryParams(
  params: NameCandidateListQueryParams = {},
): NormalizedNameCandidateListQueryParams {
  const normalizedClearanceStatus = normalizeOptionalTrimmedString(params.clearance_status)
  const normalizedSearch = normalizeOptionalTrimmedString(params.search)

  return {
    ...(params.family !== undefined ? { family: params.family } : {}),
    ...(params.territory_card_id !== undefined
      ? { territory_card_id: params.territory_card_id }
      : {}),
    ...(params.format !== undefined ? { format: params.format } : {}),
    ...(params.score_min !== undefined ? { score_min: params.score_min } : {}),
    ...(params.score_max !== undefined ? { score_max: params.score_max } : {}),
    ...(normalizedClearanceStatus !== undefined
      ? { clearance_status: normalizedClearanceStatus }
      : {}),
    ...(params.deep_uspto_status !== undefined
      ? { deep_uspto_status: params.deep_uspto_status }
      : {}),
    ...(params.domain_status !== undefined ? { domain_status: params.domain_status } : {}),
    ...(params.social_status !== undefined ? { social_status: params.social_status } : {}),
    ...(params.platform !== undefined ? { platform: params.platform } : {}),
    ...(params.shortlisted !== undefined ? { shortlisted: params.shortlisted } : {}),
    ...(params.selected_for_clearance !== undefined
      ? { selected_for_clearance: params.selected_for_clearance }
      : {}),
    ...(params.selected_for_final !== undefined
      ? { selected_for_final: params.selected_for_final }
      : {}),
    ...(normalizedSearch !== undefined ? { search: normalizedSearch } : {}),
    ...(params.sort_by !== undefined ? { sort_by: params.sort_by } : {}),
    ...(params.sort_dir !== undefined ? { sort_dir: params.sort_dir } : {}),
    limit: params.limit ?? DEFAULT_RUN_NAMES_LIST_LIMIT,
    offset: params.offset ?? DEFAULT_RUN_NAMES_LIST_OFFSET,
  }
}

type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys]

interface NameCandidatePatchFields {
  shortlisted?: boolean
  notes?: string | null
  selected_for_clearance?: boolean
}

export type NameCandidatePatchRequest = RequireAtLeastOne<NameCandidatePatchFields>

export interface DetailResponseEnvelope<TItem> {
  item: TItem
}

export interface NameCandidateScoreCriterionResponse {
  raw: number | null
  weight: number
  weighted: number | null
}

export interface NameCandidateScoresDetailResponse {
  fit: NameCandidateScoreCriterionResponse
  distinctiveness: NameCandidateScoreCriterionResponse
  whitespace: NameCandidateScoreCriterionResponse
  usability: NameCandidateScoreCriterionResponse
  extendability: NameCandidateScoreCriterionResponse
  total_weighted: number | null
}

export type ClearanceRagStatus = 'G' | 'A' | 'R' | 'Unknown' | 'Pending'

export interface NameCandidateFastClearanceDetailResponse {
  status: ClearanceRagStatus
  checked_at: string | null
  reason: string | null
  hit_count: number | null
  details: unknown
  raw_response: unknown
}

export type USPTOEvidenceLifecycleStatus = 'live' | 'dead' | 'pending'

export interface NameCandidateDeepUSPTOEvidenceRowResponse {
  mark_text: string
  serial_number: string | null
  registration_number: string | null
  classes: Array<string | number>
  status: USPTOEvidenceLifecycleStatus | null
  filing_date: string | null
}

export interface NameCandidateDeepTrademarkDetailResponse {
  status: ClearanceRagStatus
  checked_at: string | null
  reason: string | null
  similar_marks: NameCandidateDeepUSPTOEvidenceRowResponse[]
}

export type DomainClearanceDetailStatus = 'Available' | 'Taken' | 'Unknown' | 'Pending'

export interface NameCandidateDeepDomainDetailResponse {
  tld: string
  status: DomainClearanceDetailStatus
  domain_name: string | null
  checked_at: string | null
  reason: string | null
}

export type SocialClearanceDetailStatus = 'Clear' | 'Busy' | 'Mixed' | 'Unknown' | 'Pending'

export interface NameCandidateDeepSocialPlatformDetailResponse {
  platform: NameCandidateSocialPlatform | string
  status: SocialClearanceDetailStatus
  conflicting_handle: string | null
  handle: string | null
  checked_at: string | null
  reason: string | null
}

export interface NameCandidateDeepSocialDetailResponse {
  aggregate_status: SocialClearanceDetailStatus
  platforms: NameCandidateDeepSocialPlatformDetailResponse[]
}

export interface NameCandidateDeepClearanceDetailResponse {
  trademark: NameCandidateDeepTrademarkDetailResponse | null
  domain: NameCandidateDeepDomainDetailResponse | null
  socials: NameCandidateDeepSocialDetailResponse | null
}

export interface NameCandidateDetailResponse {
  id: string
  run_id: string
  name_text: string
  rank: number | null
  family: NameFamily
  family_tag: NameFamily
  format: NameFormat
  meaning: string
  backstory: string | null
  notes: string | null
  shortlisted: boolean
  selected_for_clearance: boolean
  selected_for_final: boolean
  territory_card_id: string
  territory_card_label: string
  territory_source_hotspot_id: string | null
  territory_card_title: string | null
  scores: NameCandidateScoresDetailResponse
  fast_clearance: NameCandidateFastClearanceDetailResponse
  deep_clearance: NameCandidateDeepClearanceDetailResponse | null
}

export type NameCandidateDetailEnvelope = DetailResponseEnvelope<NameCandidateDetailResponse>
export type NameCandidatePatchResponse = NameCandidateResponse | NameCandidateDetailResponse
export type NameCandidatePatchEnvelope = DetailResponseEnvelope<NameCandidatePatchResponse>
