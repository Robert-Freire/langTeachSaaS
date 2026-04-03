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
  previousHomeworkStatus: string
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
