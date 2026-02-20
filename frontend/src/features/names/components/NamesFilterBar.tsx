import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type {
  NameCandidateSocialPlatform,
  NameFamily,
  NameFormat,
} from '@/lib/api'
import type {
  NamesFilterState,
  TerritoryFilterOption,
} from '@/features/names/filters'
import { cn } from '@/lib/utils'

interface NamesFilterBarProps {
  filters: NamesFilterState
  territoryOptions: TerritoryFilterOption[]
  onChange: (updater: (current: NamesFilterState) => NamesFilterState) => void
  onClearAll: () => void
  hasActiveFilters: boolean
  totalResults: number
  showingCount: number
  starredCount: number
  selectedCount: number
}

const FAMILY_OPTIONS: Array<NameFamily | 'all'> = ['all', 'real', 'hybrid', 'synthetic']
const FORMAT_OPTIONS: Array<NameFormat | 'all'> = ['all', 'one_word', 'two_word']
const FAST_CLEARANCE_OPTIONS: Array<NamesFilterState['clearanceStatus']> = [
  'all',
  'green',
  'amber',
  'red',
  'unknown',
]
const DEEP_TRADEMARK_OPTIONS: Array<NamesFilterState['deepTrademarkStatus']> = [
  'all',
  'green',
  'amber',
  'red',
  'unknown',
]
const DOMAIN_OPTIONS: Array<NamesFilterState['domainStatus']> = [
  'all',
  'available',
  'taken',
  'unknown',
]
const SOCIAL_STATUS_OPTIONS: Array<NamesFilterState['socialStatus']> = [
  'all',
  'clear',
  'busy',
  'mixed',
  'unknown',
]
const SOCIAL_PLATFORM_OPTIONS: Array<NameCandidateSocialPlatform | 'all'> = [
  'all',
  'instagram',
  'x',
  'tiktok',
  'facebook',
  'linkedin',
]
const BOOLEAN_OPTIONS: Array<NamesFilterState['shortlisted']> = ['all', 'yes', 'no']
const SORT_BY_OPTIONS: Array<{ label: string; value: NamesFilterState['sortBy'] }> = [
  { label: 'Score', value: 'score' },
  { label: 'Name', value: 'name_text' },
  { label: 'Fast USPTO', value: 'fast_clearance' },
  { label: 'Deep USPTO', value: 'deep_uspto_status' },
  { label: 'Domain', value: 'domain_status' },
  { label: 'Social', value: 'social_status' },
]

function formatLabel(value: string): string {
  if (value === 'all') {
    return 'All'
  }

  return value.replaceAll('_', ' ')
}

function SingleSelectGroup<TValue extends string>({
  title,
  options,
  value,
  onChange,
  maxWidthClassName,
}: {
  title: string
  options: TValue[]
  value: TValue
  onChange: (value: TValue) => void
  maxWidthClassName?: string
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = value === option
          return (
            <Button
              className={cn(
                'h-7 justify-start px-2 text-xs font-medium',
                isSelected && 'border-primary',
                maxWidthClassName,
              )}
              key={option}
              onClick={() => onChange(option)}
              size="sm"
              type="button"
              variant={isSelected ? 'secondary' : 'outline'}
            >
              {formatLabel(option)}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

export function NamesFilterBar({
  filters,
  territoryOptions,
  onChange,
  onClearAll,
  hasActiveFilters,
  totalResults,
  showingCount,
  starredCount,
  selectedCount,
}: NamesFilterBarProps) {
  return (
    <div className="space-y-3 rounded-lg border bg-background p-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-[280px] flex-1 space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Search</p>
          <Input
            onChange={(event) => {
              const nextValue = event.target.value
              onChange((current) => ({
                ...current,
                search: nextValue,
              }))
            }}
            placeholder="Search names"
            value={filters.search}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Showing {showingCount} of {totalResults}</Badge>
          <Badge variant="outline">Starred {starredCount}</Badge>
          <Badge variant="outline">Selected {selectedCount}</Badge>
          <Button disabled={!hasActiveFilters} onClick={onClearAll} size="sm" type="button" variant="outline">
            Clear all
          </Button>
        </div>
      </div>

      <div className="grid gap-3 2xl:grid-cols-2">
        <SingleSelectGroup
          onChange={(value) => {
            onChange((current) => ({
              ...current,
              family: value,
            }))
          }}
          options={FAMILY_OPTIONS}
          title="Family"
          value={filters.family}
        />

        <SingleSelectGroup
          onChange={(value) => {
            onChange((current) => ({
              ...current,
              format: value,
            }))
          }}
          options={FORMAT_OPTIONS}
          title="Format"
          value={filters.format}
        />

        <SingleSelectGroup
          onChange={(value) => {
            onChange((current) => ({
              ...current,
              clearanceStatus: value,
            }))
          }}
          options={FAST_CLEARANCE_OPTIONS}
          title="Fast USPTO"
          value={filters.clearanceStatus}
        />

        <SingleSelectGroup
          onChange={(value) => {
            onChange((current) => ({
              ...current,
              deepTrademarkStatus: value,
            }))
          }}
          options={DEEP_TRADEMARK_OPTIONS}
          title="Deep USPTO"
          value={filters.deepTrademarkStatus}
        />

        <SingleSelectGroup
          onChange={(value) => {
            onChange((current) => ({
              ...current,
              domainStatus: value,
            }))
          }}
          options={DOMAIN_OPTIONS}
          title="Domain"
          value={filters.domainStatus}
        />

        <SingleSelectGroup
          onChange={(value) => {
            onChange((current) => ({
              ...current,
              socialStatus: value,
            }))
          }}
          options={SOCIAL_STATUS_OPTIONS}
          title="Social status"
          value={filters.socialStatus}
        />

        <SingleSelectGroup
          onChange={(value) => {
            onChange((current) => ({
              ...current,
              socialPlatform: value,
            }))
          }}
          options={SOCIAL_PLATFORM_OPTIONS}
          title="Social platform"
          value={filters.socialPlatform}
        />

        <SingleSelectGroup
          onChange={(value) => {
            onChange((current) => ({
              ...current,
              shortlisted: value,
            }))
          }}
          options={BOOLEAN_OPTIONS}
          title="Shortlisted"
          value={filters.shortlisted}
        />

        <SingleSelectGroup
          onChange={(value) => {
            onChange((current) => ({
              ...current,
              selectedForClearance: value,
            }))
          }}
          options={BOOLEAN_OPTIONS}
          title="Selected for clearance"
          value={filters.selectedForClearance}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_280px_360px]">
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Territory</p>
          {territoryOptions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No territories available.</p>
          ) : (
            <div className="flex max-h-[84px] flex-wrap gap-2 overflow-y-auto pr-1">
              <Button
                className={cn(
                  'h-7 justify-start px-2 text-xs font-medium',
                  filters.territoryId === 'all' && 'border-primary',
                )}
                onClick={() => {
                  onChange((current) => ({
                    ...current,
                    territoryId: 'all',
                  }))
                }}
                size="sm"
                type="button"
                variant={filters.territoryId === 'all' ? 'secondary' : 'outline'}
              >
                All
              </Button>

              {territoryOptions.map((option) => {
                const isSelected = filters.territoryId === option.id
                return (
                  <Button
                    className={cn(
                      'h-7 max-w-[220px] justify-start truncate px-2 text-xs font-medium',
                      isSelected && 'border-primary',
                    )}
                    key={option.id}
                    onClick={() => {
                      onChange((current) => ({
                        ...current,
                        territoryId: option.id,
                      }))
                    }}
                    size="sm"
                    title={option.label}
                    type="button"
                    variant={isSelected ? 'secondary' : 'outline'}
                  >
                    {option.label}
                  </Button>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Score range</p>
          <div className="grid grid-cols-2 gap-2">
            <Input
              inputMode="decimal"
              max={100}
              min={0}
              onChange={(event) => {
                const nextValue = event.target.value
                onChange((current) => ({
                  ...current,
                  scoreMin: nextValue,
                }))
              }}
              placeholder="Min"
              type="number"
              value={filters.scoreMin}
            />
            <Input
              inputMode="decimal"
              max={100}
              min={0}
              onChange={(event) => {
                const nextValue = event.target.value
                onChange((current) => ({
                  ...current,
                  scoreMax: nextValue,
                }))
              }}
              placeholder="Max"
              type="number"
              value={filters.scoreMax}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sort</p>
          <div className="flex flex-wrap gap-2">
            {SORT_BY_OPTIONS.map((option) => {
              const isSelected = filters.sortBy === option.value
              return (
                <Button
                  className={cn(
                    'h-7 justify-start px-2 text-xs font-medium',
                    isSelected && 'border-primary',
                  )}
                  key={option.value}
                  onClick={() => {
                    onChange((current) => ({
                      ...current,
                      sortBy: option.value,
                    }))
                  }}
                  size="sm"
                  type="button"
                  variant={isSelected ? 'secondary' : 'outline'}
                >
                  {option.label}
                </Button>
              )
            })}
          </div>

          <div className="flex gap-2">
            <Button
              className="h-7 px-2 text-xs font-medium"
              onClick={() => {
                onChange((current) => ({
                  ...current,
                  sortDir: 'desc',
                }))
              }}
              size="sm"
              type="button"
              variant={filters.sortDir === 'desc' ? 'secondary' : 'outline'}
            >
              Desc
            </Button>
            <Button
              className="h-7 px-2 text-xs font-medium"
              onClick={() => {
                onChange((current) => ({
                  ...current,
                  sortDir: 'asc',
                }))
              }}
              size="sm"
              type="button"
              variant={filters.sortDir === 'asc' ? 'secondary' : 'outline'}
            >
              Asc
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
