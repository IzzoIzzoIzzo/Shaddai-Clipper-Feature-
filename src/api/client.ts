import { API_BASE } from '@/lib/constants'

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function getAuthToken(): string {
  // In MVP mode, read from localStorage or env
  return localStorage.getItem('shaddai_token') || ''
}

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean>
}

async function apiClient<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options

  let url = `${API_BASE}${endpoint}`
  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => searchParams.set(k, String(v)))
    url += `?${searchParams.toString()}`
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAuthToken()}`,
      'X-Request-Id': crypto.randomUUID(),
      ...fetchOptions.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(
      response.status,
      body?.error?.code || 'UNKNOWN_ERROR',
      body?.error?.message || `Request failed with status ${response.status}`
    )
  }

  return response.json()
}

export { apiClient, ApiError }
export type { FetchOptions }