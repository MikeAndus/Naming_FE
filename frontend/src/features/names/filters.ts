import type { NameCandidateResponse, NameFamily, NameFormat } from '@/lib/api'

export interface NamesFilterState {
  search: string
  families: NameFamily[]
  territories: string[]
  formats: NameFormat[]
  scoreMin: string
  scoreMax: string
  clearanceStatuses: Array<'green' | 'amber' | 'red' | 'unknown'>
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
