import { apiClient } from '../lib/apiClient'
import { triggerBlobDownload } from '../lib/downloadBlob'
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
  const fallback = `${sanitizeFilename(filenameHint)}.docx`
  triggerBlobDownload(response, fallback)
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_.\s]/g, '').trim() || 'correccion'
}
