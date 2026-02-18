import { useMemo } from 'react'
import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {
  addTerritoryCard,
  confirmTerritoryCards,
  getResearchSnapshot,
  listTerritoryCards,
  patchTerritoryCard,
  reviseTerritoryCard,
  type AddTerritoryCardResponse,
  type ConfirmTerritoryCardsResponse,
  type ListTerritoryCardsResponse,
  type PatchTerritoryCardRequest,
  type ReviseTerritoryCardResponse,
  type ResearchSnapshot,
  type TerritoryCard,
  type TerritoryCardData,
  type TerritoryCardPatchResponse,
  type TerritoryCardReviewStatus,
} from '@/lib/api'

export const territoryReviewResearchSnapshotQueryKey = (runId: string) =>
  ['territory-review', 'research-snapshot', runId] as const

export const territoryReviewCardsQueryKey = (runId: string) =>
  ['territory-review', 'cards', runId] as const

const territoryReviewPatchMutationKey = (runId: string) =>
  ['territory-review', 'patch-card', runId] as const

const territoryReviewReviseMutationKey = (runId: string) =>
  ['territory-review', 'revise-card', runId] as const

function requireRunId(runId: string | undefined): string {
  if (!runId) {
    throw new Error('runId is required for territory review mutation')
  }

  return runId
}

function applyPatchToCard(card: TerritoryCard, patch: PatchTerritoryCardRequest): TerritoryCard {
  const statusFromPatch =
    patch.card_data !== undefined ? (patch.status ?? 'approved') : patch.status

  return {
    ...card,
    ...(statusFromPatch !== undefined ? { status: statusFromPatch } : {}),
    ...(patch.card_data !== undefined
      ? {
          card_data: patch.card_data,
          is_human_override: true,
        }
      : {}),
  }
}

function mergePatchResponseIntoCard(
  card: TerritoryCard,
  response: TerritoryCardPatchResponse,
): TerritoryCard {
  return {
    ...card,
    status: response.status,
    card_data: response.card_data,
    is_human_override: response.is_human_override,
  }
}

export function useResearchSnapshot(runId: string | undefined) {
  return useQuery<ResearchSnapshot>({
    queryKey: runId
      ? territoryReviewResearchSnapshotQueryKey(runId)
      : ['territory-review', 'research-snapshot', 'missing-run-id'],
    queryFn: () => getResearchSnapshot(runId as string),
    enabled: Boolean(runId),
    meta: {
      suppressGlobalErrorToast: true,
    },
  })
}

export function useTerritoryCards(runId: string | undefined) {
  return useQuery<ListTerritoryCardsResponse>({
    queryKey: runId
      ? territoryReviewCardsQueryKey(runId)
      : ['territory-review', 'cards', 'missing-run-id'],
    queryFn: () => listTerritoryCards(runId as string),
    enabled: Boolean(runId),
    meta: {
      suppressGlobalErrorToast: true,
    },
  })
}

export interface PatchTerritoryCardVariables {
  cardId: string
  patch: PatchTerritoryCardRequest
}

interface PatchTerritoryCardMutationContext {
  previousCards?: ListTerritoryCardsResponse
}

export function usePatchTerritoryCardMutation(runId: string | undefined) {
  const queryClient = useQueryClient()
  const scopedRunId = runId ?? 'missing-run-id'
  const mutationKey = territoryReviewPatchMutationKey(scopedRunId)

  const mutation = useMutation<
    TerritoryCardPatchResponse,
    unknown,
    PatchTerritoryCardVariables,
    PatchTerritoryCardMutationContext
  >({
    mutationKey,
    mutationFn: ({ cardId, patch }) => patchTerritoryCard(cardId, patch),
    meta: {
      suppressGlobalErrorToast: true,
    },
    onMutate: async (variables) => {
      if (!runId) {
        return {}
      }

      const listQueryKey = territoryReviewCardsQueryKey(runId)
      await queryClient.cancelQueries({
        queryKey: listQueryKey,
        exact: true,
      })

      const previousCards = queryClient.getQueryData<ListTerritoryCardsResponse>(listQueryKey)

      queryClient.setQueryData<ListTerritoryCardsResponse>(listQueryKey, (current) => {
        if (!current) {
          return current
        }

        return current.map((card) =>
          card.id === variables.cardId ? applyPatchToCard(card, variables.patch) : card,
        )
      })

      return { previousCards }
    },
    onError: (_error, _variables, context) => {
      if (!runId || !context?.previousCards) {
        return
      }

      queryClient.setQueryData(territoryReviewCardsQueryKey(runId), context.previousCards)
    },
    onSuccess: (response) => {
      if (!runId) {
        return
      }

      queryClient.setQueryData<ListTerritoryCardsResponse>(
        territoryReviewCardsQueryKey(runId),
        (current) => {
          if (!current) {
            return current
          }

          return current.map((card) =>
            card.id === response.id ? mergePatchResponseIntoCard(card, response) : card,
          )
        },
      )
    },
    onSettled: () => {
      if (!runId) {
        return
      }

      void queryClient.invalidateQueries({
        queryKey: territoryReviewCardsQueryKey(runId),
        exact: true,
      })
    },
  })

  const pendingCardIds = useMutationState<string | undefined>({
    filters: {
      mutationKey,
      status: 'pending',
    },
    select: (state) => {
      const variables = state.state.variables as PatchTerritoryCardVariables | undefined
      return variables?.cardId
    },
  })
  const pendingCardIdSet = useMemo(
    () =>
      new Set(
        pendingCardIds.filter((cardId): cardId is string => typeof cardId === 'string'),
      ),
    [pendingCardIds],
  )

  return {
    ...mutation,
    isCardPending: (cardId: string) => pendingCardIdSet.has(cardId),
  }
}

export function usePatchTerritoryCardStatusMutation(runId: string | undefined) {
  const patchMutation = usePatchTerritoryCardMutation(runId)

  return {
    ...patchMutation,
    mutateStatus: (
      cardId: string,
      status: TerritoryCardReviewStatus,
      options?: Parameters<typeof patchMutation.mutate>[1],
    ) =>
      patchMutation.mutate(
        {
          cardId,
          patch: { status },
        },
        options,
      ),
    mutateCardData: (
      cardId: string,
      cardData: TerritoryCardData,
      options?: Parameters<typeof patchMutation.mutate>[1],
    ) =>
      patchMutation.mutate(
        {
          cardId,
          patch: { card_data: cardData },
        },
        options,
      ),
  }
}

export interface ReviseTerritoryCardVariables {
  cardId: string
  revisionPrompt: string
}

export function useReviseTerritoryCardMutation(runId: string | undefined) {
  const queryClient = useQueryClient()
  const scopedRunId = runId ?? 'missing-run-id'
  const mutationKey = territoryReviewReviseMutationKey(scopedRunId)

  const mutation = useMutation<
    ReviseTerritoryCardResponse,
    unknown,
    ReviseTerritoryCardVariables
  >({
    mutationKey,
    mutationFn: ({ cardId, revisionPrompt }) =>
      reviseTerritoryCard(requireRunId(runId), {
        card_id: cardId,
        revision_prompt: revisionPrompt,
      }),
    meta: {
      suppressGlobalErrorToast: true,
    },
    onSuccess: (response) => {
      if (!runId) {
        return
      }

      queryClient.setQueryData<ListTerritoryCardsResponse>(
        territoryReviewCardsQueryKey(runId),
        (current) => {
          if (!current) {
            return current
          }

          return current.map((card) =>
            card.id === response.id ? mergePatchResponseIntoCard(card, response) : card,
          )
        },
      )

      void queryClient.invalidateQueries({
        queryKey: territoryReviewCardsQueryKey(runId),
        exact: true,
      })
    },
  })

  const pendingCardIds = useMutationState<string | undefined>({
    filters: {
      mutationKey,
      status: 'pending',
    },
    select: (state) => {
      const variables = state.state.variables as ReviseTerritoryCardVariables | undefined
      return variables?.cardId
    },
  })
  const pendingCardIdSet = useMemo(
    () =>
      new Set(
        pendingCardIds.filter((cardId): cardId is string => typeof cardId === 'string'),
      ),
    [pendingCardIds],
  )

  return {
    ...mutation,
    isCardPending: (cardId: string) => pendingCardIdSet.has(cardId),
  }
}

export interface AddTerritoryCardVariables {
  prompt: string
}

export function useAddTerritoryCardMutation(runId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<AddTerritoryCardResponse, unknown, AddTerritoryCardVariables>({
    mutationFn: ({ prompt }) =>
      addTerritoryCard(requireRunId(runId), {
        prompt,
      }),
    meta: {
      suppressGlobalErrorToast: true,
    },
    onSuccess: () => {
      if (!runId) {
        return
      }

      void queryClient.invalidateQueries({
        queryKey: territoryReviewCardsQueryKey(runId),
        exact: true,
      })
    },
  })
}

export function useConfirmTerritoryCardsMutation(runId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<ConfirmTerritoryCardsResponse, unknown, void>({
    mutationFn: () => confirmTerritoryCards(requireRunId(runId)),
    meta: {
      suppressGlobalErrorToast: true,
    },
    onSuccess: () => {
      if (!runId) {
        return
      }

      void queryClient.invalidateQueries({
        queryKey: territoryReviewCardsQueryKey(runId),
        exact: true,
      })
      void queryClient.invalidateQueries({
        queryKey: territoryReviewResearchSnapshotQueryKey(runId),
        exact: true,
      })
    },
  })
}
