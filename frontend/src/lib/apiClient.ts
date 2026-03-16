import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000',
})

export function setupAuthInterceptor(
  getAccessToken: () => Promise<string>,
  onUnauthorized?: () => void,
) {
  const requestId = apiClient.interceptors.request.use(async (config) => {
    const token = await getAccessToken()
    config.headers.Authorization = `Bearer ${token}`
    return config
  })

  let responseId: number | undefined
  if (onUnauthorized) {
    responseId = apiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          onUnauthorized()
        }
        return Promise.reject(error)
      },
    )
  }

  return () => {
    apiClient.interceptors.request.eject(requestId)
    if (responseId !== undefined) {
      apiClient.interceptors.response.eject(responseId)
    }
  }
}
