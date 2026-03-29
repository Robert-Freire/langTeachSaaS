import { useState, useRef, useCallback, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import type { GenerateRequest, GenerateStatus } from '../api/generate'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

export function useGenerate() {
  const { getAccessTokenSilently } = useAuth0()
  const [status, setStatus] = useState<GenerateStatus>('idle')
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [quotaExceeded, setQuotaExceeded] = useState(false)
  const [warnings, setWarnings] = useState<string[]>([])
  const controllerRef = useRef<AbortController | null>(null)

  const abort = useCallback(() => {
    controllerRef.current?.abort()
    setStatus('idle')
  }, [])

  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
    }
  }, [])

  const generate = useCallback(
    async (taskType: string, request: GenerateRequest) => {
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller

      setStatus('streaming')
      setOutput('')
      setError(null)
      setQuotaExceeded(false)
      setWarnings([])

      try {
        const token = await getAccessTokenSilently()
        const response = await fetch(
          `${BASE_URL}/api/generate/${taskType}/stream`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(request),
            signal: controller.signal,
          },
        )

        if (response.status === 429) {
          let message = 'Monthly generation limit reached.'
          try {
            const errorBody = await response.json()
            const resetsAt = errorBody.resetsAt
              ? new Date(errorBody.resetsAt).toLocaleDateString()
              : ''
            message = resetsAt
              ? `${errorBody.message ?? message} Resets on ${resetsAt}.`
              : (errorBody.message ?? message)
          } catch {
            // ignore parse failure
          }
          setError(message)
          setQuotaExceeded(true)
          setStatus('error')
          return
        }

        if (!response.ok) {
          setError(`Request failed: ${response.status}`)
          setStatus('error')
          return
        }

        if (!response.body) {
          setError('Response body is not readable')
          setStatus('error')
          return
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          const lines = buffer.split('\n')
          buffer = lines.pop()!

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6)
            if (data === '[DONE]') {
              setStatus('done')
              return
            }
            try {
              const parsed = JSON.parse(data)
              if (typeof parsed === 'object' && parsed !== null) {
                const obj = parsed as Record<string, unknown>
                if (obj.error) {
                  setError(obj.error as string)
                  setStatus('error')
                  return
                }
                if (obj.type === 'grammar_warnings' && Array.isArray(obj.items)) {
                  setWarnings(obj.items as string[])
                }
              } else if (typeof parsed === 'string') {
                setOutput((prev) => prev + parsed)
              }
            } catch {
              // skip malformed line
            }
          }
        }

        setStatus('done')
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setStatus('idle')
        } else {
          setError(err instanceof Error ? err.message : 'Unknown error')
          setStatus('error')
        }
      }
    },
    [getAccessTokenSilently],
  )

  return { status, output, error, quotaExceeded, warnings, generate, abort }
}
