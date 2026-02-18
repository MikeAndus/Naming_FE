import { useSyncExternalStore } from 'react'
import { Link, useParams } from 'react-router-dom'

import { Breadcrumbs } from '@/components/app/Breadcrumbs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useProjectDetailQuery } from '@/features/projects/queries'
import { useRunStatusQuery } from '@/features/runs/queries'
import {
  useResearchSnapshot,
  useTerritoryCards,
} from '@/features/territoryReview/queries'
import { useVersionDetailQuery } from '@/features/versions/queries'
import { getErrorMessage, parseTerritoryReviewError } from '@/lib/api'

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

interface TerritoryErrorBlockProps {
  title: string
  error: unknown
}

function TerritoryErrorBlock({ title, error }: TerritoryErrorBlockProps) {
  const parsedError = parseTerritoryReviewError(error)

  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
      <p className="text-sm font-semibold text-destructive">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">kind: {parsedError.kind}</p>
      <p className="text-sm text-muted-foreground">status: {parsedError.status ?? 'n/a'}</p>
      <p className="text-sm text-muted-foreground">message: {parsedError.message}</p>
      <pre className="mt-2 overflow-x-auto rounded bg-background p-3 text-xs">
        {JSON.stringify(parsedError.detail, null, 2)}
      </pre>
    </div>
  )
}

export function TerritoryReviewPage() {
  const { projectId, versionId } = useParams<{ projectId: string; versionId: string }>()
  const isDesktop = useIsDesktop()

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
      : versionId
        ? `v${versionId.slice(0, 8)}`
        : 'Version'

  const breadcrumbItems = [
    { label: 'Dashboard', to: '/projects' },
    {
      label: projectLabel,
      ...(projectId ? { to: `/projects/${projectId}` } : {}),
    },
    {
      label: versionLabel,
      ...(projectId && versionId
        ? { to: `/projects/${projectId}/versions/${versionId}` }
        : {}),
    },
    { label: 'Territory Review' },
  ]

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
      <section className="space-y-4">
        <Breadcrumbs items={breadcrumbItems} />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </section>
    )
  }

  if (versionQuery.isError || !versionQuery.data) {
    return (
      <section className="space-y-4">
        <Breadcrumbs items={breadcrumbItems} />
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm font-semibold text-destructive">Unable to load version</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {getErrorMessage(versionQuery.error, 'Please try again.')}
          </p>
          <Button className="mt-3" onClick={() => void versionQuery.refetch()} type="button" variant="outline">
            Retry
          </Button>
        </div>
      </section>
    )
  }

  if (runId && runStatusQuery.isLoading) {
    return (
      <section className="space-y-4">
        <Breadcrumbs items={breadcrumbItems} />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </section>
    )
  }

  if (runStatusQuery.isError) {
    return (
      <section className="space-y-4">
        <Breadcrumbs items={breadcrumbItems} />
        <TerritoryErrorBlock title="Failed to load run status" error={runStatusQuery.error} />
      </section>
    )
  }

  if (!hasTerritoryReviewRun) {
    return (
      <section className="space-y-4">
        <Breadcrumbs items={breadcrumbItems} />
        <Card>
          <CardHeader>
            <CardTitle>No territory review run found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              This version does not currently have a run in <code>territory_review</code>.
            </p>
            <p>latest_run_id: {runId ?? 'none'}</p>
            <p>latest_run_state: {runStatusQuery.data?.state ?? 'unknown'}</p>
          </CardContent>
        </Card>
      </section>
    )
  }

  if (researchSnapshotQuery.isLoading || territoryCardsQuery.isLoading) {
    return (
      <section className="space-y-4">
        <Breadcrumbs items={breadcrumbItems} />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </section>
    )
  }

  const cards = territoryCardsQuery.data ?? []

  return (
    <section className="space-y-4 pb-8">
      <header className="space-y-2">
        <Breadcrumbs items={breadcrumbItems} />
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{versionLabel}</Badge>
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">territory_review</Badge>
          <Badge variant="outline">run: {runId}</Badge>
        </div>
      </header>

      {researchSnapshotQuery.isError ? (
        <TerritoryErrorBlock title="Failed to load research snapshot" error={researchSnapshotQuery.error} />
      ) : null}

      {territoryCardsQuery.isError ? (
        <TerritoryErrorBlock title="Failed to load territory cards" error={territoryCardsQuery.error} />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Territory Review Data Access Check</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>cards_count: {cards.length}</p>

          <div className="space-y-2">
            <p className="font-medium">Research Snapshot</p>
            <pre className="max-h-72 overflow-auto rounded-md border bg-muted/20 p-3 text-xs">
              {JSON.stringify(researchSnapshotQuery.data ?? null, null, 2)}
            </pre>
          </div>

          <div className="space-y-2">
            <p className="font-medium">Territory Cards</p>
            <pre className="max-h-72 overflow-auto rounded-md border bg-muted/20 p-3 text-xs">
              {JSON.stringify(cards, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
