import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface EmptyStateProps extends Omit<ComponentPropsWithoutRef<'div'>, 'title'> {
  title: string
  description?: ReactNode
  icon?: ReactNode
  cta?: ReactNode
}

export function EmptyState({
  className,
  cta,
  description,
  icon,
  title,
  ...props
}: EmptyStateProps) {
  return (
    <Card className={cn('border-dashed', className)} {...props}>
      <CardHeader className="items-center text-center">
        {icon ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            {icon}
          </div>
        ) : null}
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      {cta ? <CardContent className="flex justify-center pt-0">{cta}</CardContent> : null}
    </Card>
  )
}
