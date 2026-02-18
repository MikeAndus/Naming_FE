import { Card, CardContent } from '@/components/ui/card'
import type { TerritoryCard as TerritoryCardModel, TerritoryCardData } from '@/lib/api'

import { TerritoryCard } from '@/features/territoryReview/components/TerritoryCard'

interface TerritoryCardListProps {
  cards: TerritoryCardModel[]
  isCardPending: (cardId: string) => boolean
  onApprove: (cardId: string) => void
  onReject: (cardId: string) => void
  onRestore: (cardId: string) => void
  onSaveCardData: (cardId: string, cardData: TerritoryCardData) => Promise<boolean>
}

function TerritoryCardList({
  cards,
  isCardPending,
  onApprove,
  onReject,
  onRestore,
  onSaveCardData,
}: TerritoryCardListProps) {
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
        <TerritoryCard
          card={card}
          isPending={isCardPending(card.id)}
          key={card.id}
          onApprove={onApprove}
          onReject={onReject}
          onRestore={onRestore}
          onSaveCardData={onSaveCardData}
        />
      ))}
    </div>
  )
}

export { TerritoryCardList }
