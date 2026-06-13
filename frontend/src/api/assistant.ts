import { apiClient } from '../lib/apiClient'
import { createSession } from './sessionLogs'

export interface NewStudentData {
  name: string
  birthYear?: number | null
  profession?: string | null
  cityOfResidence?: string | null
  countryOfResidence?: string | null
  nativeLanguages?: string[]
  learningLanguage?: string | null
  cefrLevel?: string | null
  reasonForStudying?: string | null
}

export interface GroupCandidate {
  id: string
  name: string
  cefrLevel?: string | null
}

export interface AdminCallout {
  memberName: string
  rawText: string
}

export interface NewSessionData {
  title: string
  sessionDate: string
  // Group targeting fields (present when session targets a group)
  groupId?: string
  groupName?: string
  cefrLevel?: string | null
  requiresConfirmation?: boolean
  candidates?: GroupCandidate[]
  rawGroupMention?: string
  adminCallout?: AdminCallout | null
}

export interface ProposalDto {
  id: string
  type: 'student' | 'session' | 'todo' | 'newStudent' | 'newSession'
  field: string
  label: string
  oldValue: string | null
  newValue: string
  action?: 'replace' | 'append'
  payload?: NewSessionData | Record<string, unknown> | null
  newStudentPayload?: NewStudentData | null
}

export interface ProposeResponse {
  proposals: ProposalDto[]
  voiceNoteId?: string
  sessionLogId?: string
  extractedSessionDate?: string
}

export async function proposeAssistant(
  text: string,
  studentId?: string,
  sessionId?: string,
  voiceNoteId?: string,
  groupId?: string | null,
): Promise<ProposeResponse> {
  const res = await apiClient.post<ProposeResponse>('/api/assistant/propose', {
    text,
    studentId: studentId ?? null,
    sessionLogId: sessionId ?? null,
    voiceNoteId: voiceNoteId ?? null,
    groupId: groupId ?? null,
  })
  return res.data
}

export async function submitVoiceFeedback(
  voiceNoteId: string,
  rating: 'up' | 'down',
  reason: string | undefined,
  studentId: string | null | undefined,
  sessionLogId: string | null | undefined,
  proposalsJson: string,
): Promise<void> {
  await apiClient.post(`/api/assistant/voice-notes/${voiceNoteId}/feedback`, {
    rating,
    reason: reason ?? null,
    studentId: studentId ?? null,
    sessionLogId: sessionLogId ?? null,
    proposalsJson,
  })
}

export async function applyStudentProposal(
  studentId: string,
  field: string,
  value: string,
): Promise<void> {
  if (field.startsWith('skillLevel.')) {
    const subKey = field.split('.')[1]
    const patchField = 'skillLevel' + subKey.charAt(0).toUpperCase() + subKey.slice(1)
    await apiClient.patch(`/api/students/${studentId}`, { [patchField]: value })
  } else {
    await apiClient.patch(`/api/students/${studentId}`, { [field]: value })
  }
}

export async function applyStudentProposalAppend(
  studentId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await apiClient.patch(`/api/students/${studentId}/profile`, payload)
}

export async function applySessionProposal(
  studentId: string,
  sessionId: string,
  field: string,
  value: string,
): Promise<void> {
  let patchValue: string | number = value
  if (field === 'duration') {
    const parsed = parseInt(value, 10)
    if (isNaN(parsed)) return
    patchValue = parsed
  }
  await apiClient.patch(`/api/students/${studentId}/sessions/${sessionId}`, { [field]: patchValue })
}

export async function applyGroupSessionProposal(
  groupId: string,
  sessionId: string,
  field: string,
  value: string,
): Promise<void> {
  let patchValue: string | number = value
  if (field === 'duration') {
    const parsed = parseInt(value, 10)
    if (isNaN(parsed)) return
    patchValue = parsed
  }
  await apiClient.patch(`/api/groups/${groupId}/sessions/${sessionId}`, { [field]: patchValue })
}

export async function applyTodoProposal(
  studentId: string,
  text: string,
): Promise<void> {
  await apiClient.post(`/api/students/${studentId}/teaching-todos`, { text, dueDate: null })
}

export async function applyNewSessionProposal(
  studentId: string,
  title: string,
  sessionDate: string,
): Promise<void> {
  await createSession(studentId, { title, sessionDate, previousHomeworkStatus: 'NotApplicable' })
}
