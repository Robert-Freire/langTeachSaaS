import type { AxiosResponse } from 'axios'

export function triggerBlobDownload(
  response: AxiosResponse<Blob>,
  fallbackFilename: string,
  mimeType?: string,
): void {
  const blob = mimeType ? new Blob([response.data], { type: mimeType }) : response.data
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  const disposition = response.headers['content-disposition'] as string | undefined
  const match = disposition?.match(/filename="([^"]+)"/) ?? disposition?.match(/filename=([^;\s]+)/)
  anchor.download = match?.[1] ?? fallbackFilename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  window.URL.revokeObjectURL(url)
}
