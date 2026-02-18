import type { TerritoryCard } from '@/lib/api'

export function getTerritoryCardSourceLabel(card: TerritoryCard): string {
  if (card.source_hotspot_id === null) {
    return 'User-added'
  }

  return `Hotspot: ${card.source_hotspot_id}`
}
