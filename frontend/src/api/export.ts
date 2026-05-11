import { apiClient } from '../lib/apiClient'
import { triggerBlobDownload } from '../lib/downloadBlob'

export type ExportMode = 'teacher' | 'student'

export async function exportLessonPdf(lessonId: string, mode: ExportMode): Promise<void> {
  const response = await apiClient.get<Blob>(`/api/lessons/${lessonId}/export/pdf`, {
    params: { mode },
    responseType: 'blob',
  })
  triggerBlobDownload(response, `lesson_${mode}.pdf`, 'application/pdf')
}
