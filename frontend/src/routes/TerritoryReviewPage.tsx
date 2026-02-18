import { useState, useSyncExternalStore } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useParams } from 'react-router-dom'

import { Breadcrumbs } from '@/components/app/Breadcrumbs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type TerritoryCardStatus = 'pending' | 'approved' | 'rejected'

interface TerritoryCardPlaceholder {
  id: string
  title: string
  source: string
  status: TerritoryCardStatus
}

const RESEARCH_SECTIONS: Array<{ title: string; items: string[] }> = [
  {
    title: 'Competitive Clusters',
    items: [
      'Direct-category leaders and emergent challengers',
      'Adjacent substitutes with overlapping positioning',
      'Naming conventions that repeatedly appear in-market',
    ],
  },
  {
    title: 'Dominant Patterns',
    items: [
      'Abstract compound names with short syllable count',
      'Benefit-first phrasing over origin-story language',
      'Muted, premium-leaning tone in mature segments',
    ],
  },
  {
    title: 'Crowded Terms to Avoid',
    items: ['Core category nouns', 'Overused premium qualifiers', 'Generic trust markers'],
  },
  {
    title: 'Whitespace Hypotheses',
    items: [
      'Narrative-first territory with vivid sensory cues',
      'Process-transparency language with technical clarity',
      'Playful but still professional tone in underserved niches',
    ],
  },
]

const TERRITORY_CARD_PLACEHOLDERS: TerritoryCardPlaceholder[] = [
  { id: 'placeholder-1', title: 'Grounded Momentum', source: 'Hotspot #1', status: 'pending' },
  { id: 'placeholder-2', title: 'Bright Utility', source: 'Hotspot #2', status: 'approved' },
  { id: 'placeholder-3', title: 'Quiet Precision', source: 'Hotspot #3', status: 'pending' },
  { id: 'placeholder-4', title: 'Playful Authority', source: 'User-added', status: 'rejected' },
]

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

function getStatusBadge(status: TerritoryCardStatus) {
  if (status === 'approved') {
    return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Approved</Badge>
  }

  if (status === 'rejected') {
    return <Badge variant="destructive">Rejected</Badge>
  }

  return <Badge variant="outline">Pending</Badge>
}

export function TerritoryReviewPage() {
  const params = useParams()
  const projectId = params.projectId
  const versionId = params.versionId
  const isDesktop = useIsDesktop()
  const [isResearchCollapsed, setIsResearchCollapsed] = useState(false)

  const projectHref = projectId ? `/projects/${projectId}` : '/projects'
  const versionHref = projectId && versionId ? `/projects/${projectId}/versions/${versionId}` : undefined
  const versionLabel = versionId ? `v${versionId}` : 'Version'

  const breadcrumbItems = [
    { label: 'Dashboard', to: '/projects' },
    { label: 'Project', to: projectHref },
    ...(versionHref ? [{ label: 'Version', to: versionHref }] : [{ label: 'Version' }]),
    { label: 'Territory Review' },
  ]

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

  return (
    <section className="space-y-4 pb-8 lg:space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Breadcrumbs items={breadcrumbItems} />
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{versionLabel}</Badge>
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">territory_review</Badge>
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(280px,30%)_minmax(0,1fr)]">
        <Card className="flex h-[calc(100vh-16rem)] flex-col overflow-hidden">
          <CardHeader className="space-y-3 border-b">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Research Snapshot</CardTitle>
                <CardDescription>Reference context for territory decisions.</CardDescription>
              </div>
              <Button
                onClick={() => setIsResearchCollapsed((previous) => !previous)}
                size="sm"
                type="button"
                variant="ghost"
              >
                {isResearchCollapsed ? (
                  <>
                    <ChevronRight aria-hidden="true" className="h-4 w-4" />
                    Expand
                  </>
                ) : (
                  <>
                    <ChevronDown aria-hidden="true" className="h-4 w-4" />
                    Collapse
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          {!isResearchCollapsed ? (
            <CardContent className="flex-1 space-y-5 overflow-y-auto pt-6">
              {RESEARCH_SECTIONS.map((section) => (
                <section className="space-y-3" key={section.title}>
                  <h2 className="text-sm font-semibold tracking-wide text-foreground">{section.title}</h2>
                  <ul className="space-y-2">
                    {section.items.map((item) => (
                      <li
                        className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
                        key={item}
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </CardContent>
          ) : null}
        </Card>

        <Card className="flex h-[calc(100vh-16rem)] flex-col overflow-hidden">
          <CardHeader className="border-b">
            <CardTitle>Territory Cards</CardTitle>
            <CardDescription>
              Placeholder structure for card review, refinement, and approval actions.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-4 overflow-y-auto pt-6">
            {TERRITORY_CARD_PLACEHOLDERS.map((card) => (
              <Card className="border-muted" key={card.id}>
                <CardHeader className="space-y-3 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{card.title}</CardTitle>
                      <CardDescription>{card.source}</CardDescription>
                    </div>
                    {getStatusBadge(card.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Metaphor Fields
                    </p>
                    <div className="h-3 w-3/4 rounded bg-muted" />
                    <div className="h-3 w-2/3 rounded bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Lexical Lists
                    </p>
                    <div className="h-3 w-full rounded bg-muted" />
                    <div className="h-3 w-5/6 rounded bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Tone Fingerprint
                    </p>
                    <div className="h-3 w-2/3 rounded bg-muted" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 border-t pt-4">
                    <Button disabled size="sm" type="button" variant="default">
                      Approve
                    </Button>
                    <Button disabled size="sm" type="button" variant="outline">
                      Edit
                    </Button>
                    <Button disabled size="sm" type="button" variant="secondary">
                      Prompt to Revise
                    </Button>
                    <Button disabled size="sm" type="button" variant="destructive">
                      Reject
                    </Button>
                    <Button disabled size="sm" type="button" variant="ghost">
                      Restore
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="sticky bottom-0 z-20 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm text-muted-foreground">Approve at least one card to proceed.</p>
          <div className="flex items-center gap-2">
            <Button disabled type="button" variant="outline">
              Add New Card
            </Button>
            <Button disabled type="button">
              Confirm &amp; Proceed
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
