import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Star } from 'lucide-react'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { FastClearanceBadge } from '@/features/names/components/FastClearanceBadge'
import {
  getDeepClearanceBadgeClassName,
  getSocialStatusLabel,
  getSocialsAggregateStatus,
} from '@/features/names/deep-clearance'
import {
  useNameCandidateDetailQuery,
  usePatchNameCandidateMutation,
} from '@/features/names/queries'
import { toast } from '@/hooks/use-toast'
import {
  type ClearanceRagStatus,
  type DomainClearanceDetailStatus,
  getErrorMessage,
  type NameCandidateDeepClearanceDetailResponse,
  type NameCandidateDeepDomainDetailResponse,
  type NameCandidateDeepSocialDetailResponse,
  type NameCandidateDeepSocialPlatformDetailResponse,
  type NameCandidateDeepUSPTOEvidenceRowResponse,
  type NameCandidateDeepTrademarkDetailResponse,
  type NameCandidateDetailResponse,
  type NameCandidateFastClearanceDetailResponse,
  type NameCandidateResponse,
  type NameCandidateScoreCriterionResponse,
  type SocialClearance,
  type SocialClearanceMap,
  type SocialClearanceStatus,
  type TrademarkSimilarMark,
} from '@/lib/api'
import { formatDateTime } from '@/lib/date'
import { cn } from '@/lib/utils'

interface NameDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClose?: () => void
  onReturnFocus?: () => void
  returnFocusRef?: RefObject<HTMLElement | null>
  candidate: NameCandidateResponse | null
  runId: string
  onToggleShortlisted: (candidate: NameCandidateResponse) => void
  onToggleSelectedForClearance: (candidate: NameCandidateResponse) => void
}

type NoteSaveState = 'idle' | 'saving' | 'saved' | 'error'

type ScoreField = 'fit' | 'distinctiveness' | 'whitespace' | 'usability' | 'extendability'

const SCORE_ROWS: Array<{ key: ScoreField; label: string }> = [
  { key: 'fit', label: 'Fit' },
  { key: 'distinctiveness', label: 'Distinctiveness' },
  { key: 'whitespace', label: 'Whitespace' },
  { key: 'usability', label: 'Usability' },
  { key: 'extendability', label: 'Extendability' },
]

function formatFamilyLabel(value: string): string {
  return value.replaceAll('_', ' ')
}

function formatFormatLabel(value: string): string {
  return value.replaceAll('_', ' ')
}

function formatTerritorySourceLabel(detail: NameCandidateDetailResponse): string {
  if (detail.territory_source_hotspot_id) {
    return `Hotspot ${detail.territory_source_hotspot_id}`
  }

  if (detail.territory_card_title && detail.territory_card_title.trim().length > 0) {
    return detail.territory_card_title
  }

  return detail.territory_card_label
}

function getFastClearanceStatusForBadge(
  status: ClearanceRagStatus,
): 'green' | 'amber' | 'red' | 'unknown' {
  if (status === 'G') {
    return 'green'
  }

  if (status === 'A') {
    return 'amber'
  }

  if (status === 'R') {
    return 'red'
  }

  return 'unknown'
}

function formatOptionalDate(value: string | null): string {
  if (!value) {
    return '—'
  }

  return formatDateTime(value)
}

function formatScoreNumber(value: number | null): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—'
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function formatDetailStatus(status: string | null | undefined): string {
  if (!status) {
    return 'Unknown'
  }

  return status.replaceAll('_', ' ')
}

function getNoteSaveStatusCopy(saveState: NoteSaveState): string {
  if (saveState === 'saving') {
    return 'Saving...'
  }

  if (saveState === 'saved') {
    return 'Saved'
  }

  if (saveState === 'error') {
    return 'Failed to save'
  }

  return 'Idle'
}

function normalizeNoteForCompare(value: string): string {
  if (value.trim().length === 0) {
    return ''
  }

  return value
}

function normalizeNoteForPayload(value: string): string | null {
  if (value.trim().length === 0) {
    return null
  }

  return value
}

function toDetailScoreCriterion(raw: unknown): NameCandidateScoreCriterionResponse {
  if (typeof raw !== 'number' || Number.isNaN(raw)) {
    return {
      raw: null,
      weight: 0,
      weighted: null,
    }
  }

  return {
    raw,
    weight: 0,
    weighted: null,
  }
}

function toTrademarkSimilarMarkRow(
  mark: TrademarkSimilarMark,
): NameCandidateDeepUSPTOEvidenceRowResponse {
  return {
    mark_text: mark.mark_name,
    serial_number: mark.serial_number ?? null,
    registration_number: mark.registration_number ?? null,
    classes: mark.class_codes ?? [],
    status: mark.status === 'live' || mark.status === 'dead' || mark.status === 'pending'
      ? mark.status
      : null,
    filing_date: null,
  }
}

function toDetailDeepClearance(
  candidate: NameCandidateResponse,
): NameCandidateDeepClearanceDetailResponse | null {
  const deep = candidate.deep_clearance
  if (!deep) {
    return null
  }

  const trademark: NameCandidateDeepTrademarkDetailResponse | null = deep.trademark
    ? {
        status:
          deep.trademark.status === 'green'
            ? 'G'
            : deep.trademark.status === 'amber'
              ? 'A'
              : deep.trademark.status === 'red'
                ? 'R'
                : deep.trademark.status === 'pending'
                  ? 'Pending'
                  : 'Unknown',
        checked_at: deep.trademark.checked_at,
        reason: deep.trademark.reason ?? null,
        similar_marks: deep.trademark.similar_marks.map(toTrademarkSimilarMarkRow),
      }
    : null

  const domain: NameCandidateDeepDomainDetailResponse | null = deep.domain
    ? {
        tld: '.com',
        status:
          deep.domain.status === 'available'
            ? 'Available'
            : deep.domain.status === 'taken'
              ? 'Taken'
              : deep.domain.status === 'pending'
                ? 'Pending'
                : 'Unknown',
        domain_name: deep.domain.domain_name,
        checked_at: deep.domain.checked_at,
        reason: deep.domain.reason ?? null,
      }
    : null

  const socials: NameCandidateDeepSocialDetailResponse | null = deep.socials
    ? {
        aggregate_status: (() => {
          const aggregate = getSocialsAggregateStatus(deep.socials)
          if (aggregate === 'clear') {
            return 'Clear'
          }
          if (aggregate === 'busy') {
            return 'Busy'
          }
          if (aggregate === 'mixed') {
            return 'Mixed'
          }
          if (aggregate === 'pending') {
            return 'Pending'
          }
          return 'Unknown'
        })(),
        platforms: Object.entries(deep.socials).map(([platform, value]) => ({
          platform,
          status:
            value.status === 'clear'
              ? 'Clear'
              : value.status === 'busy'
                ? 'Busy'
                : value.status === 'mixed'
                  ? 'Mixed'
                  : value.status === 'pending'
                    ? 'Pending'
                    : 'Unknown',
          conflicting_handle: null,
          handle: value.handle,
          checked_at: value.checked_at,
          reason: value.reason ?? null,
        })),
      }
    : null

  if (!trademark && !domain && !socials) {
    return null
  }

  return {
    trademark,
    domain,
    socials,
  }
}

function toInitialDetailCandidate(candidate: NameCandidateResponse): NameCandidateDetailResponse {
  return {
    id: candidate.id,
    run_id: candidate.run_id,
    name_text: candidate.name_text,
    rank: candidate.rank,
    family: candidate.family,
    family_tag: candidate.family,
    format: candidate.format,
    meaning: candidate.meaning,
    backstory: candidate.backstory,
    notes: candidate.notes,
    shortlisted: candidate.shortlisted,
    selected_for_clearance: candidate.selected_for_clearance,
    selected_for_final: candidate.selected_for_final,
    territory_card_id: candidate.territory_card_id,
    territory_card_label: candidate.territory_card_label,
    territory_source_hotspot_id: null,
    territory_card_title: candidate.territory_card_label,
    scores: {
      fit: toDetailScoreCriterion(candidate.scores.fit),
      distinctiveness: toDetailScoreCriterion(candidate.scores.distinctiveness),
      whitespace: toDetailScoreCriterion(candidate.scores.whitespace),
      usability: toDetailScoreCriterion(candidate.scores.usability),
      extendability: toDetailScoreCriterion(candidate.scores.extendability),
      total_weighted:
        typeof candidate.score_total_weighted === 'number' ? candidate.score_total_weighted : null,
    },
    fast_clearance: {
      status: (() => {
        if (candidate.fast_clearance.status === 'green') {
          return 'G'
        }
        if (candidate.fast_clearance.status === 'amber') {
          return 'A'
        }
        if (candidate.fast_clearance.status === 'red') {
          return 'R'
        }
        if (candidate.fast_clearance.status === 'pending') {
          return 'Pending'
        }
        return 'Unknown'
      })(),
      checked_at:
        'checked_at' in candidate.fast_clearance && candidate.fast_clearance.checked_at
          ? candidate.fast_clearance.checked_at
          : null,
      reason:
        'reason' in candidate.fast_clearance ? candidate.fast_clearance.reason ?? null : null,
      hit_count: null,
      details: null,
      raw_response:
        'raw_response' in candidate.fast_clearance
          ? candidate.fast_clearance.raw_response ?? null
          : null,
    },
    deep_clearance: toDetailDeepClearance(candidate),
  }
}

function getSocialBadgeStatus(
  socials: NameCandidateDeepSocialDetailResponse,
): SocialClearanceStatus {
  const socialMap: SocialClearanceMap = socials.platforms.reduce<SocialClearanceMap>(
    (accumulator, platformResult) => {
      let normalizedStatus: SocialClearance['status'] = 'unknown'
      if (platformResult.status === 'Clear') {
        normalizedStatus = 'clear'
      } else if (platformResult.status === 'Busy') {
        normalizedStatus = 'busy'
      } else if (platformResult.status === 'Mixed') {
        normalizedStatus = 'mixed'
      } else if (platformResult.status === 'Pending') {
        normalizedStatus = 'pending'
      }

      accumulator[String(platformResult.platform)] = {
        status: normalizedStatus,
        handle: platformResult.conflicting_handle ?? platformResult.handle ?? '—',
        checked_at: platformResult.checked_at ?? '',
        reason: platformResult.reason ?? undefined,
      }

      return accumulator
    },
    {},
  )

  return getSocialsAggregateStatus(socialMap)
}

function DeepClearanceSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  )
}

function ScoresSection({ detail }: { detail: NameCandidateDetailResponse }) {
  return (
    <div className="space-y-3">
      <div className="rounded-md border">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b bg-muted/30 text-muted-foreground">
              <th className="px-3 py-2 text-left font-medium">Criterion</th>
              <th className="px-3 py-2 text-right font-medium">Raw</th>
              <th className="px-3 py-2 text-right font-medium">Weight</th>
              <th className="px-3 py-2 text-right font-medium">Weighted</th>
            </tr>
          </thead>
          <tbody>
            {SCORE_ROWS.map((row) => {
              const value = detail.scores[row.key]
              return (
                <tr className="border-b last:border-0" key={row.key}>
                  <td className="px-3 py-2 font-medium text-foreground">{row.label}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {formatScoreNumber(value.raw)}
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {formatScoreNumber(value.weight)}
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {formatScoreNumber(value.weighted)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-sm font-medium text-foreground">
        Total weighted score: {formatScoreNumber(detail.scores.total_weighted)}
      </p>
    </div>
  )
}

function FastClearanceSection({
  fastClearance,
}: {
  fastClearance: NameCandidateFastClearanceDetailResponse
}) {
  const badgeStatus = getFastClearanceStatusForBadge(fastClearance.status)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FastClearanceBadge fastClearance={{ status: badgeStatus }} />
        <p className="text-xs text-muted-foreground">Checked: {formatOptionalDate(fastClearance.checked_at)}</p>
      </div>

      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <p>Status code: {fastClearance.status}</p>
        <p>Hit count: {fastClearance.hit_count ?? '—'}</p>
      </div>

      {fastClearance.reason ? (
        <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
          {fastClearance.reason}
        </p>
      ) : null}

      {fastClearance.details ? (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Details</p>
          <pre className="max-h-44 overflow-auto rounded-md bg-muted p-2 text-xs">
            {JSON.stringify(fastClearance.details, null, 2)}
          </pre>
        </div>
      ) : null}

      {fastClearance.raw_response ? (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Raw response</p>
          <pre className="max-h-44 overflow-auto rounded-md bg-muted p-2 text-xs">
            {JSON.stringify(fastClearance.raw_response, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  )
}

function getDetailDomainBadgeClass(status: DomainClearanceDetailStatus): string {
  if (status === 'Available') {
    return getDeepClearanceBadgeClassName('available')
  }

  if (status === 'Taken') {
    return getDeepClearanceBadgeClassName('taken')
  }

  return getDeepClearanceBadgeClassName('unknown')
}

function getDetailTrademarkBadgeClass(status: ClearanceRagStatus): string {
  if (status === 'G') {
    return getDeepClearanceBadgeClassName('green')
  }

  if (status === 'A') {
    return getDeepClearanceBadgeClassName('amber')
  }

  if (status === 'R') {
    return getDeepClearanceBadgeClassName('red')
  }

  return getDeepClearanceBadgeClassName('unknown')
}

function getSocialStatusClass(status: NameCandidateDeepSocialPlatformDetailResponse['status']): string {
  if (status === 'Clear') {
    return getDeepClearanceBadgeClassName('clear')
  }

  if (status === 'Busy') {
    return getDeepClearanceBadgeClassName('busy')
  }

  if (status === 'Mixed') {
    return getDeepClearanceBadgeClassName('mixed')
  }

  return getDeepClearanceBadgeClassName('unknown')
}

function DeepClearanceSection({
  detail,
  isLoading,
}: {
  detail: NameCandidateDetailResponse
  isLoading: boolean
}) {
  if (!detail.selected_for_clearance) {
    return (
      <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        Not selected for deep clearance
      </div>
    )
  }

  if (isLoading && !detail.deep_clearance) {
    return <DeepClearanceSkeleton />
  }

  const deep = detail.deep_clearance

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-md border p-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-medium text-muted-foreground">USPTO Similar Marks</p>
          {deep?.trademark ? (
            <Badge className={getDetailTrademarkBadgeClass(deep.trademark.status)}>
              {formatDetailStatus(deep.trademark.status)}
            </Badge>
          ) : (
            <Badge variant="outline">Unknown</Badge>
          )}
        </div>

        {deep?.trademark?.reason ? (
          <p className="text-xs text-muted-foreground">{deep.trademark.reason}</p>
        ) : null}

        <div className="overflow-auto rounded-md border">
          <table className="min-w-[680px] text-xs">
            <thead>
              <tr className="border-b bg-muted/30 text-muted-foreground">
                <th className="px-2 py-1.5 text-left font-medium">Mark</th>
                <th className="px-2 py-1.5 text-left font-medium">Serial #</th>
                <th className="px-2 py-1.5 text-left font-medium">Registration #</th>
                <th className="px-2 py-1.5 text-left font-medium">Classes</th>
                <th className="px-2 py-1.5 text-left font-medium">Status</th>
                <th className="px-2 py-1.5 text-left font-medium">Filing date</th>
              </tr>
            </thead>
            <tbody>
              {deep?.trademark?.similar_marks.length ? (
                deep.trademark.similar_marks.map((mark, index) => (
                  <tr className="border-b last:border-0" key={`${mark.mark_text}-${index}`}>
                    <td className="px-2 py-1.5 font-medium text-foreground">{mark.mark_text}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{mark.serial_number ?? '—'}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{mark.registration_number ?? '—'}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">
                      {mark.classes.length > 0 ? mark.classes.join(', ') : '—'}
                    </td>
                    <td className="px-2 py-1.5 text-muted-foreground">{mark.status ?? '—'}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">
                      {formatOptionalDate(mark.filing_date)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-2 py-2 text-muted-foreground" colSpan={6}>
                    No similar marks returned
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2 rounded-md border p-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-medium text-muted-foreground">Domain</p>
          {deep?.domain ? (
            <Badge className={getDetailDomainBadgeClass(deep.domain.status)}>{deep.domain.status}</Badge>
          ) : (
            <Badge variant="outline">Unknown</Badge>
          )}
        </div>

        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <p>Domain: {deep?.domain?.domain_name ?? '—'}</p>
          <p>TLD: {deep?.domain?.tld ?? '—'}</p>
          <p>Checked: {formatOptionalDate(deep?.domain?.checked_at ?? null)}</p>
          <p>Reason: {deep?.domain?.reason ?? '—'}</p>
        </div>
      </div>

      <div className="space-y-2 rounded-md border p-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-medium text-muted-foreground">Social</p>
          {deep?.socials ? (
            <Badge className={getDeepClearanceBadgeClassName(getSocialBadgeStatus(deep.socials))}>
              {getSocialStatusLabel(getSocialBadgeStatus(deep.socials))}
            </Badge>
          ) : (
            <Badge variant="outline">Unknown</Badge>
          )}
        </div>

        <div className="space-y-2">
          {deep?.socials?.platforms.length ? (
            deep.socials.platforms.map((platform) => (
              <div className="rounded-md border p-2" key={`${platform.platform}-${platform.status}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-medium text-foreground">{platform.platform}</p>
                  <Badge className={cn('text-[11px]', getSocialStatusClass(platform.status))}>
                    {platform.status}
                  </Badge>
                </div>
                <div className="mt-1 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                  <p>Conflicting handle: {platform.conflicting_handle ?? '—'}</p>
                  <p>Observed handle: {platform.handle ?? '—'}</p>
                  <p>Checked: {formatOptionalDate(platform.checked_at)}</p>
                  <p>Reason: {platform.reason ?? '—'}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No platform evidence returned</p>
          )}
        </div>
      </div>
    </div>
  )
}

function NotesSection({
  detail,
  notesDraft,
  notesSaveState,
  onBlur,
  onChange,
}: {
  detail: NameCandidateDetailResponse
  notesDraft: string
  notesSaveState: NoteSaveState
  onBlur: () => void
  onChange: (next: string) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Saved notes are private to your team.</p>
        <p className="text-xs text-muted-foreground">{getNoteSaveStatusCopy(notesSaveState)}</p>
      </div>
      <Textarea
        onBlur={onBlur}
        onChange={(event) => {
          onChange(event.target.value)
        }}
        placeholder="Add internal notes..."
        rows={8}
        value={notesDraft}
      />
      <p className="text-xs text-muted-foreground">
        Last saved value: {(detail.notes ?? '').trim().length > 0 ? 'Available' : 'Empty'}
      </p>
    </div>
  )
}

function NameDetailDrawerBody({
  detail,
  candidate,
  isDetailLoading,
  detailError,
  onToggleSelectedForClearance,
  onToggleShortlisted,
  notesDraft,
  notesSaveState,
  onNotesBlur,
  onNotesChange,
}: {
  detail: NameCandidateDetailResponse
  candidate: NameCandidateResponse
  isDetailLoading: boolean
  detailError: unknown
  onToggleSelectedForClearance: (candidate: NameCandidateResponse) => void
  onToggleShortlisted: (candidate: NameCandidateResponse) => void
  notesDraft: string
  notesSaveState: NoteSaveState
  onNotesBlur: () => void
  onNotesChange: (next: string) => void
}) {
  const candidateForActions = useMemo<NameCandidateResponse>(
    () => ({
      ...candidate,
      shortlisted: detail.shortlisted,
      selected_for_clearance: detail.selected_for_clearance,
      notes: detail.notes,
    }),
    [candidate, detail.notes, detail.selected_for_clearance, detail.shortlisted],
  )

  return (
    <div className="flex h-full flex-col">
      <SheetHeader className="space-y-3 border-b px-5 py-4 pr-14">
        <div className="space-y-1">
          <SheetTitle className="text-xl leading-tight">{detail.name_text}</SheetTitle>
          <SheetDescription>Name candidate details</SheetDescription>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{formatFamilyLabel(detail.family)}</Badge>
          <Badge variant="outline">{formatFormatLabel(detail.format)}</Badge>
          <Badge variant="outline">{formatTerritorySourceLabel(detail)}</Badge>
          {detail.shortlisted ? <Badge>Shortlisted</Badge> : null}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              onToggleShortlisted(candidateForActions)
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            <Star
              className={cn(
                'h-4 w-4',
                detail.shortlisted
                  ? 'fill-amber-400 text-amber-500'
                  : 'fill-transparent text-muted-foreground',
              )}
            />
            {detail.shortlisted ? 'Shortlisted' : 'Shortlist'}
          </Button>

          <label className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs">
            <Checkbox
              checked={detail.selected_for_clearance}
              onCheckedChange={(checked) => {
                const nextValue = checked === true
                if (nextValue === detail.selected_for_clearance) {
                  return
                }

                onToggleSelectedForClearance(candidateForActions)
              }}
            />
            <span>Selected for clearance</span>
          </label>
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {detailError ? (
          <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
            Couldn&apos;t refresh detail data. Showing cached candidate values. {getErrorMessage(detailError)}
          </div>
        ) : null}

        <Accordion
          className="w-full"
          defaultValue={['meaning', 'scores', 'fast', 'deep', 'notes']}
          type="multiple"
        >
          <AccordionItem value="meaning">
            <AccordionTrigger>Meaning &amp; Story</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Meaning</p>
                  <p className="rounded-md border p-3 text-sm text-foreground">
                    {detail.meaning.trim().length > 0 ? detail.meaning : 'No meaning provided.'}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Backstory</p>
                  <p className="rounded-md border p-3 text-sm text-foreground">
                    {detail.backstory && detail.backstory.trim().length > 0
                      ? detail.backstory
                      : 'No backstory provided.'}
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="scores">
            <AccordionTrigger>Scores</AccordionTrigger>
            <AccordionContent>
              <ScoresSection detail={detail} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="fast">
            <AccordionTrigger>Fast Clearance</AccordionTrigger>
            <AccordionContent>
              <FastClearanceSection fastClearance={detail.fast_clearance} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="deep">
            <AccordionTrigger>Deep Clearance Evidence</AccordionTrigger>
            <AccordionContent>
              <DeepClearanceSection detail={detail} isLoading={isDetailLoading} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="notes">
            <AccordionTrigger>Notes</AccordionTrigger>
            <AccordionContent>
              <NotesSection
                detail={detail}
                notesDraft={notesDraft}
                notesSaveState={notesSaveState}
                onBlur={onNotesBlur}
                onChange={onNotesChange}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  )
}

export function NameDetailDrawer({
  open,
  onOpenChange,
  onClose,
  onReturnFocus,
  returnFocusRef,
  candidate,
  runId,
  onToggleShortlisted,
  onToggleSelectedForClearance,
}: NameDetailDrawerProps) {
  const initialDetail = useMemo(
    () => (candidate ? toInitialDetailCandidate(candidate) : undefined),
    [candidate],
  )
  const detailQuery = useNameCandidateDetailQuery(candidate?.id, {
    enabled: open && Boolean(candidate?.id),
    initialData: initialDetail,
    initialDataUpdatedAt: 0,
    staleTime: 60_000,
    refetchOnMount: false,
  })

  const detail = detailQuery.data

  const handleSheetOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)

    if (open && !nextOpen) {
      onClose?.()
    }
  }

  const handleReturnFocus = () => {
    if (onReturnFocus) {
      onReturnFocus()
      return
    }

    returnFocusRef?.current?.focus()
  }

  return (
    <Sheet onOpenChange={handleSheetOpenChange} open={open}>
      <SheetContent
        className="w-[min(92vw,480px)] p-0 sm:max-w-[480px]"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          handleReturnFocus()
        }}
        side="right"
      >
        {candidate && detail ? (
          <NameDetailDrawerContent
            candidate={candidate}
            detail={detail}
            detailError={detailQuery.error}
            isDetailLoading={detailQuery.isFetching}
            onToggleSelectedForClearance={onToggleSelectedForClearance}
            onToggleShortlisted={onToggleShortlisted}
            runId={runId}
            key={detail.id}
          />
        ) : (
          <div className="px-5 py-6">
            <p className="text-sm text-muted-foreground">Name details are not available.</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function NameDetailDrawerContent({
  detail,
  candidate,
  isDetailLoading,
  detailError,
  onToggleSelectedForClearance,
  onToggleShortlisted,
  runId,
}: {
  detail: NameCandidateDetailResponse
  candidate: NameCandidateResponse
  isDetailLoading: boolean
  detailError: unknown
  onToggleSelectedForClearance: (candidate: NameCandidateResponse) => void
  onToggleShortlisted: (candidate: NameCandidateResponse) => void
  runId: string
}) {
  const notesMutation = usePatchNameCandidateMutation()
  const [notesDraft, setNotesDraft] = useState(detail.notes ?? '')
  const [notesSaveState, setNotesSaveState] = useState<NoteSaveState>('idle')
  const queuedNotesRef = useRef<string | null>(null)
  const saveNotesDraftRef = useRef<(draft: string) => void>(() => {})
  const notesDraftRef = useRef(notesDraft)
  const saveStateTimerRef = useRef<number | null>(null)
  const autosaveTimerRef = useRef<number | null>(null)
  const lastSyncedNotesRef = useRef(detail.notes ?? '')

  const clearStatusTimer = () => {
    if (saveStateTimerRef.current !== null) {
      window.clearTimeout(saveStateTimerRef.current)
      saveStateTimerRef.current = null
    }
  }

  const clearAutosaveTimer = () => {
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current)
      }
      if (saveStateTimerRef.current !== null) {
        window.clearTimeout(saveStateTimerRef.current)
      }
    }
  }, [])

  const saveNotesDraft = useCallback(
    (draft: string) => {
      if (notesMutation.isPending) {
        queuedNotesRef.current = draft
        return
      }

      if (
        normalizeNoteForCompare(draft) ===
        normalizeNoteForCompare(lastSyncedNotesRef.current)
      ) {
        return
      }

      setNotesSaveState('saving')
      const submittedDraft = draft

      notesMutation.mutate(
        {
          nameId: detail.id,
          runId,
          patch: {
            notes: normalizeNoteForPayload(submittedDraft),
          },
        },
        {
          onSuccess: (response) => {
            const normalizedServerNotes = response.notes ?? ''
            lastSyncedNotesRef.current = normalizedServerNotes

            if (
              normalizeNoteForCompare(notesDraftRef.current) ===
              normalizeNoteForCompare(submittedDraft)
            ) {
              notesDraftRef.current = normalizedServerNotes
              setNotesDraft(normalizedServerNotes)
            }

            clearStatusTimer()
            setNotesSaveState('saved')
            saveStateTimerRef.current = window.setTimeout(() => {
              setNotesSaveState((current) => (current === 'saved' ? 'idle' : current))
            }, 1200)
          },
          onError: (error) => {
            setNotesSaveState('error')
            toast({
              variant: 'destructive',
              title: 'Failed to save notes',
              description: getErrorMessage(error, 'Please try again.'),
            })
          },
          onSettled: () => {
            if (queuedNotesRef.current === null) {
              return
            }

            const queuedDraft = queuedNotesRef.current
            queuedNotesRef.current = null
            saveNotesDraftRef.current(queuedDraft)
          },
        },
      )
    },
    [detail.id, notesMutation, runId],
  )

  useEffect(() => {
    saveNotesDraftRef.current = saveNotesDraft
  }, [saveNotesDraft])

  const scheduleAutosave = useCallback(
    (draft: string) => {
      clearAutosaveTimer()
      autosaveTimerRef.current = window.setTimeout(() => {
        saveNotesDraft(draft)
      }, 1500)
    },
    [saveNotesDraft],
  )

  return (
    <NameDetailDrawerBody
      candidate={candidate}
      detail={detail}
      detailError={detailError}
      isDetailLoading={isDetailLoading}
      notesDraft={notesDraft}
      notesSaveState={notesSaveState}
      onNotesBlur={() => {
        clearAutosaveTimer()
        saveNotesDraft(notesDraftRef.current)
      }}
      onNotesChange={(nextValue) => {
        notesDraftRef.current = nextValue
        setNotesDraft(nextValue)
        if (notesSaveState !== 'idle') {
          setNotesSaveState('idle')
        }
        scheduleAutosave(nextValue)
      }}
      onToggleSelectedForClearance={onToggleSelectedForClearance}
      onToggleShortlisted={onToggleShortlisted}
    />
  )
}
