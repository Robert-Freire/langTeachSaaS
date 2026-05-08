import axios, { AxiosError } from 'axios'
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import type { GetAccessToken, GetAccessTokenOptions } from './authHelpers'

export type { GetAccessToken, GetAccessTokenOptions }

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000',
})

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

export function setupAuthInterceptor(
  client: AxiosInstance,
  getAccessToken: GetAccessToken,
  triggerReauth: () => void,
) {
  let inflightRefresh: Promise<string | null> | null = null
  let reauthTriggered = false

  const refreshTokenOnce = (): Promise<string | null> => {
    if (inflightRefresh) return inflightRefresh
    inflightRefresh = getAccessToken({ forceRefresh: true })
      .catch(() => null)
      .finally(() => {
        inflightRefresh = null
      })
    return inflightRefresh
  }

  const fireReauth = () => {
    if (reauthTriggered) return
    reauthTriggered = true
    triggerReauth()
  }

  const requestId = client.interceptors.request.use(async (config) => {
    try {
      const token = await getAccessToken()
      config.headers.Authorization = `Bearer ${token}`
      return config
    } catch {
      fireReauth()
      throw new axios.Cancel('auth-session-expired')
    }
  })

  const responseId = client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      if (!axios.isAxiosError(error) || error.response?.status !== 401) {
        return Promise.reject(error)
      }
      const original = error.config as RetriableConfig | undefined
      if (!original || original._retry) {
        fireReauth()
        return Promise.reject(error)
      }
      original._retry = true
      const newToken = await refreshTokenOnce()
      if (!newToken) {
        fireReauth()
        return Promise.reject(error)
      }
      // The request interceptor will re-fetch the (now cached) fresh token
      // and attach it on replay. Auth0 SDK guarantees subsequent
      // getAccessTokenSilently calls return the refreshed token from cache.
      return client(original)
    },
  )

  return () => {
    client.interceptors.request.eject(requestId)
    client.interceptors.response.eject(responseId)
  }
}
