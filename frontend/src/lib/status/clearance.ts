export const CLEARANCE_STATUSES = ['G', 'A', 'R', 'Unknown', 'Pending'] as const

export type ClearanceStatus = (typeof CLEARANCE_STATUSES)[number]

export type ClearanceStatusTone = 'success' | 'warning' | 'destructive' | 'neutral' | 'pending'

const CLEARANCE_STATUS_BY_TOKEN: Record<string, ClearanceStatus> = {
  g: 'G',
  green: 'G',
  a: 'A',
  amber: 'A',
  yellow: 'A',
  r: 'R',
  red: 'R',
  unknown: 'Unknown',
  unk: 'Unknown',
  na: 'Unknown',
  none: 'Unknown',
  null: 'Unknown',
  undefined: 'Unknown',
  pending: 'Pending',
  queued: 'Pending',
  inprogress: 'Pending',
  processing: 'Pending',
  running: 'Pending',
  loading: 'Pending',
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
}

export function normalizeClearanceStatus(value: string | null | undefined): ClearanceStatus {
  if (typeof value !== 'string') {
    return 'Unknown'
  }

  const token = normalizeToken(value)
  if (!token) {
    return 'Unknown'
  }

  return CLEARANCE_STATUS_BY_TOKEN[token] ?? 'Unknown'
}

export function getClearanceStatusLabel(status: ClearanceStatus): string {
  if (status === 'G') {
    return 'Green'
  }

  if (status === 'A') {
    return 'Amber'
  }

  if (status === 'R') {
    return 'Red'
  }

  return status
}

export function getClearanceStatusTone(status: ClearanceStatus): ClearanceStatusTone {
  if (status === 'G') {
    return 'success'
  }

  if (status === 'A') {
    return 'warning'
  }

  if (status === 'R') {
    return 'destructive'
  }

  if (status === 'Pending') {
    return 'pending'
  }

  return 'neutral'
}
