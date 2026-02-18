export type ToneSliderValue = 1 | 2 | 3 | 4 | 5

export type TerritoryCardReviewStatus = 'pending' | 'approved' | 'rejected'

export interface ToneFingerprint {
  playful: ToneSliderValue
  modern: ToneSliderValue
  premium: ToneSliderValue
  bold: ToneSliderValue
}

export interface TerritoryCardData {
  metaphor_fields: string[]
  imagery_nouns: string[]
  action_verbs: string[]
  tone_fingerprint: ToneFingerprint
  avoid_list: string[]
  naming_style_rules: string[]
}

export interface TerritoryCard {
  id: string
  source_hotspot_id: string | null
  status: TerritoryCardReviewStatus
  card_data: TerritoryCardData
  is_human_override: boolean
  revision_prompt: string | null
}

export interface ResearchSnapshotCompetitiveCluster {
  cluster_name: string
  examples: string[]
  pattern_notes: string | null
}

export interface ResearchSnapshotDominantPatterns {
  prefixes: string[]
  suffixes: string[]
  constructions: string[]
}

export interface ResearchSnapshotWhitespaceHypothesis {
  hypothesis: string
  rationale: string
  risk: string | null
}

export interface ResearchSnapshot {
  competitive_clusters: ResearchSnapshotCompetitiveCluster[]
  avoid_list: string[]
  dominant_patterns: ResearchSnapshotDominantPatterns
  whitespace_hypotheses: ResearchSnapshotWhitespaceHypothesis[]
}

export type ListTerritoryCardsResponse = TerritoryCard[]

export type PatchTerritoryCardRequest =
  | {
      status: TerritoryCardReviewStatus
      card_data?: TerritoryCardData
    }
  | {
      status?: TerritoryCardReviewStatus
      card_data: TerritoryCardData
    }

export interface TerritoryCardPatchResponse {
  id: string
  status: TerritoryCardReviewStatus
  card_data: TerritoryCardData
  is_human_override: boolean
}

export interface ReviseTerritoryCardRequest {
  card_id: string
  revision_prompt: string
}

export type ReviseTerritoryCardResponse = TerritoryCardPatchResponse

export interface AddTerritoryCardRequest {
  prompt: string
}

export type AddTerritoryCardResponse = TerritoryCardPatchResponse

export interface ConfirmTerritoryCardsResponse {
  approved_count: number
}
