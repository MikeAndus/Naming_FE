import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { TerritoryCard as TerritoryCardModel } from '@/lib/api'

import { TerritoryCardStatusBadge } from '@/features/territoryReview/components/TerritoryCardStatusBadge'

interface TerritoryCardProps {
  card: TerritoryCardModel
  isPending: boolean
  onApprove: (cardId: string) => void
  onReject: (cardId: string) => void
  onRestore: (cardId: string) => void
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

function TerritoryCard({
  card,
  isPending,
  onApprove,
  onReject,
  onRestore,
}: TerritoryCardProps) {
  const isRejected = card.status === 'rejected'

  return (
    <Card
      className={cn(
        'border-muted',
        isRejected && 'bg-muted/30 text-muted-foreground opacity-80',
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
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2 border-t pt-4">
        {card.status === 'pending' ? (
          <>
            <Button
              disabled={isPending}
              onClick={() => onApprove(card.id)}
              size="sm"
              type="button"
            >
              {isPending ? 'Saving...' : 'Approve'}
            </Button>
            <Button
              disabled={isPending}
              onClick={() => onReject(card.id)}
              size="sm"
              type="button"
              variant="destructive"
            >
              {isPending ? 'Saving...' : 'Reject'}
            </Button>
          </>
        ) : null}

        {card.status === 'approved' ? (
          <Button
            disabled={isPending}
            onClick={() => onReject(card.id)}
            size="sm"
            type="button"
            variant="destructive"
          >
            {isPending ? 'Saving...' : 'Reject'}
          </Button>
        ) : null}

        {card.status === 'rejected' ? (
          <Button
            disabled={isPending}
            onClick={() => onRestore(card.id)}
            size="sm"
            type="button"
            variant="outline"
          >
            {isPending ? 'Saving...' : 'Restore'}
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  )
}

export { TerritoryCard }
