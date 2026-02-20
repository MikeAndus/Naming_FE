import type { QueryKey } from '@tanstack/react-query'

import {
  normalizeNameCandidateListQueryParams,
  type NameCandidateListQueryParams,
} from '@/lib/api/names.types'

export const runKeyPrefix = ['run'] as const

export const namesKeys = {
  runNamesRoot: runKeyPrefix,
  runNamesPrefix: (runId: string) => ['run', runId, 'names'] as const,
  runNames: (runId: string, params: NameCandidateListQueryParams = {}) =>
    ['run', runId, 'names', normalizeNameCandidateListQueryParams(params)] as const,
  detail: (nameId: string) => ['name', nameId] as const,
} as const

export function isRunNamesQueryKey(queryKey: QueryKey, runId?: string): boolean {
  if (queryKey[0] !== 'run' || queryKey[2] !== 'names') {
    return false
  }

  if (typeof queryKey[1] !== 'string') {
    return false
  }

  if (runId !== undefined && queryKey[1] !== runId) {
    return false
  }

  return true
}
