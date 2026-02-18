import { AnimatePresence, motion } from 'framer-motion'

import { Card, CardContent } from '@/components/ui/card'
import type { TerritoryCard as TerritoryCardModel, TerritoryCardData } from '@/lib/api'

import { TerritoryCard } from '@/features/territoryReview/components/TerritoryCard'

interface TerritoryCardListProps {
  cards: TerritoryCardModel[]
  isCardPending: (cardId: string) => boolean
  isCardRevising: (cardId: string) => boolean
  onApprove: (cardId: string) => void
  onReject: (cardId: string) => void
  onRestore: (cardId: string) => void
  onSaveCardData: (cardId: string, cardData: TerritoryCardData) => Promise<boolean>
  onReviseCard: (cardId: string, revisionPrompt: string) => Promise<boolean>
}

function TerritoryCardList({
  cards,
  isCardPending,
  isCardRevising,
  onApprove,
  onReject,
  onRestore,
  onSaveCardData,
  onReviseCard,
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
      <AnimatePresence initial={false}>
        {cards.map((card) => (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 12 }}
            key={card.id}
            layout
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <TerritoryCard
              card={card}
              isPending={isCardPending(card.id)}
              isRevising={isCardRevising(card.id)}
              onApprove={onApprove}
              onReject={onReject}
              onRestore={onRestore}
              onReviseCard={onReviseCard}
              onSaveCardData={onSaveCardData}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export { TerritoryCardList }
