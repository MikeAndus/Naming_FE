import type { ComponentPropsWithoutRef } from 'react'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface SkeletonSectionRow {
  className?: string
}

const DEFAULT_ROW_WIDTHS = ['w-full', 'w-5/6', 'w-2/3'] as const

export interface SkeletonSectionProps extends ComponentPropsWithoutRef<'section'> {
  showHeader?: boolean
  showHeaderAction?: boolean
  rowCount?: number
  rowClassName?: string
  rows?: SkeletonSectionRow[]
}

export function SkeletonSection({
  className,
  rowClassName,
  rowCount = 4,
  rows,
  showHeader = true,
  showHeaderAction = false,
  ...props
}: SkeletonSectionProps) {
  const renderedRows: SkeletonSectionRow[] =
    rows ??
    Array.from({ length: rowCount }, () => {
      return {}
    })

  return (
    <section className={cn('space-y-4 rounded-lg border bg-background p-4', className)} {...props}>
      {showHeader ? (
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-5 w-40" />
          {showHeaderAction ? <Skeleton className="h-8 w-24 rounded-md" /> : null}
        </div>
      ) : null}

      <div className="space-y-3">
        {renderedRows.map((row, index) => {
          const defaultWidth = DEFAULT_ROW_WIDTHS[index % DEFAULT_ROW_WIDTHS.length]
          return (
            <Skeleton
              className={cn('h-4', defaultWidth, rowClassName, row.className)}
              key={`skeleton-row-${index}`}
            />
          )
        })}
      </div>
    </section>
  )
}
