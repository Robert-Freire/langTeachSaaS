import { apiClient } from '../lib/apiClient'
import { triggerBlobDownload } from '../lib/downloadBlob'

export type CorrectionStatus = 'Pendiente' | 'Entregada' | 'Corrigiendo' | 'Corregida'
export type CorrectionTagCategory = 'C' | 'G' | 'L' | 'O' | 'MuyBien'

export interface CorrectionSummary {
  id: string
  assignmentTitle: string
  status: CorrectionStatus
  createdAt: string
  correctedAt: string | null
}

export interface CorrectionTag {
  category: CorrectionTagCategory
  spannedText: string
  startIndex: number
  endIndex: number
  explanation: string | null
  correctedForm: string | null
  orderIndex: number
}

export interface CorrectionDetail {
  id: string
  studentId: string
  schemaVersion: number
  status: CorrectionStatus
  assignmentTitle: string
  assignmentPrompt: string | null
  studentText: string | null
  markedUpOutput: string | null
  tags: CorrectionTag[]
  createdAt: string
  updatedAt: string
  correctedAt: string | null
}

export interface CreateCorrectionRequest {
  assignmentTitle?: string | null
  assignmentPrompt?: string | null
  studentText?: string | null
}

export type UpdateCorrectionRequest = CreateCorrectionRequest

export async function listCorrections(studentId: string): Promise<CorrectionSummary[]> {
  const res = await apiClient.get<CorrectionSummary[]>(`/api/students/${studentId}/corrections`)
  return res.data
}

export async function getCorrection(studentId: string, id: string): Promise<CorrectionDetail> {
  const res = await apiClient.get<CorrectionDetail>(`/api/students/${studentId}/corrections/${id}`)
  return res.data
}

export async function createCorrection(
  studentId: string,
  body: CreateCorrectionRequest,
): Promise<CorrectionDetail> {
  const res = await apiClient.post<CorrectionDetail>(`/api/students/${studentId}/corrections`, body)
  return res.data
}

export async function updateCorrection(
  studentId: string,
  id: string,
  body: UpdateCorrectionRequest,
): Promise<CorrectionDetail> {
  const res = await apiClient.patch<CorrectionDetail>(
    `/api/students/${studentId}/corrections/${id}`,
    body,
  )
  return res.data
}

export async function deleteCorrection(studentId: string, id: string): Promise<void> {
  await apiClient.delete(`/api/students/${studentId}/corrections/${id}`)
}

export async function corregirCorrection(studentId: string, id: string): Promise<CorrectionDetail> {
  const res = await apiClient.post<CorrectionDetail>(
    `/api/students/${studentId}/corrections/${id}/corregir`,
    null,
  )
  return res.data
}

export async function downloadCorrectionDocx(
  studentId: string,
  id: string,
  filenameHint: string,
): Promise<void> {
  const response = await apiClient.get<Blob>(
    `/api/students/${studentId}/corrections/${id}/export.docx`,
    { responseType: 'blob' },
  )
  const fallback = `${sanitizeFilename(filenameHint)}.docx`
  triggerBlobDownload(response, fallback)
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_.\s]/g, '').trim() || 'correccion'
}
