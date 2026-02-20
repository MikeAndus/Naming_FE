import { Badge } from '@/components/ui/badge'
import {
  getDeepClearanceBadgeClassName,
  getDomainStatusLabel,
  getSocialStatusLabel,
  getSocialsAggregateStatus,
  getTrademarkStatusLabel,
} from '@/features/names/deep-clearance'
import type { DeepClearance } from '@/lib/api'

interface DeepClearanceBadgesProps {
  deepClearance: DeepClearance
}

export function DeepClearanceBadges({ deepClearance }: DeepClearanceBadgesProps) {
  const socialStatus = getSocialsAggregateStatus(deepClearance.socials)

  return (
    <div className="flex flex-wrap items-center gap-1">
      {deepClearance.trademark ? (
        <Badge className={getDeepClearanceBadgeClassName(deepClearance.trademark.status)}>
          {getTrademarkStatusLabel(deepClearance.trademark.status)}
        </Badge>
      ) : null}

      {deepClearance.domain ? (
        <Badge className={getDeepClearanceBadgeClassName(deepClearance.domain.status)}>
          {getDomainStatusLabel(deepClearance.domain.status)}
        </Badge>
      ) : null}

      {deepClearance.socials && Object.keys(deepClearance.socials).length > 0 ? (
        <Badge className={getDeepClearanceBadgeClassName(socialStatus)}>
          {getSocialStatusLabel(socialStatus)}
        </Badge>
      ) : null}
    </div>
  )
}
