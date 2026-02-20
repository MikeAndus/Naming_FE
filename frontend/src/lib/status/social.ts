export const SOCIAL_STATUSES = ['Clear', 'Busy', 'Mixed', 'Unknown', 'Pending'] as const

export type SocialStatus = (typeof SOCIAL_STATUSES)[number]

export interface SocialStatusEntry {
  platform: string
  status: string | null | undefined
  conflicting_handle?: string | null
}

export interface SocialStatusSummaryOptions {
  emptyLabel?: string
  separator?: string
  maxItems?: number
}

const SOCIAL_STATUS_BY_TOKEN: Record<string, SocialStatus> = {
  clear: 'Clear',
  busy: 'Busy',
  mixed: 'Mixed',
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

const SOCIAL_PLATFORM_LABELS: Record<string, string> = {
  ig: 'IG',
  instagram: 'IG',
  x: 'X',
  twitter: 'X',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function formatPlatformLabel(platform: string): string {
  const trimmedPlatform = platform.trim()
  if (!trimmedPlatform) {
    return 'Unknown'
  }

  const token = normalizeToken(trimmedPlatform)
  if (!token) {
    return 'Unknown'
  }

  return SOCIAL_PLATFORM_LABELS[token] ?? trimmedPlatform
}

export function normalizeSocialStatus(value: string | null | undefined): SocialStatus {
  if (typeof value !== 'string') {
    return 'Unknown'
  }

  const token = normalizeToken(value)
  if (!token) {
    return 'Unknown'
  }

  return SOCIAL_STATUS_BY_TOKEN[token] ?? 'Unknown'
}

export function formatSocialStatusSummary(
  platforms: readonly SocialStatusEntry[] | null | undefined,
  options: SocialStatusSummaryOptions = {},
): string {
  const emptyLabel = options.emptyLabel ?? '—'
  if (!platforms || platforms.length === 0) {
    return emptyLabel
  }

  const separator = options.separator ?? ' · '
  const normalizedMaxItems =
    typeof options.maxItems === 'number' && Number.isFinite(options.maxItems)
      ? Math.max(1, Math.floor(options.maxItems))
      : null

  const normalizedEntries = platforms
    .map((entry) => ({
      platform: formatPlatformLabel(entry.platform),
      status: normalizeSocialStatus(entry.status),
    }))
    .sort((left, right) =>
      left.platform.localeCompare(right.platform, undefined, { sensitivity: 'base' }),
    )

  if (normalizedEntries.length === 0) {
    return emptyLabel
  }

  const visibleEntries =
    normalizedMaxItems === null
      ? normalizedEntries
      : normalizedEntries.slice(0, normalizedMaxItems)

  const summary = visibleEntries
    .map((entry) => `${entry.platform}: ${entry.status}`)
    .join(separator)

  if (normalizedMaxItems === null || normalizedEntries.length <= normalizedMaxItems) {
    return summary
  }

  return `${summary}${separator}+${normalizedEntries.length - normalizedMaxItems} more`
}
