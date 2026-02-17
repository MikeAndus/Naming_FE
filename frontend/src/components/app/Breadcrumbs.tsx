import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  to?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('text-sm text-muted-foreground', className)}>
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li className="flex items-center gap-2" key={`${item.label}-${index}`}>
              {item.to && !isLast ? (
                <Link className="transition hover:text-foreground" to={item.to}>
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? 'font-medium text-foreground' : undefined}>
                  {item.label}
                </span>
              )}
              {!isLast ? <span aria-hidden="true">/</span> : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
