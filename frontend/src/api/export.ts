import { apiClient } from '../lib/apiClient'

export type ExportMode = 'teacher' | 'student'

export async function exportLessonPdf(lessonId: string, mode: ExportMode): Promise<void> {
  const response = await apiClient.get(`/api/lessons/${lessonId}/export/pdf`, {
    params: { mode },
    responseType: 'blob',
  })

  const blob = new Blob([response.data], { type: 'application/pdf' })
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  const disposition = response.headers['content-disposition']
  const filenameMatch = disposition?.match(/filename="([^"]+)"/) ?? disposition?.match(/filename=([^;\s]+)/)
  anchor.download = filenameMatch?.[1] ?? `lesson_${mode}.pdf`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  window.URL.revokeObjectURL(url)
}
