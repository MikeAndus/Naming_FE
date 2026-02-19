import { useSyncExternalStore } from 'react'
import { Link, useParams } from 'react-router-dom'

import { Breadcrumbs } from '@/components/app/Breadcrumbs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRunStatusQuery } from '@/features/runs/queries'
import { useVersionDetailQuery } from '@/features/versions/queries'
import { getErrorMessage, type RunState } from '@/lib/api'

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

type UnavailableCta = {
  buttonLabel: string
  href: string
  description: string
}

const PRE_REVIEW_STATES = new Set<string>(['draft', 'queued', 'stage_0', 'stage_1'])
const MID_RUN_STATES = new Set<RunState>([
  'stage_2',
  'stage_3',
  'stage_4',
  'stage_5',
  'stage_6',
  'stage_7',
  'stage_8',
])

function getUnavailableCta(
  runState: RunState,
  paths: {
    runMonitorHref: string
    territoryReviewHref: string
  },
): UnavailableCta | null {
  if (PRE_REVIEW_STATES.has(runState)) {
    return {
      buttonLabel: 'Go to Run Monitor',
      href: paths.runMonitorHref,
      description: 'Generation Review becomes available after the run reaches generation review.',
    }
  }

  if (runState === 'territory_review') {
    return {
      buttonLabel: 'Review Territory Cards',
      href: paths.territoryReviewHref,
      description: 'Finish Territory Review to continue this run toward Generation Review.',
    }
  }

  if (MID_RUN_STATES.has(runState)) {
    return {
      buttonLabel: 'Go to Run Monitor',
      href: paths.runMonitorHref,
      description: 'This run is still processing. Track progress in Run Monitor.',
    }
  }

  return null
}

export function GenerationReviewPage() {
  const { projectId, versionId } = useParams<{ projectId: string; versionId: string }>()
  const isDesktop = useIsDesktop()
  const resolvedVersionId = projectId && versionId && isDesktop ? versionId : undefined
  const versionQuery = useVersionDetailQuery(resolvedVersionId)
  const runId = versionQuery.data?.latest_run_id ?? undefined
  const runStatusQuery = useRunStatusQuery(isDesktop ? runId : undefined)

  if (!projectId || !versionId) {
    return (
      <section className="space-y-4">
        <h1 className="text-xl font-semibold">Generation Review unavailable</h1>
        <p className="text-sm text-muted-foreground">
          A project and version id are required to open this page.
        </p>
        <Button asChild variant="outline">
          <Link to="/projects">Back to Dashboard</Link>
        </Button>
      </section>
    )
  }

  if (!isDesktop) {
    return (
      <section>
        <Card>
          <CardContent className="pt-6">
            <h1 className="text-lg font-semibold">Best viewed on desktop</h1>
          </CardContent>
        </Card>
      </section>
    )
  }

  const versionBuilderHref = `/projects/${projectId}/versions/${versionId}`
  const runMonitorHref = `${versionBuilderHref}/run`
  const territoryReviewHref = `${versionBuilderHref}/territory-review`

  const breadcrumbs = [
    { label: 'Dashboard', to: '/projects' },
    { label: `Project ${projectId.slice(0, 8)}`, to: `/projects/${projectId}` },
    { label: `Version ${versionId.slice(0, 8)}`, to: versionBuilderHref },
    { label: 'Generation Review' },
  ]

  if (versionQuery.isLoading) {
    return (
      <section className="space-y-4">
        <Breadcrumbs items={breadcrumbs} />
        <Card>
          <CardHeader>
            <CardTitle>Loading Generation Review</CardTitle>
          </CardHeader>
        </Card>
      </section>
    )
  }

  if (versionQuery.isError || !versionQuery.data) {
    return (
      <section className="space-y-4">
        <Breadcrumbs items={breadcrumbs} />
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Couldn&apos;t load version</CardTitle>
            <CardDescription>{getErrorMessage(versionQuery.error, 'Please try again.')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void versionQuery.refetch()} type="button" variant="outline">
              Retry
            </Button>
          </CardContent>
        </Card>
      </section>
    )
  }

  if (!runId) {
    return (
      <section className="space-y-4">
        <Breadcrumbs items={breadcrumbs} />
        <Card>
          <CardHeader>
            <CardTitle>Generation Review unavailable</CardTitle>
            <CardDescription>
              No run exists for this version yet. Start from Version Builder first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to={versionBuilderHref}>Go to Version Builder</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    )
  }

  if (runStatusQuery.isLoading) {
    return (
      <section className="space-y-4">
        <Breadcrumbs items={breadcrumbs} />
        <Card>
          <CardHeader>
            <CardTitle>Loading run state</CardTitle>
          </CardHeader>
        </Card>
      </section>
    )
  }

  if (runStatusQuery.isError || !runStatusQuery.data) {
    return (
      <section className="space-y-4">
        <Breadcrumbs items={breadcrumbs} />
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Couldn&apos;t load run state</CardTitle>
            <CardDescription>{getErrorMessage(runStatusQuery.error, 'Please try again.')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void runStatusQuery.refetch()} type="button" variant="outline">
              Retry
            </Button>
          </CardContent>
        </Card>
      </section>
    )
  }

  const unavailableCta = getUnavailableCta(runStatusQuery.data.state, {
    runMonitorHref,
    territoryReviewHref,
  })
  if (unavailableCta) {
    return (
      <section className="space-y-4">
        <Breadcrumbs items={breadcrumbs} />
        <Card>
          <CardHeader>
            <CardTitle>Generation Review unavailable</CardTitle>
            <CardDescription>{unavailableCta.description}</CardDescription>
            <div className="pt-1">
              <Badge variant="outline">Run state: {formatStateLabel(runStatusQuery.data.state)}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to={unavailableCta.href}>{unavailableCta.buttonLabel}</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <Breadcrumbs items={breadcrumbs} />
      <Card>
        <CardHeader>
          <CardTitle>Generation Review</CardTitle>
          <CardDescription>
            Desktop Generation Review workspace is ready for this run state.
          </CardDescription>
          <div className="pt-1">
            <Badge variant="outline">Run state: {formatStateLabel(runStatusQuery.data.state)}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Full Generation Review table and curation UI are implemented in a later node.
          </p>
        </CardContent>
      </Card>
    </section>
  )
}
