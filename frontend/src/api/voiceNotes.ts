import { apiClient } from '../lib/apiClient'

export interface VoiceNote {
  id: string
  originalFileName: string
  contentType: string
  sizeBytes: number
  durationSeconds: number
  transcription: string | null
  transcribedAt: string | null
  createdAt: string
}

export async function uploadVoiceNote(file: File): Promise<VoiceNote> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await apiClient.post<VoiceNote>('/api/voice-notes', formData)
  return res.data
}

export async function getVoiceNote(id: string): Promise<VoiceNote> {
  const res = await apiClient.get<VoiceNote>(`/api/voice-notes/${id}`)
  return res.data
}

export async function updateVoiceNoteTranscription(id: string, transcription: string): Promise<VoiceNote> {
  const res = await apiClient.patch<VoiceNote>(`/api/voice-notes/${id}/transcription`, { transcription })
  return res.data
}
