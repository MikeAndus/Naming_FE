import { getNormalizedFastClearanceStatus } from '@/features/names/fast-clearance'
import type {
  DomainClearanceFilterStatus,
  NameCandidateListQueryParams,
  NameCandidateResponse,
  NameCandidateSocialPlatform,
  NameFamily,
  NameFormat,
  SocialClearanceFilterStatus,
  TrademarkClearanceFilterStatus,
} from '@/lib/api'

export type NamesBooleanFilter = 'all' | 'yes' | 'no'

export type NamesSortBy =
  | 'score'
  | 'name_text'
  | 'fast_clearance'
  | 'deep_uspto_status'
  | 'domain_status'
  | 'social_status'

export type NamesSortDirection = 'asc' | 'desc'

export interface NamesFilterState {
  search: string
  family: NameFamily | 'all'
  territoryId: string | 'all'
  format: NameFormat | 'all'
  scoreMin: string
  scoreMax: string
  clearanceStatus: 'all' | 'green' | 'amber' | 'red' | 'unknown'
  deepTrademarkStatus: 'all' | TrademarkClearanceFilterStatus
  domainStatus: 'all' | DomainClearanceFilterStatus
  socialStatus: 'all' | SocialClearanceFilterStatus
  socialPlatform: 'all' | NameCandidateSocialPlatform
  shortlisted: NamesBooleanFilter
  selectedForClearance: NamesBooleanFilter
  sortBy: NamesSortBy
  sortDir: NamesSortDirection
}

export interface TerritoryFilterOption {
  id: string
  label: string
}

function booleanFilterToValue(value: NamesBooleanFilter): boolean | undefined {
  if (value === 'yes') {
    return true
  }

  if (value === 'no') {
    return false
  }

  return undefined
}

export function createDefaultNamesFilters(): NamesFilterState {
  return {
    search: '',
    family: 'all',
    territoryId: 'all',
    format: 'all',
    scoreMin: '',
    scoreMax: '',
    clearanceStatus: 'all',
    deepTrademarkStatus: 'all',
    domainStatus: 'all',
    socialStatus: 'all',
    socialPlatform: 'all',
    shortlisted: 'all',
    selectedForClearance: 'all',
    sortBy: 'score',
    sortDir: 'desc',
  }
}

export function isNamesFilterStateActive(filters: NamesFilterState): boolean {
  const defaults = createDefaultNamesFilters()

  return (
    filters.search.trim().length > 0 ||
    filters.family !== defaults.family ||
    filters.territoryId !== defaults.territoryId ||
    filters.format !== defaults.format ||
    filters.scoreMin.trim().length > 0 ||
    filters.scoreMax.trim().length > 0 ||
    filters.clearanceStatus !== defaults.clearanceStatus ||
    filters.deepTrademarkStatus !== defaults.deepTrademarkStatus ||
    filters.domainStatus !== defaults.domainStatus ||
    filters.socialStatus !== defaults.socialStatus ||
    filters.socialPlatform !== defaults.socialPlatform ||
    filters.shortlisted !== defaults.shortlisted ||
    filters.selectedForClearance !== defaults.selectedForClearance
  )
}

export function getNamesFilterScoreRange(filters: NamesFilterState): {
  min: number | null
  max: number | null
} {
  const min = filters.scoreMin.trim().length > 0 ? Number(filters.scoreMin) : null
  const max = filters.scoreMax.trim().length > 0 ? Number(filters.scoreMax) : null

  return {
    min: Number.isFinite(min) ? min : null,
    max: Number.isFinite(max) ? max : null,
  }
}

export function sortTerritoryOptions(
  names: NameCandidateResponse[] | undefined,
): TerritoryFilterOption[] {
  if (!names || names.length === 0) {
    return []
  }

  const territoryMap = new Map<string, string>()
  for (const name of names) {
    if (!territoryMap.has(name.territory_card_id)) {
      territoryMap.set(name.territory_card_id, name.territory_card_label)
    }
  }

  return Array.from(territoryMap.entries())
    .map(([id, label]) => ({ id, label }))
    .sort((left, right) => left.label.localeCompare(right.label))
}

export function buildRunNamesQueryParams(
  filters: NamesFilterState,
  scoreRange: { min: number | null; max: number | null },
): NameCandidateListQueryParams {
  const querySortBy = filters.sortBy === 'fast_clearance' ? 'score' : filters.sortBy

  return {
    ...(filters.family !== 'all' ? { family: filters.family } : {}),
    ...(filters.territoryId !== 'all' ? { territory_card_id: filters.territoryId } : {}),
    ...(filters.format !== 'all' ? { format: filters.format } : {}),
    ...(scoreRange.min !== null ? { score_min: scoreRange.min } : {}),
    ...(scoreRange.max !== null ? { score_max: scoreRange.max } : {}),
    ...(filters.clearanceStatus !== 'all' ? { clearance_status: filters.clearanceStatus } : {}),
    ...(filters.deepTrademarkStatus !== 'all'
      ? { deep_uspto_status: filters.deepTrademarkStatus }
      : {}),
    ...(filters.domainStatus !== 'all' ? { domain_status: filters.domainStatus } : {}),
    ...(filters.socialStatus !== 'all' ? { social_status: filters.socialStatus } : {}),
    ...(filters.socialPlatform !== 'all' ? { platform: filters.socialPlatform } : {}),
    ...(booleanFilterToValue(filters.shortlisted) !== undefined
      ? { shortlisted: booleanFilterToValue(filters.shortlisted) }
      : {}),
    ...(booleanFilterToValue(filters.selectedForClearance) !== undefined
      ? { selected_for_clearance: booleanFilterToValue(filters.selectedForClearance) }
      : {}),
    ...(filters.search.trim().length > 0 ? { search: filters.search.trim() } : {}),
    sort_by: querySortBy,
    sort_dir: filters.sortDir,
  }
}

function getFastClearanceSortRank(candidate: NameCandidateResponse): number {
  const normalized = getNormalizedFastClearanceStatus(candidate.fast_clearance)
  if (normalized === 'green') {
    return 0
  }

  if (normalized === 'amber') {
    return 1
  }

  if (normalized === 'red') {
    return 2
  }

  if (normalized === 'pending') {
    return 3
  }

  return 4
}

function getCompositeScore(candidate: NameCandidateResponse): number {
  const value = candidate.scores.composite
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return Number.NEGATIVE_INFINITY
  }

  return value
}

export function sortNameCandidatesForDisplay(
  names: NameCandidateResponse[],
  filters: NamesFilterState,
): NameCandidateResponse[] {
  if (filters.sortBy !== 'fast_clearance') {
    return names
  }

  const direction = filters.sortDir === 'asc' ? 1 : -1

  return [...names].sort((left, right) => {
    const leftRank = getFastClearanceSortRank(left)
    const rightRank = getFastClearanceSortRank(right)

    if (leftRank !== rightRank) {
      return (leftRank - rightRank) * direction
    }

    const leftScore = getCompositeScore(left)
    const rightScore = getCompositeScore(right)
    if (leftScore !== rightScore) {
      return rightScore - leftScore
    }

    return left.name_text.localeCompare(right.name_text)
  })
}
