import { getErrorMessage, isApiError, parseApiErrorDetail } from '@/lib/api/errors'

export const TERRITORY_REVIEW_INVALID_LLM_SCHEMA_DETAIL =
  'Territory card generation returned invalid data. Please retry.'
export const TERRITORY_REVIEW_AI_UNAVAILABLE_DETAIL =
  'AI service temporarily unavailable. Please retry.'

export type TerritoryReviewErrorKind =
  | 'conflict'
  | 'invalid_llm_schema'
  | 'ai_unavailable'
  | 'unknown'

export interface ParsedTerritoryReviewError {
  kind: TerritoryReviewErrorKind
  status: number | null
  detail: unknown
  message: string
}

function classifyTerritoryReviewApiError(status: number, detail: unknown): TerritoryReviewErrorKind {
  if (status === 409) {
    return 'conflict'
  }

  if (status === 500 && detail === TERRITORY_REVIEW_INVALID_LLM_SCHEMA_DETAIL) {
    return 'invalid_llm_schema'
  }

  if (status === 502 && detail === TERRITORY_REVIEW_AI_UNAVAILABLE_DETAIL) {
    return 'ai_unavailable'
  }

  return 'unknown'
}

export function parseTerritoryReviewError(error: unknown): ParsedTerritoryReviewError {
  if (isApiError(error)) {
    const detail = parseApiErrorDetail(error.body)
    return {
      kind: classifyTerritoryReviewApiError(error.status, detail),
      status: error.status,
      detail,
      message: getErrorMessage(error),
    }
  }

  return {
    kind: 'unknown',
    status: null,
    detail: undefined,
    message: getErrorMessage(error),
  }
}
