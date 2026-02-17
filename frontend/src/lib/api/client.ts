import { ApiError } from '@/lib/api/errors'

const API_PREFIX = '/api/v1'

function normalizeTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function hasApiPrefix(pathname: string): boolean {
  return pathname === API_PREFIX || pathname.endsWith(`${API_PREFIX}`)
}

function appendApiPrefix(pathname: string): string {
  if (!pathname || pathname === '/') {
    return API_PREFIX
  }

  const normalizedPathname = normalizeTrailingSlash(pathname)
  if (hasApiPrefix(normalizedPathname)) {
    return normalizedPathname
  }

  return `${normalizedPathname}${API_PREFIX}`
}

function resolveApiBaseUrl(rawBaseUrl?: string): string {
  const trimmed = rawBaseUrl?.trim()
  if (!trimmed) {
    return API_PREFIX
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const url = new URL(trimmed)
    url.pathname = appendApiPrefix(url.pathname)
    return normalizeTrailingSlash(url.toString())
  }

  if (trimmed.startsWith('/')) {
    return appendApiPrefix(trimmed)
  }

  return appendApiPrefix(`/${trimmed}`)
}

const apiV1BaseUrl = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL)

export function getApiV1BaseUrl(): string {
  return apiV1BaseUrl
}

function buildRequestUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${apiV1BaseUrl}${normalizedPath}`
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) {
    return null
  }

  const text = await response.text()
  if (!text) {
    return null
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text) as unknown
    } catch {
      return text
    }
  }

  return text
}

export interface RequestOptions<TBody> extends Omit<RequestInit, 'body' | 'headers'> {
  body?: TBody
  headers?: HeadersInit
}

function isJsonBody(body: unknown): boolean {
  if (
    body === null ||
    typeof body === 'number' ||
    typeof body === 'boolean' ||
    Array.isArray(body)
  ) {
    return true
  }

  if (typeof body !== 'object') {
    return false
  }

  return (
    !(body instanceof FormData) &&
    !(body instanceof URLSearchParams) &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer) &&
    !ArrayBuffer.isView(body)
  )
}

export async function request<TResponse, TBody = undefined>(
  path: string,
  options: RequestOptions<TBody> = {},
): Promise<TResponse> {
  const { body, headers, ...restOptions } = options

  const requestHeaders = new Headers(headers)
  if (!requestHeaders.has('Accept')) {
    requestHeaders.set('Accept', 'application/json')
  }
  if (body !== undefined && isJsonBody(body) && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json')
  }

  let requestBody: BodyInit | undefined
  if (body !== undefined) {
    requestBody = isJsonBody(body) ? JSON.stringify(body) : (body as BodyInit)
  }

  const response = await fetch(buildRequestUrl(path), {
    ...restOptions,
    headers: requestHeaders,
    body: requestBody,
  })

  const payload = await parseResponsePayload(response)

  if (!response.ok) {
    throw new ApiError(response.status, payload)
  }

  return payload as TResponse
}
