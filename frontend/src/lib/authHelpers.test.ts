import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchWithAuthRetry, makeRefreshOnce, AuthExpiredError } from './authHelpers'
import type { GetAccessToken } from './authHelpers'

function makeResponse(status: number, body: string | null = null): Response {
  return new Response(body, { status })
}

describe('makeRefreshOnce', () => {
  it('deduplicates concurrent forced-refresh calls into a single promise', async () => {
    let callCount = 0
    const getAccessToken: GetAccessToken = vi.fn().mockImplementation(async () => {
      callCount++
      return 'fresh-token'
    })

    const refreshOnce = makeRefreshOnce(getAccessToken)
    const [r1, r2, r3] = await Promise.all([refreshOnce(), refreshOnce(), refreshOnce()])

    expect(callCount).toBe(1)
    expect(r1).toBe('fresh-token')
    expect(r2).toBe('fresh-token')
    expect(r3).toBe('fresh-token')
  })

  it('resets inflight after completion so a second call works', async () => {
    let callCount = 0
    const getAccessToken: GetAccessToken = vi.fn().mockImplementation(async () => {
      callCount++
      return `token-${callCount}`
    })

    const refreshOnce = makeRefreshOnce(getAccessToken)
    await refreshOnce()
    await refreshOnce()

    expect(callCount).toBe(2)
  })

  it('returns null and resets when getAccessToken throws', async () => {
    const getAccessToken: GetAccessToken = vi.fn().mockRejectedValue(new Error('network error'))
    const refreshOnce = makeRefreshOnce(getAccessToken)

    const result = await refreshOnce()
    expect(result).toBeNull()
    // Should allow a fresh attempt after failure
    const result2 = await refreshOnce()
    expect(result2).toBeNull()
  })
})

describe('fetchWithAuthRetry', () => {
  let getAccessToken: GetAccessToken
  let triggerReauth: () => void
  let refreshOnce: () => Promise<string | null>
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    getAccessToken = vi.fn().mockResolvedValue('initial-token')
    triggerReauth = vi.fn()
    refreshOnce = vi.fn().mockResolvedValue('refreshed-token')
    fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
  })

  it('attaches bearer token and returns response on success', async () => {
    fetchSpy.mockResolvedValue(makeResponse(200, 'ok'))

    const response = await fetchWithAuthRetry('/api/test', { method: 'GET' }, getAccessToken, triggerReauth, refreshOnce)

    expect(response.status).toBe(200)
    expect(fetchSpy).toHaveBeenCalledOnce()
    const callArgs = fetchSpy.mock.calls[0][1]
    expect(callArgs.headers.Authorization).toBe('Bearer initial-token')
    expect(triggerReauth).not.toHaveBeenCalled()
  })

  it('retries with refreshed token after 401 and returns success', async () => {
    fetchSpy
      .mockResolvedValueOnce(makeResponse(401))
      .mockResolvedValueOnce(makeResponse(200, 'ok'))

    const response = await fetchWithAuthRetry('/api/test', { method: 'GET' }, getAccessToken, triggerReauth, refreshOnce)

    expect(response.status).toBe(200)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(refreshOnce).toHaveBeenCalledOnce()
    const retryArgs = fetchSpy.mock.calls[1][1]
    expect(retryArgs.headers.Authorization).toBe('Bearer refreshed-token')
    expect(triggerReauth).not.toHaveBeenCalled()
  })

  it('calls triggerReauth and throws AuthExpiredError when refresh returns null', async () => {
    fetchSpy.mockResolvedValue(makeResponse(401))
    refreshOnce = vi.fn().mockResolvedValue(null)

    await expect(
      fetchWithAuthRetry('/api/test', { method: 'GET' }, getAccessToken, triggerReauth, refreshOnce),
    ).rejects.toBeInstanceOf(AuthExpiredError)
    expect(triggerReauth).toHaveBeenCalledOnce()
  })

  it('calls triggerReauth and throws AuthExpiredError when retry also returns 401', async () => {
    fetchSpy
      .mockResolvedValueOnce(makeResponse(401))
      .mockResolvedValueOnce(makeResponse(401))

    await expect(
      fetchWithAuthRetry('/api/test', { method: 'GET' }, getAccessToken, triggerReauth, refreshOnce),
    ).rejects.toBeInstanceOf(AuthExpiredError)
    expect(triggerReauth).toHaveBeenCalledOnce()
  })

  it('preserves init fields (signal, body) on the retry request', async () => {
    const controller = new AbortController()
    fetchSpy
      .mockResolvedValueOnce(makeResponse(401))
      .mockResolvedValueOnce(makeResponse(200))

    await fetchWithAuthRetry(
      '/api/test',
      { method: 'POST', body: '{"x":1}', signal: controller.signal },
      getAccessToken,
      triggerReauth,
      refreshOnce,
    )

    const retryArgs = fetchSpy.mock.calls[1][1]
    expect(retryArgs.body).toBe('{"x":1}')
    expect(retryArgs.signal).toBe(controller.signal)
  })

  it('does not retry non-401 errors', async () => {
    fetchSpy.mockResolvedValue(makeResponse(503))

    const response = await fetchWithAuthRetry('/api/test', { method: 'GET' }, getAccessToken, triggerReauth, refreshOnce)

    expect(response.status).toBe(503)
    expect(fetchSpy).toHaveBeenCalledOnce()
    expect(refreshOnce).not.toHaveBeenCalled()
    expect(triggerReauth).not.toHaveBeenCalled()
  })
})
