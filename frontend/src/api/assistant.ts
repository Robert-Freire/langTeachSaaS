import { apiClient } from '../lib/apiClient'

export interface NewStudentData {
  name: string
  birthYear?: number | null
  profession?: string | null
  cityOfResidence?: string | null
  nativeLanguages?: string[]
  learningLanguage?: string | null
  cefrLevel?: string | null
  reasonForStudying?: string | null
}

export interface NewSessionData {
  title: string
  sessionDate: string
}

export interface ProposalDto {
  id: string
  type: 'student' | 'session' | 'todo' | 'newStudent' | 'newSession'
  field: string
  label: string
  oldValue: string | null
  newValue: string
  payload?: NewStudentData | NewSessionData | null
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
  // field is one of: cefrLevel, profession, countryOfResidence — matches PatchStudentRequest
  await apiClient.patch(`/api/students/${studentId}`, { [field]: value })
}

export async function applySessionProposal(
  studentId: string,
  sessionId: string,
  field: string,
  value: string,
): Promise<void> {
  // field is one of: title, actualContent, generalNotes, homeworkAssigned — matches PatchSessionRequest
  await apiClient.patch(`/api/students/${studentId}/sessions/${sessionId}`, { [field]: value })
}

export async function applyTodoProposal(
  studentId: string,
  text: string,
): Promise<void> {
  await apiClient.post(`/api/students/${studentId}/teaching-todos`, { text })
}

export async function applyNewSessionProposal(
  studentId: string,
  title: string,
  sessionDate: string,
): Promise<void> {
  await apiClient.post(`/api/students/${studentId}/sessions`, {
    title,
    sessionDate,
    previousHomeworkStatus: 'NotApplicable',
  })
}
