import { Badge } from '@/components/ui/badge'
import {
  getNormalizedFastClearanceStatus,
  type NormalizedFastClearanceStatus,
} from '@/features/names/fast-clearance'

function getFastClearanceLabel(status: NormalizedFastClearanceStatus): string {
  if (status === 'green') {
    return 'Green'
  }

  if (status === 'amber') {
    return 'Amber'
  }

  if (status === 'red') {
    return 'Red'
  }

  return 'Unknown'
}

function getFastClearanceClassName(status: NormalizedFastClearanceStatus): string {
  if (status === 'green') {
    return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
  }

  if (status === 'amber') {
    return 'bg-amber-100 text-amber-700 hover:bg-amber-100'
  }

  if (status === 'red') {
    return 'bg-red-100 text-red-700 hover:bg-red-100'
  }

  return 'bg-gray-100 text-gray-500 hover:bg-gray-100'
}

interface FastClearanceBadgeProps {
  fastClearance: unknown
}

export function FastClearanceBadge({ fastClearance }: FastClearanceBadgeProps) {
  const normalizedStatus = getNormalizedFastClearanceStatus(fastClearance)

  return (
    <Badge className={getFastClearanceClassName(normalizedStatus)}>
      {getFastClearanceLabel(normalizedStatus)}
    </Badge>
  )
}
