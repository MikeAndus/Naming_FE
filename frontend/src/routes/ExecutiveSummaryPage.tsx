import { useSyncExternalStore } from 'react'
import { Link, useParams } from 'react-router-dom'

import { Breadcrumbs } from '@/components/app/Breadcrumbs'
import { EmptyState } from '@/components/app/EmptyState'
import { SkeletonSection } from '@/components/app/SkeletonSection'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { TerritoryCardStatusBadge } from '@/features/territoryReview/components/TerritoryCardStatusBadge'
import { getTerritoryCardSourceLabel } from '@/features/territoryReview/cardLabels'
import { useRunExecutiveSummaryQuery } from '@/features/runs/queries'
import { formatDateTime } from '@/lib/date'
import { useVersionDetailOutletContext } from '@/routes/versionDetailContext'
import { getErrorMessage, type TerritoryCard } from '@/lib/api'

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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => asString(item))
    .filter((item): item is string => Boolean(item))
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => Boolean(item))
}

function readPath(record: Record<string, unknown> | null, path: string[]): unknown {
  let current: unknown = record

  for (const segment of path) {
    const currentRecord = asRecord(current)
    if (!currentRecord) {
      return undefined
    }

    current = currentRecord[segment]
  }

  return current
}

function readPathString(record: Record<string, unknown> | null, path: string[]): string | null {
  return asString(readPath(record, path))
}

function readPathStringArray(
  record: Record<string, unknown> | null,
  path: string[],
): string[] {
  return asStringArray(readPath(record, path))
}

function formatStateLabel(value: string): string {
  return value.replaceAll('_', ' ')
}

function parseStageIndex(runState: string | null | undefined): number | null {
  if (!runState) {
    return null
  }

  if (runState === 'queued') {
    return -1
  }

  if (runState === 'territory_review') {
    return 1
  }

  if (runState === 'generation_review') {
    return 8
  }

  if (runState === 'complete') {
    return 11
  }

  const matchedStage = /^stage_(\d{1,2})$/.exec(runState)
  if (!matchedStage) {
    return null
  }

  const parsed = Number(matchedStage[1])
  return Number.isInteger(parsed) ? parsed : null
}

function renderTagList(values: string[], emptyCopy: string) {
  if (values.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyCopy}</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <span className="rounded-full border bg-muted/20 px-2 py-0.5 text-xs" key={value}>
          {value}
        </span>
      ))}
    </div>
  )
}

function renderSettingValue(value: string | null): string {
  return value ?? '—'
}

function getResearchPlaceholderCopy(stageIndex: number | null): string {
  if (stageIndex !== null && stageIndex < 1) {
    return 'Competitive landscape will populate after Research Snapshot (Stage 0) completes.'
  }

  return 'Competitive landscape data is not available for this run yet.'
}

function getWhitespacePlaceholderCopy(stageIndex: number | null): string {
  if (stageIndex !== null && stageIndex < 1) {
    return 'Whitespace hypotheses will appear after Research Snapshot (Stage 0) completes.'
  }

  return 'No whitespace hypotheses are available for this run yet.'
}

function getTerritoryPlaceholderCopy(stageIndex: number | null): string {
  if (stageIndex !== null && stageIndex < 1) {
    return 'Territory cards appear after Territory Review (gate after Stage 1).'
  }

  return 'Territory cards will appear here once approved in Territory Review.'
}

function ExecutiveSummaryLoading() {
  return (
    <div className="space-y-4">
      <SkeletonSection rowCount={5} />
      <SkeletonSection rowCount={6} />
      <SkeletonSection rowCount={4} />
      <SkeletonSection rowCount={6} />
      <SkeletonSection rowCount={5} />
    </div>
  )
}

function ToneScaleRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <span className="text-xs font-medium">{value}/5</span>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <span
            className={index < value ? 'h-1.5 rounded-sm bg-foreground/80' : 'h-1.5 rounded-sm bg-muted'}
            key={`${label}-${index}`}
          />
        ))}
      </div>
    </div>
  )
}

function getToneValue(
  toneFingerprint: Record<string, unknown> | null,
  key: 'playful' | 'modern' | 'premium' | 'bold',
): number {
  const rawValue = toneFingerprint?.[key]
  if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) {
    return 3
  }

  if (rawValue < 1) {
    return 1
  }

  if (rawValue > 5) {
    return 5
  }

  return Math.round(rawValue)
}

function ReadOnlyTerritoryCards({ cards }: { cards: TerritoryCard[] }) {
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {cards.map((card) => {
        const cardData = asRecord(card.card_data)
        const toneFingerprint = asRecord(cardData?.tone_fingerprint)
        const metaphorFields = asStringArray(cardData?.metaphor_fields)
        const imageryNouns = asStringArray(cardData?.imagery_nouns)
        const actionVerbs = asStringArray(cardData?.action_verbs)

        return (
          <Card className="border-muted" key={card.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-base">{getTerritoryCardSourceLabel(card)}</CardTitle>
                  <CardDescription className="text-xs">
                    card id: <code>{card.id.slice(0, 8)}</code>
                  </CardDescription>
                </div>
                <TerritoryCardStatusBadge status={card.status} />
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <section className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Metaphor Fields
                </p>
                {renderTagList(metaphorFields, 'None')}
              </section>

              <section className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Imagery Nouns
                </p>
                {renderTagList(imageryNouns, 'None')}
              </section>

              <section className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Action Verbs
                </p>
                {renderTagList(actionVerbs, 'None')}
              </section>

              <section className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tone Fingerprint
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <ToneScaleRow label="Playful" value={getToneValue(toneFingerprint, 'playful')} />
                  <ToneScaleRow label="Modern" value={getToneValue(toneFingerprint, 'modern')} />
                  <ToneScaleRow label="Premium" value={getToneValue(toneFingerprint, 'premium')} />
                  <ToneScaleRow label="Bold" value={getToneValue(toneFingerprint, 'bold')} />
                </div>
              </section>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export function ExecutiveSummaryPage() {
  const { projectId, versionId, runId: legacyRunId } = useParams<{
    projectId: string
    versionId: string
    runId?: string
  }>()
  const versionDetailContext = useVersionDetailOutletContext()
  const runId = versionDetailContext?.runId ?? legacyRunId ?? undefined
  const isDesktop = useIsDesktop()

  const versionBuilderHref =
    projectId && versionId ? `/projects/${projectId}/versions/${versionId}` : '/projects'
  const runMonitorHref = `${versionBuilderHref}/run-monitor`
  const resultsHref = `${versionBuilderHref}/results`

  const executiveSummaryQuery = useRunExecutiveSummaryQuery(isDesktop ? runId : undefined)

  if (!projectId || !versionId || !runId) {
    return (
      <section className="space-y-4">
        <Breadcrumbs items={[{ label: 'Dashboard', to: '/projects' }, { label: 'Executive Summary' }]} />
        <EmptyState
          cta={
            <Button asChild variant="outline">
              <Link to="/projects">Back to Dashboard</Link>
            </Button>
          }
          description="Project, version, and run ids are required to open the Executive Summary."
          title="Executive Summary unavailable"
        />
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

  const summary = executiveSummaryQuery.data
  const runState = asString(summary?.run_settings?.run_state)
  const stageIndex = parseStageIndex(runState)

  const briefPayload = asRecord(summary?.brief_snapshot?.brief)
  const dialsPayload = asRecord(summary?.brief_snapshot?.dials ?? summary?.run_settings?.version_dials)
  const researchSnapshot = asRecord(summary?.research_snapshot)

  const approvedTerritoryCards = (summary?.approved_territory_cards ?? []).filter(
    (card) => card.status === 'approved',
  )

  const competitiveClusters = asRecordArray(researchSnapshot?.competitive_clusters).map(
    (cluster) => {
      return {
        name: asString(cluster.cluster_name) ?? 'Unnamed cluster',
        examples: asStringArray(cluster.examples),
        patternNotes: asString(cluster.pattern_notes),
      }
    },
  )

  const crowdedTerms = asStringArray(researchSnapshot?.avoid_list)

  const prefixes = asStringArray(readPath(researchSnapshot, ['dominant_patterns', 'prefixes']))

  const suffixes = asStringArray(readPath(researchSnapshot, ['dominant_patterns', 'suffixes']))

  const whitespaceHypotheses = asRecordArray(researchSnapshot?.whitespace_hypotheses).map(
    (row) => {
      return {
        hypothesis: asString(row.hypothesis) ?? 'Untitled hypothesis',
        rationale: asString(row.rationale),
        risk: asString(row.risk),
      }
    },
  )

  const differentiators = readPathStringArray(briefPayload, ['differentiation', 'differentiators'])
  const noGoWords = readPathStringArray(briefPayload, ['constraints', 'no_go_words'])
  const mustAvoidImplying = readPathStringArray(briefPayload, ['constraints', 'must_avoid_implying'])

  const hasBriefSnapshot =
    Boolean(readPathString(briefPayload, ['product', 'what_it_is'])) ||
    Boolean(readPathString(briefPayload, ['product', 'description'])) ||
    Boolean(readPathString(briefPayload, ['audience', 'target_market'])) ||
    Boolean(readPathString(briefPayload, ['audience', 'audience_context'])) ||
    differentiators.length > 0 ||
    noGoWords.length > 0 ||
    mustAvoidImplying.length > 0 ||
    Boolean(dialsPayload)

  const hasCompetitiveLandscapeData =
    competitiveClusters.length > 0 || prefixes.length > 0 || suffixes.length > 0 || crowdedTerms.length > 0

  const hasRunSettings =
    Boolean(runState) ||
    Boolean(asString(summary?.run_settings?.current_stage)) ||
    Boolean(asString(summary?.run_settings?.started_at)) ||
    Boolean(asString(summary?.run_settings?.completed_at))

  const breadcrumbs = [
    { label: 'Dashboard', to: '/projects' },
    { label: 'Project', to: `/projects/${projectId}` },
    { label: `v${versionId.slice(0, 8)}`, to: versionBuilderHref },
    { label: 'Executive Summary' },
  ]

  if (executiveSummaryQuery.isLoading) {
    return (
      <section className="space-y-4">
        <header className="space-y-3">
          <Breadcrumbs items={breadcrumbs} />
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to={resultsHref}>Results</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to={runMonitorHref}>Run Monitor</Link>
            </Button>
          </div>
        </header>

        <ExecutiveSummaryLoading />
      </section>
    )
  }

  if (executiveSummaryQuery.isError || !summary) {
    return (
      <section className="space-y-4">
        <Breadcrumbs items={breadcrumbs} />
        <EmptyState
          cta={
            <Button onClick={() => void executiveSummaryQuery.refetch()} type="button" variant="outline">
              Retry
            </Button>
          }
          description={getErrorMessage(executiveSummaryQuery.error, 'Please try again.')}
          title="Couldn’t load executive summary"
        />
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <header className="space-y-3">
        <Breadcrumbs items={breadcrumbs} />

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Run {summary.run_id.slice(0, 8)}</Badge>
          <Badge variant="outline">State: {renderSettingValue(runState && formatStateLabel(runState))}</Badge>
          <Button asChild size="sm" variant="outline">
            <Link to={resultsHref}>Results</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to={runMonitorHref}>Run Monitor</Link>
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Brief Snapshot</CardTitle>
          <CardDescription>Version brief and dials snapshot captured for this run.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {hasBriefSnapshot ? (
            <>
              <div className="grid gap-4 xl:grid-cols-2">
                <section className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Product
                  </p>
                  <p>
                    <span className="font-medium">What it is:</span>{' '}
                    {renderSettingValue(readPathString(briefPayload, ['product', 'what_it_is']))}
                  </p>
                  <p>
                    <span className="font-medium">Description:</span>{' '}
                    {renderSettingValue(readPathString(briefPayload, ['product', 'description']))}
                  </p>
                </section>

                <section className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Audience
                  </p>
                  <p>
                    <span className="font-medium">Target market:</span>{' '}
                    {renderSettingValue(readPathString(briefPayload, ['audience', 'target_market']))}
                  </p>
                  <p>
                    <span className="font-medium">Context:</span>{' '}
                    {renderSettingValue(readPathString(briefPayload, ['audience', 'audience_context']))}
                  </p>
                </section>
              </div>

              <section className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Differentiators
                </p>
                {renderTagList(differentiators, 'No differentiators captured.')}
              </section>

              <section className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Constraints
                </p>
                <div className="space-y-2">
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">No-go words</p>
                    {renderTagList(noGoWords, 'No no-go words provided.')}
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Must avoid implying</p>
                    {renderTagList(mustAvoidImplying, 'No implication constraints provided.')}
                  </div>
                </div>
              </section>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Brief snapshot is pending. This section will populate after run context is initialized.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Competitive Landscape</CardTitle>
          <CardDescription>Research Snapshot (Stage 0) market clusters and dominant patterns.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {hasCompetitiveLandscapeData ? (
            <>
              <section className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Competitive Clusters
                </p>
                {competitiveClusters.length > 0 ? (
                  <ul className="list-disc space-y-2 pl-5">
                    {competitiveClusters.map((cluster) => (
                      <li key={cluster.name}>
                        <p className="font-medium">{cluster.name}</p>
                        {cluster.examples.length > 0 ? (
                          <p className="text-muted-foreground">Examples: {cluster.examples.join(', ')}</p>
                        ) : null}
                        {cluster.patternNotes ? (
                          <p className="text-muted-foreground">{cluster.patternNotes}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No competitive clusters found.</p>
                )}
              </section>

              <section className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Dominant Patterns
                </p>
                <div className="grid gap-3 xl:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Prefixes</p>
                    {renderTagList(prefixes, 'No dominant prefixes found.')}
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Suffixes</p>
                    {renderTagList(suffixes, 'No dominant suffixes found.')}
                  </div>
                </div>
              </section>

              <section className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Crowded Terms to Avoid
                </p>
                {renderTagList(crowdedTerms, 'No crowded terms identified.')}
              </section>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{getResearchPlaceholderCopy(stageIndex)}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Whitespace Hypotheses</CardTitle>
          <CardDescription>Research Snapshot (Stage 0) whitespace opportunities and rationale.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {whitespaceHypotheses.length > 0 ? (
            <ol className="space-y-3">
              {whitespaceHypotheses.map((item, index) => (
                <li className="space-y-1 rounded-md border p-3" key={`${item.hypothesis}-${index}`}>
                  <p className="font-medium">{item.hypothesis}</p>
                  <p className="text-muted-foreground">
                    {item.rationale ?? 'No rationale provided.'}
                  </p>
                  {item.risk ? <p className="text-xs text-muted-foreground">Risk: {item.risk}</p> : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">{getWhitespacePlaceholderCopy(stageIndex)}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Territory Cards</CardTitle>
          <CardDescription>Approved territory cards from Territory Review.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {approvedTerritoryCards.length > 0 ? (
            <ReadOnlyTerritoryCards cards={approvedTerritoryCards} />
          ) : (
            <p className="text-sm text-muted-foreground">{getTerritoryPlaceholderCopy(stageIndex)}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Run Settings</CardTitle>
          <CardDescription>Run-level state and timing snapshot.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {hasRunSettings ? (
            <>
              <div className="grid gap-3 xl:grid-cols-2">
                <p>
                  <span className="font-medium">Run state:</span>{' '}
                  {renderSettingValue(runState && formatStateLabel(runState))}
                </p>
                <p>
                  <span className="font-medium">Current stage:</span>{' '}
                  {renderSettingValue(asString(summary.run_settings?.current_stage))}
                </p>
                <p>
                  <span className="font-medium">Started at:</span>{' '}
                  {renderSettingValue(
                    asString(summary.run_settings?.started_at)
                      ? formatDateTime(asString(summary.run_settings?.started_at) as string)
                      : null,
                  )}
                </p>
                <p>
                  <span className="font-medium">Completed at:</span>{' '}
                  {renderSettingValue(
                    asString(summary.run_settings?.completed_at)
                      ? formatDateTime(asString(summary.run_settings?.completed_at) as string)
                      : null,
                  )}
                </p>
              </div>

              <section className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Constraint Shortfalls
                </p>
                <p className="text-muted-foreground">
                  From progress:{' '}
                  {summary.constraint_shortfalls?.from_progress ? 'Available' : 'Not available yet'}
                </p>
                <p className="text-muted-foreground">
                  From stage 8 artifacts:{' '}
                  {summary.constraint_shortfalls?.from_stage8_artifacts
                    ? 'Available'
                    : 'Not available yet'}
                </p>
              </section>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Run settings are pending. This section will populate as the run progresses.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
