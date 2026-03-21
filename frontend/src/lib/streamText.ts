const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

export class QuotaExceededError extends Error {
  public readonly resetsAt: string

  constructor(message: string, resetsAt: string) {
    super(message)
    this.name = 'QuotaExceededError'
    this.resetsAt = resetsAt
  }
}

/**
 * Streams an SSE generation endpoint and returns the full accumulated text.
 * Throws on non-2xx responses or stream errors.
 * Throws QuotaExceededError on 429 (quota exhausted).
 */
export async function streamText(
  taskType: string,
  body: object,
  token: string,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch(`${BASE_URL}/api/generate/${taskType}/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    signal,
  })

  if (response.status === 429) {
    let resetsAt = ''
    let message = 'Monthly generation limit reached.'
    try {
      const errorBody = await response.json()
      resetsAt = errorBody.resetsAt ?? ''
      message = errorBody.message ?? message
    } catch {
      // ignore parse failure
    }
    throw new QuotaExceededError(message, resetsAt)
  }

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }

  if (!response.body) {
    throw new Error('Response body is not readable')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let result = ''

  while (true) {
    const { done, value } = await reader.read()
    buffer += done ? decoder.decode() : decoder.decode(value, { stream: true })
    if (done && !buffer) break

    const lines = buffer.split('\n')
    buffer = lines.pop()!

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') return result
      let parsed: unknown
      try {
        parsed = JSON.parse(data)
      } catch {
        continue // skip malformed line
      }
      if (typeof parsed === 'object' && parsed !== null && (parsed as Record<string, unknown>).error) {
        throw new Error((parsed as Record<string, unknown>).error as string)
      }
      if (typeof parsed === 'string') {
        result += parsed
      }
    }

    if (done) break
  }

  return result
}
