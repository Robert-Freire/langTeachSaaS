import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import type { AxiosAdapter, AxiosResponse, AxiosError } from 'axios'
import { setupAuthInterceptor } from './apiClient'
import type { GetAccessToken } from './apiClient'

interface AdapterCall {
  url?: string
  authorization?: unknown
  retryFlag?: boolean
}

function makeStubAdapter(plan: Array<AxiosResponse | AxiosError>): {
  adapter: AxiosAdapter
  calls: AdapterCall[]
} {
  const calls: AdapterCall[] = []
  let i = 0
  const adapter: AxiosAdapter = async (config) => {
    calls.push({
      url: config.url,
      authorization: config.headers?.Authorization,
      retryFlag: (config as { _retry?: boolean })._retry,
    })
    const next = plan[i++]
    if (!next) throw new Error(`stub adapter exhausted at call ${i}`)
    if (next instanceof Error) {
      ;(next as AxiosError).config = config
      throw next
    }
    return { ...next, config }
  }
  return { adapter, calls }
}

function makeAxiosError(status: number): AxiosError {
  const err = new Error(`status ${status}`) as AxiosError
  err.isAxiosError = true
  err.name = 'AxiosError'
  err.response = {
    status,
    data: {},
    statusText: '',
    headers: {},
    config: {} as never,
  }
  err.config = {} as never
  err.toJSON = () => ({})
  return err
}

function okResponse(body: unknown = {}): AxiosResponse {
  return {
    data: body,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as never,
  }
}

function makeClient(plan: Array<AxiosResponse | AxiosError>) {
  const { adapter, calls } = makeStubAdapter(plan)
  const client = axios.create({ adapter })
  return { client, calls }
}

describe('setupAuthInterceptor', () => {
  let getToken: ReturnType<typeof vi.fn<GetAccessToken>>
  let triggerReauth: ReturnType<typeof vi.fn<() => void>>

  beforeEach(() => {
    triggerReauth = vi.fn<() => void>()
  })

  it('attaches bearer token on every request', async () => {
    getToken = vi.fn<GetAccessToken>().mockResolvedValue('token-1')
    const { client, calls } = makeClient([okResponse()])
    setupAuthInterceptor(client, getToken, triggerReauth)

    await client.get('/api/x')

    expect(calls[0]?.authorization).toBe('Bearer token-1')
    expect(triggerReauth).not.toHaveBeenCalled()
  })

  it('on 401: refreshes token and replays the original request', async () => {
    let current = 'stale'
    getToken = vi
      .fn<GetAccessToken>()
      .mockImplementation(async (opts) => {
        if (opts?.forceRefresh) current = 'fresh'
        return current
      })
    const { client, calls } = makeClient([makeAxiosError(401), okResponse({ ok: true })])
    setupAuthInterceptor(client, getToken, triggerReauth)

    const res = await client.get('/api/x')

    expect(res.data).toEqual({ ok: true })
    expect(calls).toHaveLength(2)
    expect(calls[0]?.authorization).toBe('Bearer stale')
    expect(calls[1]?.authorization).toBe('Bearer fresh')
    expect(calls[1]?.retryFlag).toBe(true)
    expect(triggerReauth).not.toHaveBeenCalled()
  })

  it('on 401: triggers re-auth when refresh fails', async () => {
    getToken = vi.fn<GetAccessToken>()
    getToken.mockResolvedValueOnce('stale')
    getToken.mockRejectedValueOnce(new Error('login_required'))
    const { client } = makeClient([makeAxiosError(401)])
    setupAuthInterceptor(client, getToken, triggerReauth)

    await expect(client.get('/api/x')).rejects.toBeDefined()
    expect(triggerReauth).toHaveBeenCalledTimes(1)
  })

  it('dedupes concurrent 401s into a single refresh call', async () => {
    let current = 'stale'
    getToken = vi
      .fn<GetAccessToken>()
      .mockImplementation(async (opts) => {
        if (opts?.forceRefresh) current = 'fresh'
        return current
      })
    const { client } = makeClient([
      makeAxiosError(401),
      makeAxiosError(401),
      okResponse({ a: 1 }),
      okResponse({ b: 2 }),
    ])
    setupAuthInterceptor(client, getToken, triggerReauth)

    const [r1, r2] = await Promise.all([client.get('/api/a'), client.get('/api/b')])

    expect([r1.data, r2.data]).toEqual(expect.arrayContaining([{ a: 1 }, { b: 2 }]))
    const refreshCalls = getToken.mock.calls.filter((c) => c[0]?.forceRefresh).length
    expect(refreshCalls).toBe(1)
    expect(triggerReauth).not.toHaveBeenCalled()
  })

  it('does not loop when the replayed request also returns 401', async () => {
    getToken = vi.fn<GetAccessToken>().mockResolvedValue('any')
    const { client, calls } = makeClient([makeAxiosError(401), makeAxiosError(401)])
    setupAuthInterceptor(client, getToken, triggerReauth)

    await expect(client.get('/api/x')).rejects.toBeDefined()
    expect(calls).toHaveLength(2)
    expect(triggerReauth).toHaveBeenCalledTimes(1)
  })

  it('passes through non-401 errors untouched', async () => {
    getToken = vi.fn<GetAccessToken>().mockResolvedValue('token-1')
    const { client } = makeClient([makeAxiosError(500)])
    setupAuthInterceptor(client, getToken, triggerReauth)

    await expect(client.get('/api/x')).rejects.toMatchObject({
      response: { status: 500 },
    })
    expect(triggerReauth).not.toHaveBeenCalled()
  })

  it('triggers re-auth if the request-time getAccessToken throws', async () => {
    getToken = vi.fn<GetAccessToken>().mockRejectedValue(new Error('login_required'))
    const { client, calls } = makeClient([okResponse()])
    setupAuthInterceptor(client, getToken, triggerReauth)

    await expect(client.get('/api/x')).rejects.toBeDefined()
    expect(calls).toHaveLength(0)
    expect(triggerReauth).toHaveBeenCalledTimes(1)
  })
})
