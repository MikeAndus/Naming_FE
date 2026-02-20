export const runsKeys = {
  all: ['run'] as const,
  status: (runId: string) => ['runs', 'status', runId] as const,
  executiveSummary: (runId: string) => ['run', runId, 'exec-summary'] as const,
} as const

