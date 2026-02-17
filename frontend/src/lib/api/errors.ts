export class ApiError extends Error {
  public readonly status: number
  public readonly detail: string
  public readonly payload: unknown

  constructor(status: number, detail: string, payload?: unknown) {
    super(detail)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
    this.payload = payload
  }
}

function hasDetail(payload: unknown): payload is { detail: string } {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  return 'detail' in payload && typeof payload.detail === 'string'
}

export function parseApiErrorDetail(payload: unknown): string | undefined {
  if (hasDetail(payload)) {
    return payload.detail
  }

  return undefined
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (isApiError(error)) {
    return error.detail
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}
