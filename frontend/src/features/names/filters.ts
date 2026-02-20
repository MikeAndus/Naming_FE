import { getNormalizedFastClearanceStatus } from '@/features/names/fast-clearance'
import type {
  DomainClearanceStatus,
  NameCandidateResponse,
  NameFamily,
  NameFormat,
  TrademarkClearanceStatus,
} from '@/lib/api'

export interface NamesFilterState {
  search: string
  families: NameFamily[]
  territories: string[]
  formats: NameFormat[]
  scoreMin: string
  scoreMax: string
  clearanceStatuses: Array<'green' | 'amber' | 'red' | 'unknown'>
  deepTrademarkStatuses: TrademarkClearanceStatus[]
  domainStatuses: DomainClearanceStatus[]
  shortlistedOnly: boolean
}

export interface TerritoryFilterOption {
  id: string
  label: string
}

export function createDefaultNamesFilters(): NamesFilterState {
  return {
    search: '',
    families: [],
    territories: [],
    formats: [],
    scoreMin: '',
    scoreMax: '',
    clearanceStatuses: [],
    deepTrademarkStatuses: [],
    domainStatuses: [],
    shortlistedOnly: false,
  }
}

export function isNamesFilterStateActive(filters: NamesFilterState): boolean {
  return (
    filters.search.trim().length > 0 ||
    filters.families.length > 0 ||
    filters.territories.length > 0 ||
    filters.formats.length > 0 ||
    filters.clearanceStatuses.length > 0 ||
    filters.deepTrademarkStatuses.length > 0 ||
    filters.domainStatuses.length > 0 ||
    filters.shortlistedOnly ||
    filters.scoreMin.trim().length > 0 ||
    filters.scoreMax.trim().length > 0
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

function getCompositeScore(candidate: NameCandidateResponse): number {
  const value = candidate.scores.composite
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return Number.NEGATIVE_INFINITY
  }

  return value
}

export function filterNameCandidates(
  names: NameCandidateResponse[],
  filters: NamesFilterState,
  searchValue: string,
  scoreRange: { min: number | null; max: number | null },
): NameCandidateResponse[] {
  const normalizedSearch = searchValue.trim().toLowerCase()

  return names.filter((candidate) => {
    if (normalizedSearch && !candidate.name_text.toLowerCase().includes(normalizedSearch)) {
      return false
    }

    if (filters.families.length > 0 && !filters.families.includes(candidate.family)) {
      return false
    }

    if (filters.territories.length > 0 && !filters.territories.includes(candidate.territory_card_id)) {
      return false
    }

    if (filters.formats.length > 0 && !filters.formats.includes(candidate.format)) {
      return false
    }

    if (filters.shortlistedOnly && !candidate.shortlisted) {
      return false
    }

    const fastClearanceStatus = getNormalizedFastClearanceStatus(candidate.fast_clearance)
    if (filters.clearanceStatuses.length > 0 && !filters.clearanceStatuses.includes(fastClearanceStatus)) {
      return false
    }

    const deepTrademarkStatus = candidate.deep_clearance?.trademark?.status
    if (filters.deepTrademarkStatuses.length > 0) {
      if (!deepTrademarkStatus || !filters.deepTrademarkStatuses.includes(deepTrademarkStatus)) {
        return false
      }
    }

    const domainStatus = candidate.deep_clearance?.domain?.status
    if (filters.domainStatuses.length > 0) {
      if (!domainStatus || !filters.domainStatuses.includes(domainStatus)) {
        return false
      }
    }

    const score = getCompositeScore(candidate)
    if (scoreRange.min !== null && score < scoreRange.min) {
      return false
    }
    if (scoreRange.max !== null && score > scoreRange.max) {
      return false
    }

    return true
  })
}
