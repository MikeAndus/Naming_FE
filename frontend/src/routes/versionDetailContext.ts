import { useOutletContext } from 'react-router-dom'

import type { RunProgressConnectionState } from '@/features/runs/useRunProgress'
import type { RunStatusResponse } from '@/lib/api'

export interface VersionDetailOutletContextValue {
  projectId: string
  versionId: string
  runId: string | null
  runStatus: RunStatusResponse | null
  connectionState: RunProgressConnectionState
  runProgressError: Error | null
  restartRunProgress: () => void
}

export function useVersionDetailOutletContext(): VersionDetailOutletContextValue | null {
  return useOutletContext<VersionDetailOutletContextValue | null>()
}
