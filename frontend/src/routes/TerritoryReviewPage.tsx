import { useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState, useSyncExternalStore } from 'react'
import { Loader2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Breadcrumbs } from '@/components/app/Breadcrumbs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { projectDetailQueryKey, useProjectDetailQuery } from '@/features/projects/queries'
import { runStatusQueryKey, useRunStatusQuery } from '@/features/runs/queries'
import { getTerritoryCardSourceLabel } from '@/features/territoryReview/cardLabels'
import { TerritoryCardList } from '@/features/territoryReview/components/TerritoryCardList'
import {
  useAddTerritoryCardMutation,
  useConfirmTerritoryCardsMutation,
  usePatchTerritoryCardStatusMutation,
  useResearchSnapshot,
  useReviseTerritoryCardMutation,
  useTerritoryCards,
} from '@/features/territoryReview/queries'
import {
  projectVersionsQueryKey,
  useVersionDetailQuery,
  versionDetailQueryKey,
} from '@/features/versions/queries'
import {
  getErrorMessage,
  TERRITORY_REVIEW_AI_UNAVAILABLE_DETAIL,
  TERRITORY_REVIEW_INVALID_LLM_SCHEMA_DETAIL,
  type ParsedTerritoryReviewError,
  parseTerritoryReviewError,
  type ResearchSnapshot,
  type TerritoryCardData,
  type TerritoryCardReviewStatus,
} from '@/lib/api'
import { toast } from '@/hooks/use-toast'

function subscribeDesktop(callback: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const mediaQuery = window.matchMedia('(min-width: 1024px)')
  const listener = () => callback()
  mediaQuery.addEventListener('change', listener)
  return () => {
    mediaQuery.removeEventListener('change', listener)
  }
}

function getDesktopSnapshot(): boolean {
  if (typeof window === 'undefined') {
    return true
  }

  return window.matchMedia('(min-width: 1024px)').matches
}

function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribeDesktop, getDesktopSnapshot, () => true)
}

function formatStateLabel(state: string): string {
  return state.replaceAll('_', ' ')
}

function getVersionStateBadgeClass(state: string): string {
  if (state === 'complete') {
    return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
  }

  if (state === 'failed') {
    return 'bg-destructive text-destructive-foreground hover:bg-destructive'
  }

  if (
    state === 'phase_1_running' ||
    state === 'territory_review' ||
    state === 'phase_2_running' ||
    state === 'generation_review' ||
    state === 'phase_3_running'
  ) {
    return 'bg-amber-100 text-amber-800 hover:bg-amber-100'
  }

  return ''
}

function getRunStateBadgeClass(state: string): string {
  if (state === 'complete') {
    return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
  }

  if (state === 'failed') {
    return 'bg-destructive text-destructive-foreground hover:bg-destructive'
  }

  return 'bg-amber-100 text-amber-800 hover:bg-amber-100'
}

function renderListOrPlaceholder(items: string[]) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">None found.</p>
  }

  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

function InlinePanelError({
  error,
  onRetry,
  title,
}: {
  error: unknown
  onRetry: () => void
  title: string
}) {
  const parsedError = parseTerritoryReviewError(error)
  const message = parsedError.message || getErrorMessage(error, 'Please try again.')

  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardHeader>
        <CardTitle className="text-base text-destructive">{title}</CardTitle>
        <CardDescription>{message}</CardDescription>
        {import.meta.env.DEV ? (
          <p className="text-xs text-muted-foreground">Error kind: {parsedError.kind}</p>
        ) : null}
      </CardHeader>
      <CardContent>
        <Button onClick={onRetry} type="button" variant="outline">
          Retry
        </Button>
      </CardContent>
    </Card>
  )
}

function getStatusMutationErrorMessage(parsedError: ParsedTerritoryReviewError): string {
  if (parsedError.kind === 'conflict') {
    return (
      parsedError.message || 'This run is not in territory review; status changes are locked.'
    )
  }

  return parsedError.message || 'Unable to update card status. Please retry.'
}

const MAX_TERRITORY_CARDS = 10

function getLlmMutationErrorMessage(parsedError: ParsedTerritoryReviewError): string {
  if (parsedError.status === 500 || parsedError.kind === 'invalid_llm_schema') {
    return TERRITORY_REVIEW_INVALID_LLM_SCHEMA_DETAIL
  }

  if (parsedError.status === 502 || parsedError.kind === 'ai_unavailable') {
    return TERRITORY_REVIEW_AI_UNAVAILABLE_DETAIL
  }

  if (parsedError.kind === 'conflict') {
    return parsedError.message || 'This run is not in territory review; generation is locked.'
  }

  return parsedError.message || 'Unable to generate territory card. Please retry.'
}

function SnapshotSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-44" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}

function CardsSkeleton() {
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card className="border-muted" key={`cards-skeleton-${index}`}>
          <CardHeader className="space-y-2 pb-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-4/5" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ResearchSnapshotSection({ snapshot }: { snapshot: ResearchSnapshot | undefined }) {
  const clusters = snapshot?.competitive_clusters ?? []
  const prefixes = snapshot?.dominant_patterns.prefixes ?? []
  const suffixes = snapshot?.dominant_patterns.suffixes ?? []
  const crowdedTerms = snapshot?.avoid_list ?? []
  const whitespaceHypotheses = snapshot?.whitespace_hypotheses ?? []

  return (
    <div className="space-y-6 text-sm">
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Competitive Clusters</h3>
        {clusters.length === 0 ? (
          <p className="text-sm text-muted-foreground">None found.</p>
        ) : (
          <ul className="list-disc space-y-2 pl-5">
            {clusters.map((cluster) => (
              <li key={cluster.cluster_name}>
                <p className="font-medium">{cluster.cluster_name}</p>
                {cluster.examples.length > 0 ? (
                  <p className="text-muted-foreground">Examples: {cluster.examples.join(', ')}</p>
                ) : null}
                {cluster.pattern_notes ? (
                  <p className="text-muted-foreground">{cluster.pattern_notes}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Dominant Patterns</h3>
        <div className="grid gap-3 xl:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Prefixes</p>
            {renderListOrPlaceholder(prefixes)}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Suffixes</p>
            {renderListOrPlaceholder(suffixes)}
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Crowded Terms to Avoid</h3>
        {crowdedTerms.length === 0 ? (
          <p className="text-sm text-muted-foreground">None found.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {crowdedTerms.map((term) => (
              <Badge key={term} variant="outline">
                {term}
              </Badge>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Whitespace Hypotheses</h3>
        {whitespaceHypotheses.length === 0 ? (
          <p className="text-sm text-muted-foreground">None found.</p>
        ) : (
          <ol className="list-decimal space-y-3 pl-5">
            {whitespaceHypotheses.map((item) => (
              <li key={`${item.hypothesis}-${item.rationale}`}>
                <p className="font-medium">{item.hypothesis}</p>
                <p className="text-muted-foreground">{item.rationale}</p>
                {item.risk ? <p className="text-xs text-muted-foreground">Risk: {item.risk}</p> : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

export function TerritoryReviewPage() {
  const { projectId, versionId } = useParams<{ projectId: string; versionId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isDesktop = useIsDesktop()
  const [isSnapshotCollapsed, setIsSnapshotCollapsed] = useState(false)
  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [addCardPrompt, setAddCardPrompt] = useState('')
  const [addCardInlineError, setAddCardInlineError] = useState<string | null>(null)

  const projectQuery = useProjectDetailQuery(projectId)
  const versionQuery = useVersionDetailQuery(versionId)
  const runId = versionQuery.data?.latest_run_id ?? undefined
  const runStatusQuery = useRunStatusQuery(runId)

  const hasTerritoryReviewRun = Boolean(
    runId && runStatusQuery.data && runStatusQuery.data.state === 'territory_review',
  )

  const patchTerritoryCardMutation = usePatchTerritoryCardStatusMutation(
    hasTerritoryReviewRun ? runId : undefined,
  )
  const reviseTerritoryCardMutation = useReviseTerritoryCardMutation(
    hasTerritoryReviewRun ? runId : undefined,
  )
  const addTerritoryCardMutation = useAddTerritoryCardMutation(
    hasTerritoryReviewRun ? runId : undefined,
  )
  const confirmTerritoryCardsMutation = useConfirmTerritoryCardsMutation(
    hasTerritoryReviewRun ? runId : undefined,
  )

  const researchSnapshotQuery = useResearchSnapshot(hasTerritoryReviewRun ? runId : undefined)
  const territoryCardsQuery = useTerritoryCards(hasTerritoryReviewRun ? runId : undefined)

  const handleStatusUpdate = (
    cardId: string,
    status: TerritoryCardReviewStatus,
  ) => {
    patchTerritoryCardMutation.mutateStatus(
      cardId,
      status,
      {
        onError: (error) => {
          const parsedError = parseTerritoryReviewError(error)
          toast({
            variant: 'destructive',
            title: 'Status update failed',
            description: getStatusMutationErrorMessage(parsedError),
          })
        },
      },
    )
  }

  const handleApproveCard = (cardId: string) => {
    handleStatusUpdate(cardId, 'approved')
  }

  const handleRejectCard = (cardId: string) => {
    handleStatusUpdate(cardId, 'rejected')
  }

  const handleRestoreCard = (cardId: string) => {
    handleStatusUpdate(cardId, 'pending')
  }

  const handleSaveCardData = (
    cardId: string,
    cardData: TerritoryCardData,
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      patchTerritoryCardMutation.mutateCardData(
        cardId,
        cardData,
        {
          onSuccess: () => {
            resolve(true)
          },
          onError: (error) => {
            const parsedError = parseTerritoryReviewError(error)
            toast({
              variant: 'destructive',
              title: 'Human override save failed',
              description: getStatusMutationErrorMessage(parsedError),
            })
            resolve(false)
          },
        },
      )
    })
  }

  const handleReviseCard = (
    cardId: string,
    revisionPrompt: string,
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      reviseTerritoryCardMutation.mutate(
        {
          cardId,
          revisionPrompt,
        },
        {
          onSuccess: () => {
            resolve(true)
          },
          onError: (error) => {
            const parsedError = parseTerritoryReviewError(error)
            toast({
              variant: 'destructive',
              title: 'Revision failed',
              description: getLlmMutationErrorMessage(parsedError),
            })
            resolve(false)
          },
        },
      )
    })
  }

  const handleAddCardSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if ((territoryCardsQuery.data?.length ?? 0) >= MAX_TERRITORY_CARDS) {
      const limitMessage = 'Card limit reached (10). Remove/reject cards before adding more.'
      setAddCardInlineError(limitMessage)
      return
    }

    const trimmedPrompt = addCardPrompt.trim()
    if (!trimmedPrompt) {
      setAddCardInlineError('Prompt is required.')
      return
    }

    setAddCardInlineError(null)
    addTerritoryCardMutation.mutate(
      { prompt: trimmedPrompt },
      {
        onSuccess: () => {
          setIsAddCardDialogOpen(false)
          setAddCardPrompt('')
          setAddCardInlineError(null)
          toast({
            title: 'New territory card added',
          })
        },
        onError: (error) => {
          const parsedError = parseTerritoryReviewError(error)
          const message = getLlmMutationErrorMessage(parsedError)
          setAddCardInlineError(message)
          toast({
            variant: 'destructive',
            title: 'Add card failed',
            description: message,
          })
        },
      },
    )
  }

  const handleConfirmProceed = () => {
    if (!projectId || !versionId || !runId) {
      return
    }

    confirmTerritoryCardsMutation.mutate(undefined, {
      onSuccess: async () => {
        setIsConfirmDialogOpen(false)

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: runStatusQueryKey(runId),
            exact: true,
          }),
          queryClient.invalidateQueries({
            queryKey: versionDetailQueryKey(versionId),
            exact: true,
          }),
          queryClient.invalidateQueries({
            queryKey: projectDetailQueryKey(projectId),
            exact: true,
          }),
          queryClient.invalidateQueries({
            queryKey: projectVersionsQueryKey(projectId),
            exact: true,
          }),
        ])

        navigate(`/projects/${projectId}/versions/${versionId}/run`)
      },
      onError: (error) => {
        const parsedError = parseTerritoryReviewError(error)
        toast({
          variant: 'destructive',
          title: 'Confirm failed',
          description: parsedError.message || getErrorMessage(error),
        })
      },
    })
  }

  const projectLabel = projectQuery.data?.name?.trim() || 'Project'
  const versionLabel =
    versionQuery.data?.version_number !== undefined
      ? `v${versionQuery.data.version_number}`
      : 'v?'

  const breadcrumbItems = [
    { label: 'Dashboard', to: '/projects' },
    { label: projectLabel, to: `/projects/${projectId}` },
    { label: versionLabel, to: `/projects/${projectId}/versions/${versionId}` },
    { label: 'Territory Review' },
  ]

  const isRunResolutionLoading =
    versionQuery.isLoading || (Boolean(runId) && runStatusQuery.isLoading)

  const isSnapshotInitialLoading =
    hasTerritoryReviewRun && researchSnapshotQuery.isLoading && !researchSnapshotQuery.data
  const isCardsInitialLoading =
    hasTerritoryReviewRun && territoryCardsQuery.isLoading && !territoryCardsQuery.data

  if (!projectId || !versionId) {
    return (
      <section className="space-y-4">
        <Breadcrumbs items={[{ label: 'Dashboard', to: '/projects' }, { label: 'Territory Review' }]} />
        <h1 className="text-xl font-semibold">Territory Review unavailable</h1>
        <p className="text-sm text-muted-foreground">
          A project and version id are required to load territory review data.
        </p>
        <Button asChild variant="outline">
          <Link to="/projects">Back to Dashboard</Link>
        </Button>
      </section>
    )
  }

  if (!isDesktop) {
    return (
      <section className="space-y-4">
        <Breadcrumbs items={breadcrumbItems} />
        <Card>
          <CardContent className="pt-6">
            <h1 className="text-lg font-semibold">Desktop only</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Territory Review is currently available on desktop viewports (`lg` and up).
            </p>
          </CardContent>
        </Card>
      </section>
    )
  }

  if (versionQuery.isLoading) {
    return (
      <section className="space-y-4 pb-8">
        <header className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <Breadcrumbs items={breadcrumbItems} />
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-28 rounded-full" />
            </div>
          </div>
        </header>

        <div className="grid gap-4 grid-cols-[minmax(280px,30%)_minmax(0,1fr)]">
          <Card className="h-[calc(100vh-12.5rem)] overflow-hidden">
            <CardHeader className="border-b">
              <CardTitle>Research Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="h-full overflow-y-auto pt-6">
              <SnapshotSkeleton />
            </CardContent>
          </Card>
          <Card className="h-[calc(100vh-12.5rem)] overflow-hidden">
            <CardHeader className="border-b">
              <CardTitle>Territory Cards</CardTitle>
            </CardHeader>
            <CardContent className="h-full overflow-y-auto pt-6">
              <CardsSkeleton />
            </CardContent>
          </Card>
        </div>
      </section>
    )
  }

  if (versionQuery.isError || !versionQuery.data) {
    return (
      <section className="space-y-4">
        <Breadcrumbs items={breadcrumbItems} />
        <InlinePanelError
          error={versionQuery.error}
          onRetry={() => {
            void versionQuery.refetch()
          }}
          title="Couldn’t load version"
        />
      </section>
    )
  }

  if (runStatusQuery.isError) {
    return (
      <section className="space-y-4">
        <Breadcrumbs items={breadcrumbItems} />
        <InlinePanelError
          error={runStatusQuery.error}
          onRetry={() => {
            void runStatusQuery.refetch()
          }}
          title="Couldn’t load run state"
        />
      </section>
    )
  }

  if (!isRunResolutionLoading && !hasTerritoryReviewRun) {
    return (
      <section className="space-y-4">
        <header className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Breadcrumbs items={breadcrumbItems} />
            <div className="flex items-center gap-2">
              <Badge className={getVersionStateBadgeClass(versionQuery.data.state)}>
                {formatStateLabel(versionQuery.data.state)}
              </Badge>
              {runStatusQuery.data?.state ? (
                <Badge className={getRunStateBadgeClass(runStatusQuery.data.state)}>
                  {formatStateLabel(runStatusQuery.data.state)}
                </Badge>
              ) : (
                <Badge variant="outline">No run</Badge>
              )}
            </div>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>No territory review run found</CardTitle>
            <CardDescription>
              This version does not currently have a run in `territory_review`.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to={`/projects/${projectId}/versions/${versionId}`}>Back to Version Builder</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    )
  }

  const cards = territoryCardsQuery.data ?? []
  const approvedCards = cards.filter((card) => card.status === 'approved')
  const rejectedCount = cards.filter((card) => card.status === 'rejected').length
  const approvedCount = approvedCards.length
  const pendingCount = cards.length - approvedCount - rejectedCount
  const showCardsCountSkeleton = isRunResolutionLoading || isCardsInitialLoading
  const hasReachedCardLimit = cards.length >= MAX_TERRITORY_CARDS
  const isAddCardDisabled =
    isRunResolutionLoading ||
    isCardsInitialLoading ||
    territoryCardsQuery.isError ||
    hasReachedCardLimit
  const isConfirmDisabledForApproval = approvedCount < 1
  const isConfirmDisabled =
    isConfirmDisabledForApproval ||
    confirmTerritoryCardsMutation.isPending ||
    isRunResolutionLoading ||
    isCardsInitialLoading ||
    territoryCardsQuery.isError

  return (
    <section className="space-y-4 pb-28">
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <Breadcrumbs items={breadcrumbItems} />
          <div className="flex items-center gap-2">
            {versionQuery.isLoading ? (
              <Skeleton className="h-6 w-24 rounded-full" />
            ) : (
              <Badge className={getVersionStateBadgeClass(versionQuery.data.state)}>
                {formatStateLabel(versionQuery.data.state)}
              </Badge>
            )}
            {isRunResolutionLoading ? (
              <Skeleton className="h-6 w-28 rounded-full" />
            ) : runStatusQuery.data?.state ? (
              <Badge className={getRunStateBadgeClass(runStatusQuery.data.state)}>
                {formatStateLabel(runStatusQuery.data.state)}
              </Badge>
            ) : (
              <Badge variant="outline">No run</Badge>
            )}
          </div>
        </div>

        <div>
          <Button
            onClick={() => setIsSnapshotCollapsed((current) => !current)}
            size="sm"
            type="button"
            variant="outline"
          >
            {isSnapshotCollapsed ? 'Expand snapshot' : 'Collapse snapshot'}
          </Button>
        </div>
      </header>

      <div
        className={`grid gap-4 ${
          isSnapshotCollapsed
            ? 'grid-cols-1'
            : 'grid-cols-[minmax(280px,30%)_minmax(0,1fr)]'
        }`}
      >
        {!isSnapshotCollapsed ? (
          <Card className="h-[calc(100vh-12.5rem)] overflow-hidden">
            <CardHeader className="border-b">
              <CardTitle>Research Snapshot</CardTitle>
              <CardDescription>Read-only Stage 0 context.</CardDescription>
            </CardHeader>
            <CardContent className="h-full overflow-y-auto pt-6">
              {isRunResolutionLoading || isSnapshotInitialLoading ? <SnapshotSkeleton /> : null}

              {!isRunResolutionLoading && !isSnapshotInitialLoading && researchSnapshotQuery.isError ? (
                <InlinePanelError
                  error={researchSnapshotQuery.error}
                  onRetry={() => {
                    void researchSnapshotQuery.refetch()
                  }}
                  title="Couldn’t load research snapshot"
                />
              ) : null}

              {!isRunResolutionLoading &&
              !isSnapshotInitialLoading &&
              !researchSnapshotQuery.isError ? (
                <ResearchSnapshotSection snapshot={researchSnapshotQuery.data} />
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <Card className="h-[calc(100vh-12.5rem)] overflow-hidden">
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CardTitle>Territory Cards</CardTitle>
                {showCardsCountSkeleton ? (
                  <Skeleton className="h-6 w-10 rounded-full" />
                ) : (
                  <Badge variant="outline">{cards.length}</Badge>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <Button
                  disabled={isAddCardDisabled}
                  onClick={() => {
                    setAddCardInlineError(null)
                    setIsAddCardDialogOpen(true)
                  }}
                  size="sm"
                  title={
                    hasReachedCardLimit
                      ? 'Card limit reached (10). Remove/reject cards before adding more.'
                      : undefined
                  }
                  type="button"
                >
                  Add New Card
                </Button>
                {hasReachedCardLimit ? (
                  <p className="text-xs text-muted-foreground">
                    Card limit reached (10). Remove/reject cards before adding more.
                  </p>
                ) : null}
              </div>
            </div>
            <CardDescription>Review, revise, and add cards for this territory review gate.</CardDescription>
          </CardHeader>
          <CardContent className="h-full overflow-y-auto pt-6">
            {isRunResolutionLoading || isCardsInitialLoading ? <CardsSkeleton /> : null}

            {!isRunResolutionLoading && !isCardsInitialLoading && territoryCardsQuery.isError ? (
              <InlinePanelError
                error={territoryCardsQuery.error}
                onRetry={() => {
                  void territoryCardsQuery.refetch()
                }}
                title="Couldn’t load territory cards"
              />
            ) : null}

            {!isRunResolutionLoading && !isCardsInitialLoading && !territoryCardsQuery.isError ? (
              <TerritoryCardList
                cards={cards}
                isCardPending={patchTerritoryCardMutation.isCardPending}
                isCardRevising={reviseTerritoryCardMutation.isCardPending}
                onApprove={handleApproveCard}
                onReject={handleRejectCard}
                onReviseCard={handleReviseCard}
                onRestore={handleRestoreCard}
                onSaveCardData={handleSaveCardData}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="sticky bottom-0 z-30 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {approvedCount} approved • {rejectedCount} rejected • {pendingCount} pending
          </p>
          {isConfirmDisabledForApproval ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex" tabIndex={0}>
                    <Button
                      disabled={isConfirmDisabled}
                      onClick={() => setIsConfirmDialogOpen(true)}
                      type="button"
                    >
                      Confirm &amp; Proceed
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>At least one card must be approved.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button
              disabled={isConfirmDisabled}
              onClick={() => setIsConfirmDialogOpen(true)}
              type="button"
            >
              Confirm &amp; Proceed
            </Button>
          )}
        </div>
      </div>

      <Dialog
        onOpenChange={(nextOpen) => {
          if (!confirmTerritoryCardsMutation.isPending) {
            setIsConfirmDialogOpen(nextOpen)
          }
        }}
        open={isConfirmDialogOpen}
      >
        <DialogContent
          onEscapeKeyDown={(event) => {
            if (confirmTerritoryCardsMutation.isPending) {
              event.preventDefault()
            }
          }}
          onPointerDownOutside={(event) => {
            if (confirmTerritoryCardsMutation.isPending) {
              event.preventDefault()
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Confirm &amp; Proceed</DialogTitle>
            <DialogDescription>
              Proceeding with {approvedCount} approved card(s). {rejectedCount} card(s) rejected
              and will be excluded from generation. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-sm font-medium">Approved cards</p>
            {approvedCards.length === 0 ? (
              <p className="text-sm text-muted-foreground">No approved cards selected.</p>
            ) : (
              <ul className="max-h-44 list-disc space-y-1 overflow-y-auto pl-5 text-sm">
                {approvedCards.map((card) => (
                  <li key={card.id}>
                    {getTerritoryCardSourceLabel(card)} ({card.id.slice(0, 8)})
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter>
            <Button
              disabled={confirmTerritoryCardsMutation.isPending}
              onClick={() => setIsConfirmDialogOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isConfirmDisabled}
              onClick={handleConfirmProceed}
              type="button"
            >
              {confirmTerritoryCardsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                'Confirm'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(nextOpen) => {
          if (!addTerritoryCardMutation.isPending) {
            setIsAddCardDialogOpen(nextOpen)
          }
        }}
        open={isAddCardDialogOpen}
      >
        <DialogContent
          className="sm:max-w-xl"
          onEscapeKeyDown={(event) => {
            if (addTerritoryCardMutation.isPending) {
              event.preventDefault()
            }
          }}
          onPointerDownOutside={(event) => {
            if (addTerritoryCardMutation.isPending) {
              event.preventDefault()
            }
          }}
        >
          <form className="space-y-4" onSubmit={handleAddCardSubmit}>
            <DialogHeader>
              <DialogTitle>Add New Card</DialogTitle>
              <DialogDescription>
                Write a prompt and generate a new user-added territory card.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Textarea
                className="min-h-[150px]"
                disabled={addTerritoryCardMutation.isPending}
                onChange={(event) => {
                  setAddCardPrompt(event.target.value)
                  if (addCardInlineError) {
                    setAddCardInlineError(null)
                  }
                }}
                placeholder="Example: Build a territory around resilient growth, confident tone, and practical innovation."
                value={addCardPrompt}
              />
              {addTerritoryCardMutation.isPending ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating territory card...
                </p>
              ) : null}
              {addCardInlineError ? (
                <p className="text-sm text-destructive">{addCardInlineError}</p>
              ) : null}
            </div>

            <DialogFooter>
              <Button
                disabled={addTerritoryCardMutation.isPending}
                onClick={() => setIsAddCardDialogOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={addTerritoryCardMutation.isPending || addCardPrompt.trim().length === 0}
                type="submit"
              >
                {addTerritoryCardMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Card'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}
