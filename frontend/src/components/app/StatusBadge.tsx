import type { ComponentPropsWithoutRef } from 'react'
import { AlertTriangle, CheckCircle2, HelpCircle, Loader2, XCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  getClearanceStatusLabel,
  getClearanceStatusTone,
  normalizeClearanceStatus,
  type ClearanceStatus,
} from '@/lib/status/clearance'
import { cn } from '@/lib/utils'

export interface StatusBadgeProps extends Omit<ComponentPropsWithoutRef<typeof Badge>, 'children'> {
  status: string | null | undefined
  labelOverride?: string
  showIcon?: boolean
}

function getStatusIcon(status: ClearanceStatus) {
  if (status === 'G') {
    return <CheckCircle2 className="h-3 w-3" />
  }

  if (status === 'A') {
    return <AlertTriangle className="h-3 w-3" />
  }

  if (status === 'R') {
    return <XCircle className="h-3 w-3" />
  }

  if (status === 'Pending') {
    return <Loader2 className="h-3 w-3 animate-spin" />
  }

  return <HelpCircle className="h-3 w-3" />
}

export function StatusBadge({
  className,
  labelOverride,
  showIcon = true,
  status,
  ...props
}: StatusBadgeProps) {
  const normalizedStatus = normalizeClearanceStatus(status)
  const tone = getClearanceStatusTone(normalizedStatus)
  const label = labelOverride ?? getClearanceStatusLabel(normalizedStatus)

  return (
    <Badge
      className={cn(
        'inline-flex items-center gap-1 border px-2 py-0.5 text-[11px] font-medium leading-4',
        tone === 'success' && 'border-emerald-300 bg-emerald-100 text-emerald-900 hover:bg-emerald-100',
        tone === 'warning' && 'border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-100',
        tone === 'destructive' && 'border-red-300 bg-red-100 text-red-900 hover:bg-red-100',
        tone === 'pending' && 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-100',
        tone === 'neutral' && 'border-slate-300 bg-slate-100 text-slate-900 hover:bg-slate-100',
        className,
      )}
      {...props}
    >
      {showIcon ? getStatusIcon(normalizedStatus) : null}
      <span>{label}</span>
    </Badge>
  )
}
