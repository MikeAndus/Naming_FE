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

function classifyTerritoryReviewApiError(status: number): TerritoryReviewErrorKind {
  if (status === 409) {
    return 'conflict'
  }

  if (status === 500) {
    return 'invalid_llm_schema'
  }

  if (status === 502) {
    return 'ai_unavailable'
  }

  return 'unknown'
}

function getTerritoryReviewErrorMessage(
  kind: TerritoryReviewErrorKind,
  fallbackMessage: string,
): string {
  if (kind === 'invalid_llm_schema') {
    return TERRITORY_REVIEW_INVALID_LLM_SCHEMA_DETAIL
  }

  if (kind === 'ai_unavailable') {
    return TERRITORY_REVIEW_AI_UNAVAILABLE_DETAIL
  }

  return fallbackMessage
}

export function parseTerritoryReviewError(error: unknown): ParsedTerritoryReviewError {
  if (isApiError(error)) {
    const detail = parseApiErrorDetail(error.body)
    const kind = classifyTerritoryReviewApiError(error.status)
    return {
      kind,
      status: error.status,
      detail,
      message: getTerritoryReviewErrorMessage(kind, getErrorMessage(error)),
    }
  }

  return {
    kind: 'unknown',
    status: null,
    detail: undefined,
    message: getErrorMessage(error),
  }
}
