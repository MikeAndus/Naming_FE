import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import {
  type TerritoryCard as TerritoryCardModel,
  type TerritoryCardData,
  type ToneFingerprint,
} from '@/lib/api'
import { cn } from '@/lib/utils'

import { TerritoryCardStatusBadge } from '@/features/territoryReview/components/TerritoryCardStatusBadge'

interface TerritoryCardProps {
  card: TerritoryCardModel
  isPending: boolean
  isRevising: boolean
  onApprove: (cardId: string) => void
  onReject: (cardId: string) => void
  onRestore: (cardId: string) => void
  onSaveCardData: (cardId: string, cardData: TerritoryCardData) => Promise<boolean>
  onReviseCard: (cardId: string, revisionPrompt: string) => Promise<boolean>
}

type ToneSliderValue = TerritoryCardData['tone_fingerprint']['playful']

interface TerritoryCardEditDraft {
  metaphorFieldsText: string
  imageryNounsText: string
  actionVerbsText: string
  avoidListText: string
  namingStyleRulesText: string
  toneFingerprint: ToneFingerprint
}

function getSourceLabel(card: TerritoryCardModel): string {
  if (card.source_hotspot_id === null) {
    return 'User-added'
  }

  return `Hotspot: ${card.source_hotspot_id}`
}

function renderChips(values: string[], emptyText: string) {
  if (values.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyText}</p>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value, index) => (
        <span
          className="rounded-full border bg-muted/20 px-2 py-0.5 text-xs leading-5"
          key={`${value}-${index}`}
        >
          {value}
        </span>
      ))}
    </div>
  )
}

function ToneScaleRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <span className="text-xs font-medium">{value}/5</span>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <span
            className={cn(
              'h-1.5 rounded-sm',
              index < value ? 'bg-foreground/80' : 'bg-muted',
            )}
            key={`${label}-${index}`}
          />
        ))}
      </div>
    </div>
  )
}

function splitDraftLines(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function joinDraftLines(values: string[]): string {
  return values.join('\n')
}

function toDraft(cardData: TerritoryCardData): TerritoryCardEditDraft {
  return {
    metaphorFieldsText: joinDraftLines(cardData.metaphor_fields),
    imageryNounsText: joinDraftLines(cardData.imagery_nouns),
    actionVerbsText: joinDraftLines(cardData.action_verbs),
    avoidListText: joinDraftLines(cardData.avoid_list),
    namingStyleRulesText: joinDraftLines(cardData.naming_style_rules),
    toneFingerprint: {
      playful: cardData.tone_fingerprint.playful,
      modern: cardData.tone_fingerprint.modern,
      premium: cardData.tone_fingerprint.premium,
      bold: cardData.tone_fingerprint.bold,
    },
  }
}

function clampSliderValue(value: number): ToneSliderValue {
  if (value <= 1) {
    return 1
  }
  if (value >= 5) {
    return 5
  }

  return Math.round(value) as ToneSliderValue
}

function toCardDataDraft(draft: TerritoryCardEditDraft): TerritoryCardData {
  return {
    metaphor_fields: splitDraftLines(draft.metaphorFieldsText),
    imagery_nouns: splitDraftLines(draft.imageryNounsText),
    action_verbs: splitDraftLines(draft.actionVerbsText),
    tone_fingerprint: {
      playful: clampSliderValue(draft.toneFingerprint.playful),
      modern: clampSliderValue(draft.toneFingerprint.modern),
      premium: clampSliderValue(draft.toneFingerprint.premium),
      bold: clampSliderValue(draft.toneFingerprint.bold),
    },
    avoid_list: splitDraftLines(draft.avoidListText),
    naming_style_rules: splitDraftLines(draft.namingStyleRulesText),
  }
}

function arrayEquals(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false
  }

  return a.every((item, index) => item === b[index])
}

function isToneFingerprintEqual(a: ToneFingerprint, b: ToneFingerprint): boolean {
  return (
    a.playful === b.playful &&
    a.modern === b.modern &&
    a.premium === b.premium &&
    a.bold === b.bold
  )
}

function isCardDataEqual(a: TerritoryCardData, b: TerritoryCardData): boolean {
  return (
    arrayEquals(a.metaphor_fields, b.metaphor_fields) &&
    arrayEquals(a.imagery_nouns, b.imagery_nouns) &&
    arrayEquals(a.action_verbs, b.action_verbs) &&
    isToneFingerprintEqual(a.tone_fingerprint, b.tone_fingerprint) &&
    arrayEquals(a.avoid_list, b.avoid_list) &&
    arrayEquals(a.naming_style_rules, b.naming_style_rules)
  )
}

function ToneSliderField({
  disabled,
  label,
  onChange,
  value,
}: {
  disabled: boolean
  label: string
  onChange: (value: ToneSliderValue) => void
  value: ToneSliderValue
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <span className="text-xs font-medium">{value}/5</span>
      </div>
      <Slider
        disabled={disabled}
        max={5}
        min={1}
        onValueChange={(next) => {
          const nextValue = next[0]
          if (typeof nextValue === 'number') {
            onChange(clampSliderValue(nextValue))
          }
        }}
        step={1}
        value={[value]}
      />
    </div>
  )
}

function DraftListField({
  disabled,
  label,
  onChange,
  value,
}: {
  disabled: boolean
  label: string
  onChange: (value: string) => void
  value: string
}) {
  return (
    <section className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <Textarea
        className="min-h-[84px] text-xs"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder="One item per line"
        value={value}
      />
      <p className="text-[11px] text-muted-foreground">One item per line.</p>
    </section>
  )
}

function TerritoryCard({
  card,
  isPending,
  isRevising,
  onApprove,
  onReject,
  onRestore,
  onSaveCardData,
  onReviseCard,
}: TerritoryCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState<TerritoryCardEditDraft>(() => toDraft(card.card_data))
  const [isReviseDialogOpen, setIsReviseDialogOpen] = useState(false)
  const [revisionPrompt, setRevisionPrompt] = useState(card.revision_prompt ?? '')

  const isRejected = card.status === 'rejected'
  const isBusy = isPending || isRevising
  const nextCardData = useMemo(() => toCardDataDraft(draft), [draft])
  const isDraftDirty = useMemo(
    () => !isCardDataEqual(nextCardData, card.card_data),
    [card.card_data, nextCardData],
  )

  const handleCancelEdit = () => {
    setDraft(toDraft(card.card_data))
    setIsEditing(false)
  }

  const handleStartEdit = () => {
    setDraft(toDraft(card.card_data))
    setIsEditing(true)
  }

  const handleSaveEdit = async () => {
    const wasSaved = await onSaveCardData(card.id, nextCardData)
    if (wasSaved) {
      setIsEditing(false)
    }
  }

  const handleSubmitRevise = async () => {
    const trimmedPrompt = revisionPrompt.trim()
    if (!trimmedPrompt) {
      return
    }

    const wasSaved = await onReviseCard(card.id, trimmedPrompt)
    if (wasSaved) {
      setRevisionPrompt('')
      setIsReviseDialogOpen(false)
    }
  }

  return (
    <>
      <Card
        className={cn(
          'relative overflow-hidden border-muted',
          isRejected && !isEditing && 'bg-muted/30 text-muted-foreground opacity-80',
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">{getSourceLabel(card)}</CardTitle>
              <CardDescription className="text-xs">
                card id: <code>{card.id.slice(0, 8)}</code>
              </CardDescription>
            </div>
            <TerritoryCardStatusBadge status={card.status} />
          </div>
        </CardHeader>

        <CardContent className="space-y-4 text-sm">
          {!isEditing ? (
            <>
              <section className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Metaphor Fields
                </p>
                {renderChips(card.card_data.metaphor_fields, 'None')}
              </section>

              <section className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Imagery Nouns
                </p>
                {renderChips(card.card_data.imagery_nouns, 'None')}
              </section>

              <section className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Action Verbs
                </p>
                {renderChips(card.card_data.action_verbs, 'None')}
              </section>

              <section className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tone Fingerprint
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <ToneScaleRow label="Playful" value={card.card_data.tone_fingerprint.playful} />
                  <ToneScaleRow label="Modern" value={card.card_data.tone_fingerprint.modern} />
                  <ToneScaleRow label="Premium" value={card.card_data.tone_fingerprint.premium} />
                  <ToneScaleRow label="Bold" value={card.card_data.tone_fingerprint.bold} />
                </div>
              </section>

              <section className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Avoid List
                </p>
                {renderChips(card.card_data.avoid_list, 'None')}
              </section>

              <section className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Naming Style Rules
                </p>
                {card.card_data.naming_style_rules.length === 0 ? (
                  <p className="text-xs text-muted-foreground">None</p>
                ) : (
                  <ul className="list-disc space-y-1 pl-5 text-xs">
                    {card.card_data.naming_style_rules.map((rule, index) => (
                      <li key={`${rule}-${index}`}>{rule}</li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          ) : (
            <>
              <DraftListField
                disabled={isBusy}
                label="Metaphor Fields"
                onChange={(value) =>
                  setDraft((current) => ({ ...current, metaphorFieldsText: value }))
                }
                value={draft.metaphorFieldsText}
              />

              <DraftListField
                disabled={isBusy}
                label="Imagery Nouns"
                onChange={(value) => setDraft((current) => ({ ...current, imageryNounsText: value }))}
                value={draft.imageryNounsText}
              />

              <DraftListField
                disabled={isBusy}
                label="Action Verbs"
                onChange={(value) => setDraft((current) => ({ ...current, actionVerbsText: value }))}
                value={draft.actionVerbsText}
              />

              <section className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tone Fingerprint
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ToneSliderField
                    disabled={isBusy}
                    label="Playful"
                    onChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        toneFingerprint: { ...current.toneFingerprint, playful: value },
                      }))
                    }
                    value={draft.toneFingerprint.playful}
                  />
                  <ToneSliderField
                    disabled={isBusy}
                    label="Modern"
                    onChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        toneFingerprint: { ...current.toneFingerprint, modern: value },
                      }))
                    }
                    value={draft.toneFingerprint.modern}
                  />
                  <ToneSliderField
                    disabled={isBusy}
                    label="Premium"
                    onChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        toneFingerprint: { ...current.toneFingerprint, premium: value },
                      }))
                    }
                    value={draft.toneFingerprint.premium}
                  />
                  <ToneSliderField
                    disabled={isBusy}
                    label="Bold"
                    onChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        toneFingerprint: { ...current.toneFingerprint, bold: value },
                      }))
                    }
                    value={draft.toneFingerprint.bold}
                  />
                </div>
              </section>

              <DraftListField
                disabled={isBusy}
                label="Avoid List"
                onChange={(value) => setDraft((current) => ({ ...current, avoidListText: value }))}
                value={draft.avoidListText}
              />

              <DraftListField
                disabled={isBusy}
                label="Naming Style Rules"
                onChange={(value) =>
                  setDraft((current) => ({ ...current, namingStyleRulesText: value }))
                }
                value={draft.namingStyleRulesText}
              />
            </>
          )}
        </CardContent>

        <CardFooter className="flex flex-wrap gap-2 border-t pt-4">
          {!isEditing ? (
            <>
              {card.status === 'pending' ? (
                <>
                  <Button
                    disabled={isBusy}
                    onClick={() => onApprove(card.id)}
                    size="sm"
                    type="button"
                  >
                    {isBusy ? 'Saving...' : 'Approve'}
                  </Button>
                  <Button
                    disabled={isBusy}
                    onClick={() => onReject(card.id)}
                    size="sm"
                    type="button"
                    variant="destructive"
                  >
                    {isBusy ? 'Saving...' : 'Reject'}
                  </Button>
                </>
              ) : null}

              {card.status === 'approved' ? (
                <Button
                  disabled={isBusy}
                  onClick={() => onReject(card.id)}
                  size="sm"
                  type="button"
                  variant="destructive"
                >
                  {isBusy ? 'Saving...' : 'Reject'}
                </Button>
              ) : null}

              {card.status === 'rejected' ? (
                <Button
                  disabled={isBusy}
                  onClick={() => onRestore(card.id)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {isBusy ? 'Saving...' : 'Restore'}
                </Button>
              ) : null}

              <Button
                disabled={isBusy}
                onClick={handleStartEdit}
                size="sm"
                type="button"
                variant="secondary"
              >
                Edit
              </Button>
              <Button
                disabled={isBusy}
                onClick={() => setIsReviseDialogOpen(true)}
                size="sm"
                type="button"
                variant="outline"
              >
                Prompt to Revise
              </Button>
            </>
          ) : (
            <>
              <Button
                disabled={isBusy || !isDraftDirty}
                onClick={() => {
                  void handleSaveEdit()
                }}
                size="sm"
                type="button"
              >
                {isBusy ? 'Saving...' : 'Save'}
              </Button>
              <Button
                disabled={isBusy}
                onClick={handleCancelEdit}
                size="sm"
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
            </>
          )}
        </CardFooter>

        {isRevising ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70 backdrop-blur-[1px]">
            <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm shadow">
              <Loader2 className="h-4 w-4 animate-spin" />
              Revising territory card...
            </div>
          </div>
        ) : null}
      </Card>

      <Dialog
        onOpenChange={(nextOpen) => {
          if (!isRevising) {
            setIsReviseDialogOpen(nextOpen)
          }
        }}
        open={isReviseDialogOpen}
      >
        <DialogContent
          onEscapeKeyDown={(event) => {
            if (isRevising) {
              event.preventDefault()
            }
          }}
          onPointerDownOutside={(event) => {
            if (isRevising) {
              event.preventDefault()
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Prompt to Revise</DialogTitle>
            <DialogDescription>
              Describe how this territory card should be revised.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              className="min-h-[140px]"
              disabled={isRevising}
              onChange={(event) => setRevisionPrompt(event.target.value)}
              placeholder="Example: Keep the tone premium and modern, but replace crowded fintech metaphors."
              value={revisionPrompt}
            />
          </div>
          <DialogFooter>
            <Button
              disabled={isRevising}
              onClick={() => setIsReviseDialogOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isRevising || revisionPrompt.trim().length === 0}
              onClick={() => {
                void handleSubmitRevise()
              }}
              type="button"
            >
              {isRevising ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Revising...
                </>
              ) : (
                'Generate Revision'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export { TerritoryCard }
