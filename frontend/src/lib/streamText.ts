const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

/**
 * Streams an SSE generation endpoint and returns the full accumulated text.
 * Throws on non-2xx responses or stream errors.
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
    if (done) break
    buffer += decoder.decode(value, { stream: true })

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
  }

  return result
}
