import { request } from '@/lib/api/client'
import type {
  AddTerritoryCardRequest,
  AddTerritoryCardResponse,
  ConfirmTerritoryCardsResponse,
  ListTerritoryCardsResponse,
  PatchTerritoryCardRequest,
  ResearchSnapshot,
  ReviseTerritoryCardRequest,
  ReviseTerritoryCardResponse,
  TerritoryCardPatchResponse,
} from '@/lib/api/territoryReview.types'

export async function getResearchSnapshot(runId: string): Promise<ResearchSnapshot> {
  return request<ResearchSnapshot>(`/runs/${encodeURIComponent(runId)}/research-snapshot`, {
    method: 'GET',
  })
}

export async function listTerritoryCards(runId: string): Promise<ListTerritoryCardsResponse> {
  return request<ListTerritoryCardsResponse>(`/runs/${encodeURIComponent(runId)}/territory-cards`, {
    method: 'GET',
  })
}

export async function patchTerritoryCard(
  cardId: string,
  payload: PatchTerritoryCardRequest,
): Promise<TerritoryCardPatchResponse> {
  return request<TerritoryCardPatchResponse, PatchTerritoryCardRequest>(
    `/territory-cards/${encodeURIComponent(cardId)}`,
    {
      method: 'PATCH',
      body: payload,
    },
  )
}

export async function reviseTerritoryCard(
  runId: string,
  payload: ReviseTerritoryCardRequest,
): Promise<ReviseTerritoryCardResponse> {
  return request<ReviseTerritoryCardResponse, ReviseTerritoryCardRequest>(
    `/runs/${encodeURIComponent(runId)}/territory-cards/revise`,
    {
      method: 'POST',
      body: payload,
    },
  )
}

export async function addTerritoryCard(
  runId: string,
  payload: AddTerritoryCardRequest,
): Promise<AddTerritoryCardResponse> {
  return request<AddTerritoryCardResponse, AddTerritoryCardRequest>(
    `/runs/${encodeURIComponent(runId)}/territory-cards/add`,
    {
      method: 'POST',
      body: payload,
    },
  )
}

export async function confirmTerritoryCards(runId: string): Promise<ConfirmTerritoryCardsResponse> {
  return request<ConfirmTerritoryCardsResponse>(
    `/runs/${encodeURIComponent(runId)}/territory-cards/confirm`,
    {
      method: 'POST',
    },
  )
}
