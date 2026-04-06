import { apiClient } from '../lib/apiClient'

export type SuggestionStatus = 'pending' | 'accepted' | 'dismissed'

export interface CourseSuggestion {
  id: string
  courseId: string
  curriculumEntryId: string | null
  curriculumEntryTopic: string | null
  curriculumEntryOrderIndex: number | null
  proposedChange: string
  reasoning: string
  status: SuggestionStatus
  teacherEdit: string | null
  generatedAt: string
  respondedAt: string | null
}

export interface RespondToSuggestionRequest {
  action: 'accept' | 'dismiss'
  teacherEdit?: string
}

export async function generateSuggestions(courseId: string): Promise<CourseSuggestion[]> {
  const res = await apiClient.post<CourseSuggestion[]>(`/api/courses/${courseId}/suggestions/generate`)
  return res.data
}

export async function getSuggestions(courseId: string): Promise<CourseSuggestion[]> {
  const res = await apiClient.get<CourseSuggestion[]>(`/api/courses/${courseId}/suggestions`)
  return res.data
}

export async function respondToSuggestion(
  courseId: string,
  suggestionId: string,
  req: RespondToSuggestionRequest,
): Promise<CourseSuggestion> {
  const res = await apiClient.post<CourseSuggestion>(
    `/api/courses/${courseId}/suggestions/${suggestionId}/respond`,
    req,
  )
  return res.data
}
