export type NormalizedFastClearanceStatus = 'green' | 'amber' | 'red' | 'unknown'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function getNormalizedFastClearanceStatus(
  fastClearance: unknown,
): NormalizedFastClearanceStatus {
  if (!isRecord(fastClearance)) {
    return 'unknown'
  }

  const status = fastClearance.status
  if (status === 'green' || status === 'amber' || status === 'red') {
    return status
  }

  return 'unknown'
}
