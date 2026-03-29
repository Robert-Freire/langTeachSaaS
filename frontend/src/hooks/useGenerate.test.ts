import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { useGenerate } from './useGenerate'

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({
    getAccessTokenSilently: vi.fn().mockResolvedValue('test-token'),
  }),
}))

const SSE_URL = 'http://localhost:5000/api/generate/vocabulary/stream'

const server = setupServer()

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function makeSseBody(...lines: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(line))
      }
      controller.close()
    },
  })
}

const validRequest = {
  lessonId: '00000000-0000-0000-0000-000000000001',
  language: 'English',
  cefrLevel: 'B1',
  topic: 'Food',
}

describe('useGenerate', () => {
  it('transitions status from streaming to done and accumulates output', async () => {
    server.use(
      http.post(SSE_URL, () => {
        const body = makeSseBody(
          'data: "hello"\n\n',
          'data: " world"\n\n',
          'data: [DONE]\n\n',
        )
        return new HttpResponse(body, {
          headers: { 'Content-Type': 'text/event-stream' },
        })
      }),
    )

    const { result } = renderHook(() => useGenerate())

    expect(result.current.status).toBe('idle')

    act(() => {
      result.current.generate('vocabulary', validRequest)
    })

    await waitFor(() => expect(result.current.status).toBe('done'), {
      timeout: 3000,
    })

    expect(result.current.output).toBe('hello world')
    expect(result.current.error).toBeNull()
  })

  it('sets status to error when server returns non-ok response', async () => {
    server.use(
      http.post(SSE_URL, () => {
        return new HttpResponse(null, { status: 503 })
      }),
    )

    const { result } = renderHook(() => useGenerate())

    act(() => {
      result.current.generate('vocabulary', validRequest)
    })

    await waitFor(() => expect(result.current.status).toBe('error'), {
      timeout: 3000,
    })

    expect(result.current.error).toContain('503')
  })

  it('sets status to error when stream contains an error event', async () => {
    server.use(
      http.post(SSE_URL, () => {
        const body = makeSseBody('data: {"error":"rate_limit"}\n\n')
        return new HttpResponse(body, {
          headers: { 'Content-Type': 'text/event-stream' },
        })
      }),
    )

    const { result } = renderHook(() => useGenerate())

    act(() => {
      result.current.generate('vocabulary', validRequest)
    })

    await waitFor(() => expect(result.current.status).toBe('error'), {
      timeout: 3000,
    })

    expect(result.current.error).toBe('rate_limit')
  })

  it('resets status to idle when abort is called', async () => {
    server.use(
      http.post(SSE_URL, async () => {
        // Never resolves — simulates a slow stream
        await new Promise(() => {})
        return new HttpResponse(null)
      }),
    )

    const { result } = renderHook(() => useGenerate())

    act(() => {
      result.current.generate('vocabulary', validRequest)
    })

    await waitFor(() => expect(result.current.status).toBe('streaming'))

    act(() => {
      result.current.abort()
    })

    await waitFor(() => expect(result.current.status).toBe('idle'))
  })

  it('sets quotaExceeded when server returns 429', async () => {
    server.use(
      http.post(SSE_URL, () => {
        return HttpResponse.json(
          { message: 'Monthly generation limit reached.', resetsAt: '2026-05-01T00:00:00Z' },
          { status: 429 },
        )
      }),
    )

    const { result } = renderHook(() => useGenerate())

    act(() => {
      result.current.generate('vocabulary', validRequest)
    })

    await waitFor(() => expect(result.current.status).toBe('error'), {
      timeout: 3000,
    })

    expect(result.current.quotaExceeded).toBe(true)
    expect(result.current.error).toContain('Monthly generation limit reached.')
  })

  it('extracts grammar_warnings from the SSE stream and exposes them', async () => {
    server.use(
      http.post(SSE_URL, () => {
        const body = makeSseBody(
          'data: "hello"\n\n',
          'data: {"type":"grammar_warnings","items":["Ser/estar error: test warning"]}\n\n',
          'data: [DONE]\n\n',
        )
        return new HttpResponse(body, {
          headers: { 'Content-Type': 'text/event-stream' },
        })
      }),
    )

    const { result } = renderHook(() => useGenerate())

    act(() => {
      result.current.generate('vocabulary', validRequest)
    })

    await waitFor(() => expect(result.current.status).toBe('done'), {
      timeout: 3000,
    })

    expect(result.current.output).toBe('hello')
    expect(result.current.warnings).toEqual(['Ser/estar error: test warning'])
  })

  it('starts with empty warnings and clears them on new generation', async () => {
    server.use(
      http.post(SSE_URL, () => {
        const body = makeSseBody(
          'data: "content"\n\n',
          'data: [DONE]\n\n',
        )
        return new HttpResponse(body, {
          headers: { 'Content-Type': 'text/event-stream' },
        })
      }),
    )

    const { result } = renderHook(() => useGenerate())

    expect(result.current.warnings).toEqual([])

    act(() => {
      result.current.generate('vocabulary', validRequest)
    })

    await waitFor(() => expect(result.current.status).toBe('done'), {
      timeout: 3000,
    })

    expect(result.current.warnings).toEqual([])
  })

  it('aborts the in-flight request when the hook unmounts during streaming', async () => {
    let requestAborted = false

    server.use(
      http.post(SSE_URL, async ({ request }) => {
        request.signal.addEventListener('abort', () => { requestAborted = true })
        // Never resolves — simulates a slow stream
        await new Promise(() => {})
        return new HttpResponse(null)
      }),
    )

    const { result, unmount } = renderHook(() => useGenerate())

    act(() => {
      result.current.generate('vocabulary', validRequest)
    })

    await waitFor(() => expect(result.current.status).toBe('streaming'))

    act(() => {
      unmount()
    })

    await waitFor(() => expect(requestAborted).toBe(true))
  })
})
