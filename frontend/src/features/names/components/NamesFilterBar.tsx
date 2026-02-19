import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { NameFamily, NameFormat } from '@/lib/api'
import type { NamesFilterState, TerritoryFilterOption } from '@/features/names/filters'
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

const FAMILY_OPTIONS: NameFamily[] = ['real', 'hybrid', 'synthetic']
const FORMAT_OPTIONS: NameFormat[] = ['one_word', 'two_word']
const CLEARANCE_OPTIONS: NamesFilterState['clearanceStatuses'] = [
  'green',
  'amber',
  'red',
  'unknown',
]

function formatLabel(value: string): string {
  return value.replaceAll('_', ' ')
}

function toggleValue<TValue extends string>(
  values: TValue[],
  value: TValue,
): TValue[] {
  if (values.includes(value)) {
    return values.filter((item) => item !== value)
  }

  return [...values, value]
}

function FilterGroup({
  title,
  options,
  selectedValues,
  onToggle,
}: {
  title: string
  options: string[]
  selectedValues: string[]
  onToggle: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selectedValues.includes(option)
          return (
            <Button
              className={cn('h-7 px-2 text-xs font-medium', isSelected && 'border-primary')}
              key={option}
              onClick={() => onToggle(option)}
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
        <div className="min-w-[260px] flex-1 space-y-1.5">
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
        <FilterGroup
          onToggle={(value) => {
            onChange((current) => ({
              ...current,
              families: toggleValue(current.families, value as NameFamily),
            }))
          }}
          options={FAMILY_OPTIONS}
          selectedValues={filters.families}
          title="Family"
        />

        <FilterGroup
          onToggle={(value) => {
            onChange((current) => ({
              ...current,
              formats: toggleValue(current.formats, value as NameFormat),
            }))
          }}
          options={FORMAT_OPTIONS}
          selectedValues={filters.formats}
          title="Format"
        />

        <FilterGroup
          onToggle={(value) => {
            onChange((current) => ({
              ...current,
              clearanceStatuses: toggleValue(current.clearanceStatuses, value as 'green' | 'amber' | 'red' | 'unknown'),
            }))
          }}
          options={CLEARANCE_OPTIONS}
          selectedValues={filters.clearanceStatuses}
          title="Fast clearance"
        />

        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Shortlisted</p>
          <div className="flex flex-wrap gap-2">
            <Button
              className="h-7 px-2 text-xs font-medium"
              onClick={() => {
                onChange((current) => ({
                  ...current,
                  shortlistedOnly: false,
                }))
              }}
              size="sm"
              type="button"
              variant={!filters.shortlistedOnly ? 'secondary' : 'outline'}
            >
              All
            </Button>
            <Button
              className="h-7 px-2 text-xs font-medium"
              onClick={() => {
                onChange((current) => ({
                  ...current,
                  shortlistedOnly: true,
                }))
              }}
              size="sm"
              type="button"
              variant={filters.shortlistedOnly ? 'secondary' : 'outline'}
            >
              Starred only
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_240px]">
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Territory</p>
          {territoryOptions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No territories available.</p>
          ) : (
            <div className="flex max-h-[84px] flex-wrap gap-2 overflow-y-auto pr-1">
              {territoryOptions.map((option) => {
                const isSelected = filters.territories.includes(option.id)
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
                        territories: toggleValue(current.territories, option.id),
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
      </div>
    </div>
  )
}
