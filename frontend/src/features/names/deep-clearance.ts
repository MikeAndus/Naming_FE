import type { DeepClearance, SocialClearanceStatus, SocialClearanceMap } from '@/lib/api'

export function hasDeepClearanceData(deepClearance: DeepClearance | null): boolean {
  if (!deepClearance) {
    return false
  }

  return (
    Boolean(deepClearance.trademark) ||
    Boolean(deepClearance.domain) ||
    Boolean(deepClearance.socials && Object.keys(deepClearance.socials).length > 0)
  )
}

export function getTrademarkStatusLabel(status: string): string {
  if (status === 'green') {
    return 'TM Green'
  }
  if (status === 'amber') {
    return 'TM Amber'
  }
  if (status === 'red') {
    return 'TM Red'
  }
  if (status === 'pending') {
    return 'TM Pending'
  }
  return 'TM Unknown'
}

export function getDomainStatusLabel(status: string): string {
  if (status === 'available') {
    return 'Domain Available'
  }
  if (status === 'taken') {
    return 'Domain Taken'
  }
  if (status === 'pending') {
    return 'Domain Pending'
  }
  return 'Domain Unknown'
}

function normalizeSocialStatus(status: unknown): SocialClearanceStatus {
  if (
    status === 'clear' ||
    status === 'busy' ||
    status === 'mixed' ||
    status === 'unknown' ||
    status === 'pending'
  ) {
    return status
  }

  return 'unknown'
}

export function getSocialsAggregateStatus(
  socials: SocialClearanceMap | undefined,
): SocialClearanceStatus {
  if (!socials || Object.keys(socials).length === 0) {
    return 'unknown'
  }

  const statuses = Object.values(socials).map((entry) => normalizeSocialStatus(entry.status))
  if (statuses.includes('mixed')) {
    return 'mixed'
  }

  const uniqueStatuses = new Set(statuses)
  if (uniqueStatuses.size === 1) {
    return statuses[0]
  }

  if (uniqueStatuses.has('pending')) {
    return 'mixed'
  }

  if (uniqueStatuses.has('clear') && uniqueStatuses.has('busy')) {
    return 'mixed'
  }

  if (uniqueStatuses.has('busy')) {
    return 'busy'
  }

  if (uniqueStatuses.has('clear')) {
    return 'clear'
  }

  return 'unknown'
}

export function getSocialStatusLabel(status: SocialClearanceStatus): string {
  if (status === 'clear') {
    return 'Social Clear'
  }
  if (status === 'busy') {
    return 'Social Busy'
  }
  if (status === 'mixed') {
    return 'Social Mixed'
  }
  if (status === 'pending') {
    return 'Social Pending'
  }
  return 'Social Unknown'
}

export function getDeepClearanceBadgeClassName(status: string): string {
  if (status === 'green' || status === 'available' || status === 'clear') {
    return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
  }

  if (status === 'amber' || status === 'mixed') {
    return 'bg-amber-100 text-amber-700 hover:bg-amber-100'
  }

  if (status === 'red' || status === 'taken' || status === 'busy') {
    return 'bg-red-100 text-red-700 hover:bg-red-100'
  }

  if (status === 'pending') {
    return 'bg-slate-100 text-slate-700 hover:bg-slate-100'
  }

  return 'bg-gray-100 text-gray-500 hover:bg-gray-100'
}
