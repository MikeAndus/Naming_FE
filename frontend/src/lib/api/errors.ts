export class ApiError extends Error {
  public readonly status: number
  public readonly body: unknown

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? getApiErrorMessageFromBody(status, body))
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

function hasDetail(body: unknown): body is { detail: unknown } {
  if (!body || typeof body !== 'object') {
    return false
  }

  return 'detail' in body
}

export function parseApiErrorDetail(body: unknown): unknown {
  if (hasDetail(body)) {
    return body.detail
  }

  return undefined
}

function normalizeForDeterministicJson(value: unknown): unknown {
  if (!value || typeof value !== 'object') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeForDeterministicJson(item))
  }

  const objectValue = value as Record<string, unknown>
  return Object.keys(objectValue)
    .sort()
    .reduce<Record<string, unknown>>((accumulator, key) => {
      accumulator[key] = normalizeForDeterministicJson(objectValue[key])
      return accumulator
    }, {})
}

function toDisplayString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value
  }

  if (
    typeof value === 'number' ||
    typeof value === 'bigint' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return String(value)
  }

  if (typeof value === 'undefined') {
    return undefined
  }

  try {
    return JSON.stringify(normalizeForDeterministicJson(value))
  } catch {
    return undefined
  }
}

function getApiErrorMessageFromBody(status: number, body: unknown): string {
  const detail = parseApiErrorDetail(body)
  const detailMessage = toDisplayString(detail)
  if (detailMessage) {
    return detailMessage
  }

  const bodyMessage = toDisplayString(body)
  if (bodyMessage) {
    return bodyMessage
  }

  return `Request failed with status ${status}`
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (isApiError(error)) {
    const detail = parseApiErrorDetail(error.body)
    const detailMessage = toDisplayString(detail)
    if (detailMessage) {
      return detailMessage
    }

    const bodyMessage = toDisplayString(error.body)
    if (bodyMessage) {
      return bodyMessage
    }

    return error.message || fallback
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}
