export const DEFAULT_RUN_NAMES_LIST_LIMIT = 100
export const DEFAULT_RUN_NAMES_LIST_OFFSET = 0

export type NameFamily = 'real' | 'hybrid' | 'synthetic'

export type NameFormat = 'one_word' | 'two_word'

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

export type TrademarkClearanceStatus = 'green' | 'amber' | 'red' | 'unknown'

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

export type DomainClearanceStatus = 'available' | 'taken' | 'unknown'

export interface DomainClearance {
  status: DomainClearanceStatus
  domain_name: string
  checked_at: string
  reason?: string
}

export type SocialClearanceStatus = 'clear' | 'busy' | 'mixed' | 'unknown'

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

export type NameCandidateSortBy = 'rank' | 'score' | 'name_text' | 'created_at'

export type NameCandidateSortDirection = 'asc' | 'desc'

export interface NameCandidateListQueryParams {
  family?: NameFamily
  territory_card_id?: string
  format?: NameFormat
  score_min?: number
  score_max?: number
  clearance_status?: string
  shortlisted?: boolean
  selected_for_clearance?: boolean
  selected_for_final?: boolean
  search?: string
  sort_by?: NameCandidateSortBy
  sort_dir?: NameCandidateSortDirection
  limit?: number
  offset?: number
}

type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys]

interface NameCandidatePatchFields {
  shortlisted?: boolean
  notes?: string | null
  selected_for_clearance?: boolean
  rank?: number | null
}

export type NameCandidatePatchRequest = RequireAtLeastOne<NameCandidatePatchFields>

export type NameCandidatePatchResponse = NameCandidateResponse

export interface DeepClearanceTriggerResponse {
  selected_count: number
}
