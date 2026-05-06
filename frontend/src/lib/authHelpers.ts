export interface GetAccessTokenOptions {
  forceRefresh?: boolean
}

export type GetAccessToken = (opts?: GetAccessTokenOptions) => Promise<string>

export class AuthExpiredError extends Error {
  constructor() {
    super('Session expired. Please sign in again.')
    this.name = 'AuthExpiredError'
  }
}

// Returns a refresh-once function that coalesces concurrent forced-refresh calls,
// mirroring the inflightRefresh pattern in apiClient.ts's setupAuthInterceptor.
export function makeRefreshOnce(getAccessToken: GetAccessToken): () => Promise<string | null> {
  let inflight: Promise<string | null> | null = null
  return () => {
    if (inflight) return inflight
    inflight = getAccessToken({ forceRefresh: true })
      .catch(() => null)
      .finally(() => { inflight = null })
    return inflight
  }
}

// Mirrors the triggerReauth callback pattern from setupAuthInterceptor in apiClient.ts.
// Fetches with bearer token from getAccessToken, detects 401, silently refreshes via
// refreshOnce and replays once. On second 401 or refresh failure: calls triggerReauth()
// then throws AuthExpiredError.
export async function fetchWithAuthRetry(
  input: RequestInfo | URL,
  init: RequestInit,
  getAccessToken: GetAccessToken,
  triggerReauth: () => void,
  refreshOnce: () => Promise<string | null>,
): Promise<Response> {
  const token = await getAccessToken()
  const response = await fetch(input, {
    ...init,
    headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${token}` },
  })

  if (response.status !== 401) return response

  const newToken = await refreshOnce()
  if (!newToken) {
    triggerReauth()
    throw new AuthExpiredError()
  }

  const retryResponse = await fetch(input, {
    ...init,
    headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${newToken}` },
  })
  if (retryResponse.status === 401) {
    triggerReauth()
    throw new AuthExpiredError()
  }

  return retryResponse
}
