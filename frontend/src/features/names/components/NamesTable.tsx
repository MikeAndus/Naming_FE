import { Loader2, Star } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import type { NameCandidateResponse } from '@/lib/api'
import { cn } from '@/lib/utils'
import { DeepClearanceBadges } from '@/features/names/components/DeepClearanceBadges'
import { FastClearanceBadge } from '@/features/names/components/FastClearanceBadge'
import { hasDeepClearanceData } from '@/features/names/deep-clearance'

interface NamesTableProps {
  items: NameCandidateResponse[]
  isPhase3Running: boolean
  isLoading: boolean
  isError: boolean
  errorMessage: string
  hasActiveFilters: boolean
  onRetry: () => void
  onClearFilters: () => void
  onRowClick?: (candidate: NameCandidateResponse) => void
  onToggleShortlisted?: (candidate: NameCandidateResponse) => void
  onToggleSelectedForClearance?: (candidate: NameCandidateResponse) => void
}

function formatFamilyLabel(value: string): string {
  return value.replaceAll('_', ' ')
}

function formatFormatLabel(value: string): string {
  return value.replaceAll('_', ' ')
}

function getCompositeScore(candidate: NameCandidateResponse): number | null {
  const value = candidate.scores.composite
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null
  }

  return value
}

function TableSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 12 }).map((_, index) => (
        <div className="grid grid-cols-[32px_32px_64px_1fr_100px_140px_90px_80px_1fr_110px] gap-3" key={`name-skeleton-row-${index}`}>
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-14" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-12" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  )
}

function NoResults({
  hasActiveFilters,
  onClearFilters,
}: {
  hasActiveFilters: boolean
  onClearFilters: () => void
}) {
  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>No names match your filters</CardTitle>
        <CardDescription>
          Adjust your filters to widen the list.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button disabled={!hasActiveFilters} onClick={onClearFilters} type="button" variant="outline">
          Clear all filters
        </Button>
      </CardContent>
    </Card>
  )
}

function ErrorState({ errorMessage, onRetry }: { errorMessage: string; onRetry: () => void }) {
  return (
    <Card className="m-4 border-destructive/40 bg-destructive/5">
      <CardHeader>
        <CardTitle className="text-destructive">Couldn&apos;t load names</CardTitle>
        <CardDescription>{errorMessage}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={onRetry} type="button" variant="outline">
          Retry
        </Button>
      </CardContent>
    </Card>
  )
}

export function NamesTable({
  items,
  isPhase3Running,
  isLoading,
  isError,
  errorMessage,
  hasActiveFilters,
  onRetry,
  onClearFilters,
  onRowClick,
  onToggleShortlisted,
  onToggleSelectedForClearance,
}: NamesTableProps) {
  if (isLoading) {
    return <TableSkeleton />
  }

  if (isError) {
    return <ErrorState errorMessage={errorMessage} onRetry={onRetry} />
  }

  if (items.length === 0) {
    return <NoResults hasActiveFilters={hasActiveFilters} onClearFilters={onClearFilters} />
  }

  return (
    <table className="w-full border-separate border-spacing-0">
      <thead className="sticky top-0 z-10 bg-background">
        <tr className="border-b">
          <th className="w-9 px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Star
          </th>
          <th className="w-9 px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Select
          </th>
          <th className="w-14 px-2 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Rank
          </th>
          <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Name
          </th>
          <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground max-[1100px]:hidden">
            Family
          </th>
          <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground max-[1320px]:hidden">
            Territory
          </th>
          <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground max-[1180px]:hidden">
            Format
          </th>
          <th className="w-16 px-2 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Score
          </th>
          <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground max-[1500px]:hidden">
            Meaning
          </th>
          <th className="w-24 px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Clearance
          </th>
        </tr>
      </thead>

      <tbody>
        {items.map((candidate) => {
          const compositeScore = getCompositeScore(candidate)
          const hasDeepClearance = hasDeepClearanceData(candidate.deep_clearance)
          const showClearanceInProgress =
            isPhase3Running && candidate.selected_for_clearance && !hasDeepClearance

          return (
            <tr
              className={cn(
                'border-b align-top hover:bg-muted/30',
                onRowClick ? 'cursor-pointer' : '',
              )}
              key={candidate.id}
              onClick={() => {
                onRowClick?.(candidate)
              }}
            >
              <td className="px-2 py-2 text-center">
                <Button
                  className="h-7 w-7"
                  disabled={!onToggleShortlisted}
                  onClick={(event) => {
                    event.stopPropagation()
                    onToggleShortlisted?.(candidate)
                  }}
                  onPointerDown={(event) => {
                    event.stopPropagation()
                  }}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Star
                    className={cn(
                      'h-4 w-4',
                      candidate.shortlisted
                        ? 'fill-amber-400 text-amber-500'
                        : 'fill-transparent text-muted-foreground',
                    )}
                  />
                </Button>
              </td>

              <td className="px-2 py-2 text-center">
                <div
                  onClick={(event) => {
                    event.stopPropagation()
                  }}
                  onPointerDown={(event) => {
                    event.stopPropagation()
                  }}
                >
                  <Checkbox
                    checked={candidate.selected_for_clearance}
                    disabled={!onToggleSelectedForClearance}
                    onCheckedChange={(checked) => {
                      const nextValue = checked === true
                      if (nextValue === candidate.selected_for_clearance) {
                        return
                      }
                      onToggleSelectedForClearance?.(candidate)
                    }}
                  />
                </div>
              </td>

              <td className="px-2 py-2 text-right text-sm text-muted-foreground">
                {candidate.rank ?? '-'}
              </td>

              <td className="px-2 py-2 text-sm font-medium text-foreground">{candidate.name_text}</td>

              <td className="px-2 py-2 text-sm text-muted-foreground max-[1100px]:hidden">
                {formatFamilyLabel(candidate.family)}
              </td>

              <td className="max-w-[200px] px-2 py-2 text-sm text-muted-foreground max-[1320px]:hidden">
                <p className="truncate" title={candidate.territory_card_label}>{candidate.territory_card_label}</p>
              </td>

              <td className="px-2 py-2 text-sm text-muted-foreground max-[1180px]:hidden">
                {formatFormatLabel(candidate.format)}
              </td>

              <td className="px-2 py-2 text-right text-sm text-foreground">
                {compositeScore === null ? '-' : compositeScore.toFixed(1)}
              </td>

              <td className="max-[1500px]:hidden px-2 py-2 text-sm text-muted-foreground">
                <p className="max-w-[360px] truncate" title={candidate.meaning}>
                  {candidate.meaning}
                </p>
              </td>

              <td className="px-2 py-2">
                <div className="space-y-1">
                  {hasDeepClearance && candidate.deep_clearance ? (
                    <DeepClearanceBadges deepClearance={candidate.deep_clearance} />
                  ) : (
                    <FastClearanceBadge fastClearance={candidate.fast_clearance} />
                  )}

                  {showClearanceInProgress ? (
                    <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Deep clearance in progress
                    </p>
                  ) : null}
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
