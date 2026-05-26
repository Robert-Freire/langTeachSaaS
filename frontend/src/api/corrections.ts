import { apiClient } from '../lib/apiClient'
import { triggerBlobDownload } from '../lib/downloadBlob'

export type CorrectionStatus = 'Pendiente' | 'Entregada' | 'Encolada' | 'Corrigiendo' | 'Corregida' | 'CorreccionFallida'
export type CorrectionTagCategory = 'C' | 'G' | 'L' | 'O' | 'MuyBien'

export interface CorrectionSummary {
  id: string
  assignmentTitle: string
  status: CorrectionStatus
  createdAt: string
  correctedAt: string | null
}

export type CorrectionTagFilterStatus = 'kept' | 'removed'

export interface CorrectionTag {
  category: CorrectionTagCategory
  spannedText: string
  startIndex: number
  endIndex: number
  explanation: string | null
  correctedForm: string | null
  orderIndex: number
  // 'kept' = in-level (shown in both views); 'removed' = above the student's level
  // (hidden from the student default view, shown only in the teacher all-errors view).
  filterStatus: CorrectionTagFilterStatus
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
  sourceImageUrl?: string | null
}

export interface OcrResult {
  text: string
  blobUrl: string
  incomplete: boolean
}

export interface CreateCorrectionRequest {
  assignmentTitle?: string | null
  assignmentPrompt?: string | null
  studentText?: string | null
  sourceImageUrl?: string | null
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
  view: 'student' | 'teacher' = 'student',
): Promise<void> {
  const query = view === 'teacher' ? '?view=teacher' : ''
  const response = await apiClient.get<Blob>(
    `/api/students/${studentId}/corrections/${id}/export.docx${query}`,
    { responseType: 'blob' },
  )
  const suffix = view === 'teacher' ? '-completa' : ''
  const fallback = `${sanitizeFilename(filenameHint)}${suffix}.docx`
  triggerBlobDownload(response, fallback)
}

export interface CorrectionFeedbackRequest {
  rating: 'up' | 'down'
  reason?: string | null
}

export async function submitCorrectionFeedback(
  studentId: string,
  correctionId: string,
  body: CorrectionFeedbackRequest,
): Promise<void> {
  await apiClient.post(`/api/students/${studentId}/corrections/${correctionId}/feedback`, body)
}

export async function uploadForExtractText(file: File): Promise<OcrResult> {
  const form = new FormData()
  form.append('file', file)
  const res = await apiClient.post<OcrResult>('/api/corrections/extract-text', form)
  return res.data
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_.\s]/g, '').trim() || 'correccion'
}
