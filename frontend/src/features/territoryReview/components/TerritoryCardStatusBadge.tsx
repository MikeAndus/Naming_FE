import { Badge } from '@/components/ui/badge'
import type { TerritoryCardReviewStatus } from '@/lib/api'

interface TerritoryCardStatusBadgeProps {
  status: TerritoryCardReviewStatus
}

function TerritoryCardStatusBadge({ status }: TerritoryCardStatusBadgeProps) {
  if (status === 'approved') {
    return (
      <Badge className="border border-emerald-300 bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
        Approved
      </Badge>
    )
  }

  if (status === 'rejected') {
    return (
      <Badge className="border border-red-300 bg-red-100 text-red-900 hover:bg-red-100">
        Rejected
      </Badge>
    )
  }

  return (
    <Badge className="border border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-100">
      Pending
    </Badge>
  )
}

export { TerritoryCardStatusBadge }
