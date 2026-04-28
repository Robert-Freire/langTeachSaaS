import { apiClient } from '../lib/apiClient'

export interface ProposalDto {
  id: string
  type: 'student' | 'session' | 'todo'
  field: string
  label: string
  oldValue: string | null
  newValue: string
}

export interface ProposeResponse {
  proposals: ProposalDto[]
}

export async function proposeAssistant(
  text: string,
  studentId?: string,
  sessionId?: string,
): Promise<ProposeResponse> {
  const res = await apiClient.post<ProposeResponse>('/api/assistant/propose', {
    text,
    studentId: studentId ?? null,
    sessionId: sessionId ?? null,
  })
  return res.data
}

export async function applyStudentProposal(
  studentId: string,
  field: string,
  value: string,
): Promise<void> {
  await apiClient.patch(`/api/students/${studentId}`, { [field]: value })
}

export async function applySessionProposal(
  studentId: string,
  sessionId: string,
  field: string,
  value: string,
): Promise<void> {
  await apiClient.patch(`/api/students/${studentId}/sessions/${sessionId}`, { [field]: value })
}

export async function applyTodoProposal(
  studentId: string,
  text: string,
): Promise<void> {
  await apiClient.post(`/api/students/${studentId}/teaching-todos`, { text })
}
