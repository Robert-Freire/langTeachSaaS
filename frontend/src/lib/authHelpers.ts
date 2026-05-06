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

export async function fetchWithAuthRetry(
  input: RequestInfo | URL,
  init: RequestInit,
  getAccessToken: GetAccessToken,
): Promise<Response> {
  const token = await getAccessToken()
  const response = await fetch(input, {
    ...init,
    headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${token}` },
  })

  if (response.status !== 401) return response

  const newToken = await getAccessToken({ forceRefresh: true }).catch(() => null)
  if (!newToken) throw new AuthExpiredError()

  const retryResponse = await fetch(input, {
    ...init,
    headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${newToken}` },
  })
  if (retryResponse.status === 401) throw new AuthExpiredError()

  return retryResponse
}
