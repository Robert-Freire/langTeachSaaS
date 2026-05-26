import { apiClient } from '../lib/apiClient'

export interface TopicTag {
  tag: string
  category?: string
}

export interface SessionLog {
  id: string
  studentId: string | null
  groupId: string | null
  targetType: 'student' | 'group'
  targetName: string
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

export function isSuggestedDifficulty(value: unknown): value is SuggestedDifficulty {
  return (
    !!value && typeof value === 'object' &&
    typeof (value as SuggestedDifficulty).description === 'string' &&
    typeof (value as SuggestedDifficulty).competency === 'string' &&
    typeof (value as SuggestedDifficulty).subcategory === 'string' &&
    typeof (value as SuggestedDifficulty).severity === 'string'
  )
}

export interface ExtractedTextField {
  value: string | null
  mode: 'append' | 'replace' | 'skip'
}

export interface ExtractedReflection {
  whatWasCovered: ExtractedTextField | null
  areasToImprove: ExtractedTextField | null
  emotionalSignals: string | null
  homeworkAssigned: ExtractedTextField | null
  nextSessionTopics: ExtractedTextField | null
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
  sessionStartTime?: string | null
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
  title?: string | null
  voiceNoteId?: string
  voiceNoteTranscription?: string
  rawExtractionJson?: string
}

export type UpdateSessionLogRequest = CreateSessionLogRequest

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

export async function getSession(studentId: string, sessionId: string): Promise<SessionLog> {
  const res = await apiClient.get<SessionLog>(`/api/students/${studentId}/sessions/${sessionId}`)
  return res.data
}

export async function listSessions(studentId: string): Promise<SessionLog[]> {
  const res = await apiClient.get<SessionLog[]>(`/api/students/${studentId}/sessions`)
  return res.data
}

export async function listSessionsIncludingGroups(studentId: string): Promise<SessionLog[]> {
  const res = await apiClient.get<SessionLog[]>(`/api/students/${studentId}/sessions`, {
    params: { includeGroups: true },
  })
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

function parseJsonArray<T>(json: string): T[] {
  try { return JSON.parse(json) as T[] } catch { return [] }
}

export async function patchSessionField(
  studentId: string,
  session: SessionLog,
  patch: Partial<Pick<UpdateSessionLogRequest, 'title' | 'actualContent' | 'duration' | 'nextSessionTopics'>>,
): Promise<SessionLog> {
  const payload: UpdateSessionLogRequest = {
    sessionDate: session.sessionDate,
    plannedContent: session.plannedContent,
    actualContent: session.actualContent,
    homeworkAssigned: session.homeworkAssigned,
    previousHomeworkStatus: session.previousHomeworkStatusName || 'NotApplicable',
    nextSessionTopics: session.nextSessionTopics,
    generalNotes: session.generalNotes,
    levelReassessmentSkill: session.levelReassessmentSkill,
    levelReassessmentLevel: session.levelReassessmentLevel,
    linkedLessonId: session.linkedLessonId,
    topicTags: session.topicTags,
    isCancelled: session.isCancelled,
    status: session.statusName,
    duration: session.duration,
    title: session.title,
    // Preserve AI-generated fields so the PUT does not silently clear them
    mentionedDifficultyPairs: parseJsonArray(session.mentionedDifficultyPairs),
    suggestedDifficulties: parseJsonArray(session.suggestedDifficulties),
    ...patch,
  }
  return updateSession(studentId, session.id, payload)
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
