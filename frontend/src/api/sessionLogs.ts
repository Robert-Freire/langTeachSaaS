import { apiClient } from '../lib/apiClient'

export interface TopicTag {
  tag: string
  category?: string
}

export interface SessionLog {
  id: string
  studentId: string
  sessionDate: string
  plannedContent: string | null
  actualContent: string | null
  homeworkAssigned: string | null
  previousHomeworkStatus: number
  previousHomeworkStatusName: string
  nextSessionTopics: string | null
  generalNotes: string | null
  levelReassessmentSkill: string | null
  levelReassessmentLevel: string | null
  linkedLessonId: string | null
  topicTags: string
  createdAt: string
  updatedAt: string
}

export interface CreateSessionLogRequest {
  sessionDate: string
  plannedContent?: string | null
  actualContent?: string | null
  homeworkAssigned?: string | null
  previousHomeworkStatus: string
  nextSessionTopics?: string | null
  generalNotes?: string | null
  levelReassessmentSkill?: string | null
  levelReassessmentLevel?: string | null
  linkedLessonId?: string | null
  topicTags?: string | null
}

export interface StudentSessionSummary {
  totalSessions: number
  lastSessionDate: string | null
  daysSinceLastSession: number | null
  openActionItems: string[]
  levelReassessmentPending: boolean
  skillLevelOverrides: Record<string, string>
}

export async function getSessionSummary(studentId: string): Promise<StudentSessionSummary> {
  const res = await apiClient.get<StudentSessionSummary>(`/api/students/${studentId}/sessions/summary`)
  return res.data
}

export function parseTopicTags(raw: string): TopicTag[] {
  try {
    return JSON.parse(raw) as TopicTag[]
  } catch {
    return []
  }
}

export function serializeTopicTags(tags: TopicTag[]): string {
  return JSON.stringify(tags)
}

export async function listSessions(studentId: string): Promise<SessionLog[]> {
  const res = await apiClient.get<SessionLog[]>(`/api/students/${studentId}/sessions`)
  return res.data
}

export async function createSession(
  studentId: string,
  data: CreateSessionLogRequest,
): Promise<SessionLog> {
  const res = await apiClient.post<SessionLog>(`/api/students/${studentId}/sessions`, data)
  return res.data
}

export async function deleteSession(studentId: string, sessionId: string): Promise<void> {
  await apiClient.delete(`/api/students/${studentId}/sessions/${sessionId}`)
}
