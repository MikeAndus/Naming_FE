import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { cn } from '@/lib/utils'

export type InlineBannerVariant = 'info' | 'warning' | 'destructive'

export interface InlineBannerProps extends Omit<ComponentPropsWithoutRef<'div'>, 'title'> {
  variant?: InlineBannerVariant
  title?: ReactNode
  description?: ReactNode
  icon?: ReactNode
  action?: ReactNode
}

export function InlineBanner({
  action,
  children,
  className,
  description,
  icon,
  role,
  title,
  variant = 'info',
  ...props
}: InlineBannerProps) {
  const body = description ?? children

  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 rounded-lg border px-4 py-3',
        variant === 'info' && 'border-border bg-muted/40 text-foreground',
        variant === 'warning' && 'border-amber-300 bg-amber-50 text-amber-900',
        variant === 'destructive' && 'border-destructive/40 bg-destructive/10 text-destructive',
        className,
      )}
      role={role ?? (variant === 'destructive' ? 'alert' : 'status')}
      {...props}
    >
      <div className="flex min-w-0 items-start gap-2">
        {icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
        <div className="min-w-0">
          {title ? <p className="text-sm font-medium leading-5">{title}</p> : null}
          {body ? <div className="text-sm leading-5">{body}</div> : null}
        </div>
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
