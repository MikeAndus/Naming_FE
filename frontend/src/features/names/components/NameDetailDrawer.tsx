import { useEffect, useRef, useState } from 'react'
import { Star } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { DeepClearanceBadges } from '@/features/names/components/DeepClearanceBadges'
import {
  getDeepClearanceBadgeClassName,
  getSocialStatusLabel,
  getSocialsAggregateStatus,
  getDomainStatusLabel,
  getTrademarkStatusLabel,
  hasDeepClearanceData,
} from '@/features/names/deep-clearance'
import { FastClearanceBadge } from '@/features/names/components/FastClearanceBadge'
import { usePatchNameCandidateMutation } from '@/features/names/queries'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { toast } from '@/hooks/use-toast'
import { type NameCandidateResponse, type SocialClearanceMap, getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

interface NameDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  candidate: NameCandidateResponse | null
  runId: string
  onToggleShortlisted: (candidate: NameCandidateResponse) => void
  onToggleSelectedForClearance: (candidate: NameCandidateResponse) => void
}

type NoteSaveState = 'idle' | 'saved' | 'error'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function formatFamilyLabel(value: string): string {
  return value.replaceAll('_', ' ')
}

function formatFormatLabel(value: string): string {
  return value.replaceAll('_', ' ')
}

function formatTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

function getNumericScore(scores: Record<string, unknown>, key: string): string {
  const value = scores[key]
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—'
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function getFastClearanceDetails(fastClearance: unknown): {
  checkedAt: string | null
  reason: string | null
  rawResponse: unknown
  status: string | null
} {
  if (!isRecord(fastClearance)) {
    return {
      checkedAt: null,
      reason: null,
      rawResponse: undefined,
      status: null,
    }
  }

  return {
    checkedAt: formatTimestamp(fastClearance.checked_at),
    reason: typeof fastClearance.reason === 'string' ? fastClearance.reason : null,
    rawResponse: fastClearance.raw_response,
    status: typeof fastClearance.status === 'string' ? fastClearance.status : null,
  }
}

function formatRawResponse(rawResponse: unknown): string | null {
  if (typeof rawResponse === 'undefined') {
    return null
  }

  if (typeof rawResponse === 'string') {
    return rawResponse
  }

  try {
    return JSON.stringify(rawResponse, null, 2)
  } catch {
    return String(rawResponse)
  }
}

function getNotesSaveStatusCopy(isSaving: boolean, saveState: NoteSaveState): string {
  if (isSaving) {
    return 'Saving...'
  }

  if (saveState === 'saved') {
    return 'Saved'
  }

  if (saveState === 'error') {
    return 'Error saving'
  }

  return 'Idle'
}

function DeepClearanceSectionSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-2 rounded-md border p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <Skeleton className="h-4 w-36" />
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-4 w-44" />
    </div>
  )
}

function SocialClearanceRows({ socials }: { socials: SocialClearanceMap }) {
  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-medium text-muted-foreground">Socials</p>
        <Badge className={getDeepClearanceBadgeClassName(getSocialsAggregateStatus(socials))}>
          {getSocialStatusLabel(getSocialsAggregateStatus(socials))}
        </Badge>
      </div>

      <div className="space-y-2 text-xs">
        {Object.entries(socials).map(([platform, result]) => (
          <div className="rounded-sm bg-muted/40 p-2" key={platform}>
            <p className="font-medium">{platform}</p>
            <p className="text-muted-foreground">Status: {result.status}</p>
            <p className="text-muted-foreground">Handle: {result.handle}</p>
            <p className="text-muted-foreground">
              Checked: {formatTimestamp(result.checked_at) ?? '—'}
            </p>
            {result.reason ? (
              <p className="text-muted-foreground">Reason: {result.reason}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

function NameDetailDrawerContent({
  candidate,
  open,
  runId,
  onToggleShortlisted,
  onToggleSelectedForClearance,
}: {
  candidate: NameCandidateResponse
  open: boolean
  runId: string
  onToggleShortlisted: (candidate: NameCandidateResponse) => void
  onToggleSelectedForClearance: (candidate: NameCandidateResponse) => void
}) {
  const patchMutation = usePatchNameCandidateMutation()
  const [notesDraft, setNotesDraft] = useState(candidate.notes ?? '')
  const [notesSaveState, setNotesSaveState] = useState<NoteSaveState>('idle')
  const debouncedNotes = useDebouncedValue(notesDraft, 700)
  const noteMutationSeqRef = useRef(0)
  const notesSaveStateTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (notesSaveStateTimerRef.current !== null) {
        window.clearTimeout(notesSaveStateTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }

    const candidateNotes = candidate.notes ?? ''
    if (debouncedNotes === candidateNotes) {
      return
    }

    const previousNotes = candidateNotes
    const mutationSeq = noteMutationSeqRef.current + 1
    noteMutationSeqRef.current = mutationSeq

    patchMutation.mutate(
      {
        nameId: candidate.id,
        runId,
        patch: {
          notes: debouncedNotes.trim().length > 0 ? debouncedNotes : null,
        },
      },
      {
        onSuccess: () => {
          if (noteMutationSeqRef.current !== mutationSeq) {
            return
          }

          setNotesSaveState('saved')
          if (notesSaveStateTimerRef.current !== null) {
            window.clearTimeout(notesSaveStateTimerRef.current)
          }
          notesSaveStateTimerRef.current = window.setTimeout(() => {
            setNotesSaveState((current) => (current === 'saved' ? 'idle' : current))
          }, 1200)
        },
        onError: (error) => {
          if (noteMutationSeqRef.current !== mutationSeq) {
            return
          }

          setNotesDraft(previousNotes)
          setNotesSaveState('error')
          toast({
            variant: 'destructive',
            title: 'Failed to save notes',
            description: getErrorMessage(error, 'Please try again.'),
          })
        },
      },
    )
  }, [candidate.id, candidate.notes, debouncedNotes, open, patchMutation, runId])

  const scores = isRecord(candidate.scores) ? candidate.scores : {}
  const compositeScore = getNumericScore(scores, 'composite')
  const fitScore = getNumericScore(scores, 'fit')
  const distinctivenessScore = getNumericScore(scores, 'distinctiveness')
  const whitespaceScore = getNumericScore(scores, 'whitespace')
  const usabilityScore = getNumericScore(scores, 'usability')
  const extendabilityScore = getNumericScore(scores, 'extendability')

  const fastClearance = getFastClearanceDetails(candidate.fast_clearance)
  const rawResponse = formatRawResponse(fastClearance.rawResponse)
  const deepClearance = candidate.deep_clearance
  const hasDeepClearance = hasDeepClearanceData(deepClearance)
  const showDeepClearanceSkeletons = candidate.selected_for_clearance && !hasDeepClearance
  const missingTrademark = candidate.selected_for_clearance && !deepClearance?.trademark
  const missingDomain = candidate.selected_for_clearance && !deepClearance?.domain
  const missingSocials =
    candidate.selected_for_clearance &&
    (!deepClearance?.socials || Object.keys(deepClearance.socials).length === 0)

  return (
    <>
      <SheetHeader className="space-y-3 border-b px-4 py-4 pr-12">
        <div className="space-y-1">
          <SheetTitle className="text-xl">{candidate.name_text}</SheetTitle>
          <SheetDescription>Name candidate details</SheetDescription>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{formatFamilyLabel(candidate.family)}</Badge>
          <Badge variant="outline">{formatFormatLabel(candidate.format)}</Badge>
          <Badge variant="outline">{candidate.territory_card_label}</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              onToggleShortlisted(candidate)
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            <Star
              className={cn(
                'h-4 w-4',
                candidate.shortlisted
                  ? 'fill-amber-400 text-amber-500'
                  : 'fill-transparent text-muted-foreground',
              )}
            />
            {candidate.shortlisted ? 'Shortlisted' : 'Shortlist'}
          </Button>

          <label className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs">
            <Checkbox
              checked={candidate.selected_for_clearance}
              onCheckedChange={(checked) => {
                const nextValue = checked === true
                if (nextValue === candidate.selected_for_clearance) {
                  return
                }
                onToggleSelectedForClearance(candidate)
              }}
            />
            <span>Selected for clearance</span>
          </label>
        </div>
      </SheetHeader>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 text-sm">
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Score breakdown
          </h3>
          <div className="rounded-md border p-3">
            <p className="text-sm font-semibold">Composite: {compositeScore}</p>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <p>Fit: {fitScore}</p>
              <p>Distinctiveness: {distinctivenessScore}</p>
              <p>Whitespace: {whitespaceScore}</p>
              <p>Usability: {usabilityScore}</p>
              <p>Extendability: {extendabilityScore}</p>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Clearance detail
          </h3>
          <div className="space-y-3 rounded-md border p-3">
            {hasDeepClearance && deepClearance ? (
              <DeepClearanceBadges deepClearance={deepClearance} />
            ) : (
              <div className="flex items-center gap-2">
                <FastClearanceBadge fastClearance={candidate.fast_clearance} />
                {fastClearance.checkedAt ? (
                  <p className="text-xs text-muted-foreground">Checked: {fastClearance.checkedAt}</p>
                ) : null}
              </div>
            )}

            {fastClearance.status === 'unknown' ? (
              <p className="text-xs text-muted-foreground">
                {fastClearance.reason
                  ? fastClearance.reason
                  : 'Unknown (no reason provided)'}
              </p>
            ) : null}

            {rawResponse ? (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Raw response</p>
                <pre className="max-h-56 overflow-auto rounded-md bg-muted p-2 text-xs">
                  {rawResponse}
                </pre>
              </div>
            ) : null}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Deep Clearance
          </h3>

          {!candidate.selected_for_clearance ? (
            <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              Not selected for deep clearance
            </div>
          ) : showDeepClearanceSkeletons ? (
            <div className="space-y-2">
              <DeepClearanceSectionSkeleton label="Trademark" />
              <DeepClearanceSectionSkeleton label="Domain" />
              <DeepClearanceSectionSkeleton label="Socials" />
            </div>
          ) : (
            <div className="space-y-2">
              {deepClearance?.trademark ? (
                <div className="space-y-2 rounded-md border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-medium text-muted-foreground">Trademark</p>
                    <Badge className={getDeepClearanceBadgeClassName(deepClearance.trademark.status)}>
                      {getTrademarkStatusLabel(deepClearance.trademark.status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Checked: {formatTimestamp(deepClearance.trademark.checked_at) ?? '—'}
                  </p>
                  {deepClearance.trademark.reason ? (
                    <p className="text-xs text-muted-foreground">
                      Reason: {deepClearance.trademark.reason}
                    </p>
                  ) : null}
                  {deepClearance.trademark.similar_marks.length > 0 ? (
                    <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                      {deepClearance.trademark.similar_marks.slice(0, 4).map((mark, index) => (
                        <li key={`${mark.mark_name}-${index}`}>{mark.mark_name}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : missingTrademark ? (
                <DeepClearanceSectionSkeleton label="Trademark" />
              ) : null}

              {deepClearance?.domain ? (
                <div className="space-y-2 rounded-md border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-medium text-muted-foreground">Domain</p>
                    <Badge className={getDeepClearanceBadgeClassName(deepClearance.domain.status)}>
                      {getDomainStatusLabel(deepClearance.domain.status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Domain: {deepClearance.domain.domain_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Checked: {formatTimestamp(deepClearance.domain.checked_at) ?? '—'}
                  </p>
                  {deepClearance.domain.reason ? (
                    <p className="text-xs text-muted-foreground">
                      Reason: {deepClearance.domain.reason}
                    </p>
                  ) : null}
                </div>
              ) : missingDomain ? (
                <DeepClearanceSectionSkeleton label="Domain" />
              ) : null}

              {deepClearance?.socials && Object.keys(deepClearance.socials).length > 0 ? (
                <SocialClearanceRows socials={deepClearance.socials} />
              ) : missingSocials ? (
                <DeepClearanceSectionSkeleton label="Socials" />
              ) : null}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Meaning
          </h3>
          <div className="rounded-md border p-3">
            <p>{candidate.meaning?.trim() ? candidate.meaning : '—'}</p>
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Backstory
          </h3>
          <div className="rounded-md border p-3">
            <p>{candidate.backstory?.trim() ? candidate.backstory : '—'}</p>
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Notes
            </h3>
            <p className="text-xs text-muted-foreground">
              {getNotesSaveStatusCopy(patchMutation.isPending, notesSaveState)}
            </p>
          </div>
          <Textarea
            onChange={(event) => {
              setNotesDraft(event.target.value)
              if (notesSaveState !== 'idle') {
                setNotesSaveState('idle')
              }
            }}
            placeholder="Add internal notes..."
            rows={6}
            value={notesDraft}
          />
        </section>
      </div>
    </>
  )
}

export function NameDetailDrawer({
  open,
  onOpenChange,
  candidate,
  runId,
  onToggleShortlisted,
  onToggleSelectedForClearance,
}: NameDetailDrawerProps) {
  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="w-[400px] p-0 sm:max-w-[400px]" side="right">
        <div className="flex h-full flex-col">
          {candidate ? (
            <NameDetailDrawerContent
              candidate={candidate}
              key={candidate.id}
              onToggleSelectedForClearance={onToggleSelectedForClearance}
              onToggleShortlisted={onToggleShortlisted}
              open={open}
              runId={runId}
            />
          ) : (
            <div className="px-4 py-6">
              <p className="text-sm text-muted-foreground">Name details are not available.</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
