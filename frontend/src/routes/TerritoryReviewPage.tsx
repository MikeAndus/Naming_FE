import { useState, useSyncExternalStore } from 'react'
import { Link, useParams } from 'react-router-dom'

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
import { Skeleton } from '@/components/ui/skeleton'
import { useProjectDetailQuery } from '@/features/projects/queries'
import { useRunStatusQuery } from '@/features/runs/queries'
import {
  useResearchSnapshot,
  useTerritoryCards,
} from '@/features/territoryReview/queries'
import { useVersionDetailQuery } from '@/features/versions/queries'
import {
  getErrorMessage,
  parseTerritoryReviewError,
  type ResearchSnapshot,
  type TerritoryCard,
} from '@/lib/api'

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

function getCardStatusBadge(status: TerritoryCard['status']) {
  if (status === 'approved') {
    return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">approved</Badge>
  }

  if (status === 'rejected') {
    return <Badge variant="destructive">rejected</Badge>
  }

  return <Badge variant="outline">pending</Badge>
}

function getCardLabel(card: TerritoryCard): string {
  if (card.source_hotspot_id === null) {
    return 'User-added'
  }

  return `Hotspot card ${card.source_hotspot_id.slice(0, 8)}`
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

function CardPreviewList({ cards }: { cards: TerritoryCard[] }) {
  if (cards.length === 0) {
    return (
      <Card className="border-dashed shadow-none">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">No territory cards found.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {cards.map((card) => (
        <Card className="border-muted" key={card.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">{getCardLabel(card)}</CardTitle>
                <CardDescription className="mt-1">
                  id: <code>{card.id.slice(0, 8)}</code>
                </CardDescription>
              </div>
              {getCardStatusBadge(card.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Metaphor fields:</span>{' '}
              {card.card_data.metaphor_fields.slice(0, 2).join(', ') || 'None'}
            </p>
            <p>
              <span className="font-medium">Imagery nouns:</span>{' '}
              {card.card_data.imagery_nouns.slice(0, 3).join(', ') || 'None'}
            </p>
            <p>
              <span className="font-medium">Action verbs:</span>{' '}
              {card.card_data.action_verbs.slice(0, 3).join(', ') || 'None'}
            </p>
            <p>
              <span className="font-medium">Tone:</span>{' '}
              P{card.card_data.tone_fingerprint.playful} M{card.card_data.tone_fingerprint.modern}{' '}
              Pr{card.card_data.tone_fingerprint.premium} B{card.card_data.tone_fingerprint.bold}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function TerritoryReviewPage() {
  const { projectId, versionId } = useParams<{ projectId: string; versionId: string }>()
  const isDesktop = useIsDesktop()
  const [isSnapshotCollapsed, setIsSnapshotCollapsed] = useState(false)

  const projectQuery = useProjectDetailQuery(projectId)
  const versionQuery = useVersionDetailQuery(versionId)
  const runId = versionQuery.data?.latest_run_id ?? undefined
  const runStatusQuery = useRunStatusQuery(runId)

  const hasTerritoryReviewRun = Boolean(
    runId && runStatusQuery.data && runStatusQuery.data.state === 'territory_review',
  )

  const researchSnapshotQuery = useResearchSnapshot(hasTerritoryReviewRun ? runId : undefined)
  const territoryCardsQuery = useTerritoryCards(hasTerritoryReviewRun ? runId : undefined)

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
  const showCardsCountSkeleton = isRunResolutionLoading || isCardsInitialLoading

  return (
    <section className="space-y-4 pb-8">
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
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Territory Cards</CardTitle>
              {showCardsCountSkeleton ? (
                <Skeleton className="h-6 w-10 rounded-full" />
              ) : (
                <Badge variant="outline">{cards.length}</Badge>
              )}
            </div>
            <CardDescription>Read-only card list for this territory review gate.</CardDescription>
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
              <CardPreviewList cards={cards} />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
