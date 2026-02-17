import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'

import { getErrorMessage, isApiError } from '@/lib/api'
import { toast } from '@/hooks/use-toast'

const DEFAULT_ERROR_MESSAGE = 'Something went wrong'

type ErrorMeta = {
  suppressGlobalErrorToast?: boolean
}

function shouldToast(meta: unknown): boolean {
  if (!meta || typeof meta !== 'object') {
    return true
  }

  return (meta as ErrorMeta).suppressGlobalErrorToast !== true
}

function notifyError(error: unknown) {
  toast({
    variant: 'destructive',
    title: 'Error',
    description: getErrorMessage(error, DEFAULT_ERROR_MESSAGE),
  })
}

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && error.status >= 400 && error.status < 500 && error.status !== 429) {
    return false
  }

  return failureCount < 2
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (shouldToast(query.meta)) {
        notifyError(error)
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (shouldToast(mutation.meta)) {
        notifyError(error)
      }
    },
  }),
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: shouldRetry,
    },
  },
})
