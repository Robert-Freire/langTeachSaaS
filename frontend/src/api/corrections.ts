import { apiClient } from '../lib/apiClient'
import type { CorrectionDetailDto } from '../types/correction'

export async function getCorrection(
  studentId: string,
  correctionId: string,
): Promise<CorrectionDetailDto> {
  const { data } = await apiClient.get<CorrectionDetailDto>(
    `/api/students/${studentId}/corrections/${correctionId}`,
  )
  return data
}

export async function generateCorrection(
  studentId: string,
  correctionId: string,
): Promise<CorrectionDetailDto> {
  const { data } = await apiClient.post<CorrectionDetailDto>(
    `/api/students/${studentId}/corrections/${correctionId}/corregir`,
    null,
    { timeout: 60_000 },
  )
  return data
}

export async function downloadCorrectionDocx(
  studentId: string,
  correctionId: string,
  filenameHint: string,
): Promise<void> {
  const response = await apiClient.get<Blob>(
    `/api/students/${studentId}/corrections/${correctionId}/docx`,
    { responseType: 'blob' },
  )
  const blob = response.data
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${sanitizeFilename(filenameHint)}.docx`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.URL.revokeObjectURL(url)
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_.\s]/g, '').trim() || 'correccion'
}
