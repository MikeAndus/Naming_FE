import { ArrowDownUp, Star } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/app/StatusBadge'
import type { NameCandidateResponse } from '@/lib/api'
import { cn } from '@/lib/utils'
import { FastClearanceBadge } from '@/features/names/components/FastClearanceBadge'
import { getSocialsAggregateStatus } from '@/features/names/deep-clearance'
import type { NamesSortBy, NamesSortDirection } from '@/features/names/filters'

interface NamesTableProps {
  items: NameCandidateResponse[]
  isPhase3Running: boolean
  sortBy: NamesSortBy
  sortDir: NamesSortDirection
  onSortChange: (sortBy: NamesSortBy) => void
  onRowClick?: (
    candidate: NameCandidateResponse,
    triggerElement: HTMLTableRowElement,
  ) => void
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

function getDeepTrademarkStatus(candidate: NameCandidateResponse, isPhase3Running: boolean): string {
  const value = candidate.deep_clearance?.trademark?.status
  if (value) {
    return value
  }

  if (isPhase3Running && candidate.selected_for_clearance) {
    return 'pending'
  }

  return 'unknown'
}

function getDomainStatus(candidate: NameCandidateResponse, isPhase3Running: boolean): string {
  const value = candidate.deep_clearance?.domain?.status
  if (value) {
    return value
  }

  if (isPhase3Running && candidate.selected_for_clearance) {
    return 'pending'
  }

  return 'unknown'
}

function getSocialStatus(candidate: NameCandidateResponse, isPhase3Running: boolean): string {
  if (candidate.deep_clearance?.socials) {
    return getSocialsAggregateStatus(candidate.deep_clearance.socials)
  }

  if (isPhase3Running && candidate.selected_for_clearance) {
    return 'pending'
  }

  return 'unknown'
}

function getDeepTrademarkLabel(status: string): string {
  if (status === 'green') {
    return 'G'
  }

  if (status === 'amber') {
    return 'A'
  }

  if (status === 'red') {
    return 'R'
  }

  if (status === 'pending') {
    return 'Pending'
  }

  return 'Unknown'
}

function getDomainLabel(status: string): string {
  if (status === 'available') {
    return 'Available'
  }

  if (status === 'taken') {
    return 'Taken'
  }

  if (status === 'pending') {
    return 'Pending'
  }

  return 'Unknown'
}

function getSocialLabel(status: string): string {
  if (status === 'clear') {
    return 'Clear'
  }

  if (status === 'busy') {
    return 'Busy'
  }

  if (status === 'mixed') {
    return 'Mixed'
  }

  if (status === 'pending') {
    return 'Pending'
  }

  return 'Unknown'
}

function SortableHeader({
  align = 'left',
  className,
  isActive,
  label,
  onClick,
  sortDir,
}: {
  align?: 'left' | 'right' | 'center'
  className?: string
  isActive: boolean
  label: string
  onClick: () => void
  sortDir: NamesSortDirection
}) {
  return (
    <th
      className={cn(
        'px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground',
        align === 'left' && 'text-left',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      <Button
        className={cn('h-auto gap-1 px-0 py-0 text-xs font-semibold uppercase tracking-wide')}
        onClick={onClick}
        size="sm"
        type="button"
        variant="ghost"
      >
        {label}
        <ArrowDownUp className="h-3 w-3" />
        {isActive ? <span className="text-[10px]">{sortDir === 'asc' ? 'Asc' : 'Desc'}</span> : null}
      </Button>
    </th>
  )
}

export function NamesTable({
  items,
  isPhase3Running,
  sortBy,
  sortDir,
  onSortChange,
  onRowClick,
  onToggleShortlisted,
  onToggleSelectedForClearance,
}: NamesTableProps) {
  return (
    <table className="min-w-[1700px] w-full border-separate border-spacing-0">
      <thead className="sticky top-0 z-20 bg-background">
        <tr className="border-b">
          <SortableHeader
            align="left"
            className="sticky left-0 z-20 bg-background"
            isActive={sortBy === 'name_text'}
            label="Name"
            onClick={() => onSortChange('name_text')}
            sortDir={sortDir}
          />
          <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Family
          </th>
          <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Territory Card
          </th>
          <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Format
          </th>
          <SortableHeader
            align="right"
            isActive={sortBy === 'score'}
            label="Score"
            onClick={() => onSortChange('score')}
            sortDir={sortDir}
          />
          <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Meaning
          </th>
          <SortableHeader
            align="left"
            isActive={sortBy === 'fast_clearance'}
            label="Fast USPTO"
            onClick={() => onSortChange('fast_clearance')}
            sortDir={sortDir}
          />
          <SortableHeader
            align="left"
            isActive={sortBy === 'deep_uspto_status'}
            label="Deep USPTO"
            onClick={() => onSortChange('deep_uspto_status')}
            sortDir={sortDir}
          />
          <SortableHeader
            align="left"
            isActive={sortBy === 'domain_status'}
            label="Domain (.com)"
            onClick={() => onSortChange('domain_status')}
            sortDir={sortDir}
          />
          <SortableHeader
            align="left"
            isActive={sortBy === 'social_status'}
            label="Social"
            onClick={() => onSortChange('social_status')}
            sortDir={sortDir}
          />
          <th className="w-20 px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Shortlisted
          </th>
          <th className="w-24 px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Selected
          </th>
        </tr>
      </thead>

      <tbody>
        {items.map((candidate) => {
          const compositeScore = getCompositeScore(candidate)
          const deepTrademarkStatus = getDeepTrademarkStatus(candidate, isPhase3Running)
          const domainStatus = getDomainStatus(candidate, isPhase3Running)
          const socialStatus = getSocialStatus(candidate, isPhase3Running)

          return (
            <tr
              className={cn(
                'group border-b align-top hover:bg-muted/30',
                onRowClick
                  ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                  : '',
              )}
              key={candidate.id}
              onClick={(event) => {
                event.currentTarget.focus()
                onRowClick?.(candidate, event.currentTarget)
              }}
              onKeyDown={(event) => {
                if (!onRowClick) {
                  return
                }

                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  event.currentTarget.focus()
                  onRowClick(candidate, event.currentTarget)
                }
              }}
              tabIndex={onRowClick ? 0 : -1}
            >
              <td className="sticky left-0 z-10 bg-background px-2 py-2 text-sm font-medium text-foreground group-hover:bg-muted/30">
                {candidate.name_text}
              </td>

              <td className="px-2 py-2 text-sm text-muted-foreground">
                {formatFamilyLabel(candidate.family)}
              </td>

              <td className="max-w-[260px] px-2 py-2 text-sm text-muted-foreground">
                <p className="truncate" title={candidate.territory_card_label}>{candidate.territory_card_label}</p>
              </td>

              <td className="px-2 py-2 text-sm text-muted-foreground">
                {formatFormatLabel(candidate.format)}
              </td>

              <td className="px-2 py-2 text-right text-sm text-foreground">
                {compositeScore === null ? '-' : compositeScore.toFixed(1)}
              </td>

              <td className="max-w-[280px] px-2 py-2 text-sm text-muted-foreground">
                <p className="truncate" title={candidate.meaning}>
                  {candidate.meaning}
                </p>
              </td>

              <td className="px-2 py-2">
                <FastClearanceBadge fastClearance={candidate.fast_clearance} />
              </td>

              <td className="px-2 py-2">
                <StatusBadge
                  labelOverride={getDeepTrademarkLabel(deepTrademarkStatus)}
                  status={deepTrademarkStatus}
                />
              </td>

              <td className="px-2 py-2">
                <StatusBadge labelOverride={getDomainLabel(domainStatus)} status={domainStatus} />
              </td>

              <td className="px-2 py-2">
                <StatusBadge labelOverride={getSocialLabel(socialStatus)} status={socialStatus} />
              </td>

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
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
