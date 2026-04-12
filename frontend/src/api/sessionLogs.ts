import { apiClient } from '../lib/apiClient'

export interface TopicTag {
  tag: string
  category?: string
}

export interface SessionLog {
  id: string
  studentId: string
  sessionDate: string | null
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
  isCancelled: boolean
  status: number
  statusName: 'Draft' | 'Confirmed'
  mentionedDifficultyPairs: string
  suggestedDifficulties: string
  duration: number | null
  title: string | null
  hasVoiceNote: boolean
}

export interface SuggestedDifficulty {
  description: string
  competency: string
  subcategory: string
  severity: string
}

export interface ExtractedReflection {
  whatWasCovered: string | null
  areasToImprove: string | null
  emotionalSignals: string | null
  homeworkAssigned: string | null
  nextLessonIdeas: string | null
  sessionDate?: string | null
  sessionTitle?: string | null
  suggestedDifficulties: SuggestedDifficulty[]
  rawExtractionJson?: string | null
  topicTags?: TopicTag[] | null
  previousHomeworkStatus?: string | null
  teachingTodos?: string[] | null
  teacherFollowups?: string[] | null
  levelReassessment?: string | null
  durationMinutes?: number | null
  isCancelled?: boolean | null
  difficultiesWorkedOn?: string[] | null
}

export interface CreateSessionLogRequest {
  sessionDate?: string | null
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
  isCancelled?: boolean
  status?: 'Draft' | 'Confirmed'
  mentionedDifficultyPairs?: { Competency: string; Subcategory: string }[]
  suggestedDifficulties?: SuggestedDifficulty[]
  duration?: number | null
  voiceNoteId?: string
  voiceNoteTranscription?: string
  rawExtractionJson?: string
}

export type UpdateSessionLogRequest = CreateSessionLogRequest

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
    const parsed: unknown[] = JSON.parse(raw) as unknown[]
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((item): TopicTag[] => {
      if (typeof item === 'string') {
        const tag = item.trim()
        return tag ? [{ tag }] : []
      }
      if (item && typeof item === 'object' && 'tag' in item) {
        const maybeTag = (item as { tag?: unknown }).tag
        if (typeof maybeTag !== 'string' || maybeTag.trim() === '') return []
        const maybeCategory = (item as { category?: unknown }).category
        return [{ tag: maybeTag.trim(), ...(typeof maybeCategory === 'string' ? { category: maybeCategory } : {}) }]
      }
      return []
    })
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

export async function updateSession(
  studentId: string,
  sessionId: string,
  data: UpdateSessionLogRequest,
): Promise<SessionLog> {
  const res = await apiClient.put<SessionLog>(
    `/api/students/${studentId}/sessions/${sessionId}`,
    data,
  )
  return res.data
}

export async function deleteSession(studentId: string, sessionId: string): Promise<void> {
  await apiClient.delete(`/api/students/${studentId}/sessions/${sessionId}`)
}

export async function extractSessionReflection(
  studentId: string,
  text: string,
): Promise<ExtractedReflection> {
  const res = await apiClient.post<ExtractedReflection>(
    `/api/students/${studentId}/sessions/extract`,
    { text },
  )
  return res.data
}
