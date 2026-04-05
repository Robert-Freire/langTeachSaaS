import { apiClient } from '../lib/apiClient'
import type { ContentBlockType } from '../types/contentTypes'
import type { Material } from './materials'

export type LessonStatus = 'Draft' | 'Published'
export type SectionType = 'WarmUp' | 'Presentation' | 'Practice' | 'Production' | 'WrapUp'

export interface LessonSection {
  id: string
  sectionType: SectionType
  orderIndex: number
  notes: string | null
  materials: Material[]
}

export interface Lesson {
  id: string
  title: string
  language: string
  cefrLevel: string
  topic: string
  durationMinutes: number
  objectives: string | null
  status: LessonStatus
  studentId: string | null
  templateId: string | null
  templateName?: string | null
  sections: LessonSection[]
  createdAt: string
  updatedAt: string
  scheduledAt: string | null
  studentName: string | null
  learningTargets?: string[] | null
}

export interface LessonListResponse {
  items: Lesson[]
  totalCount: number
  page: number
  pageSize: number
}

export interface LessonTemplate {
  id: string
  name: string
  description: string
}

export interface CreateLessonRequest {
  title: string
  language: string
  cefrLevel: string
  topic: string
  durationMinutes: number
  objectives?: string | null
  templateId?: string | null
  studentId?: string | null
  scheduledAt?: string | null
  courseId?: string
  courseEntryId?: string
}

export interface UpdateLessonRequest {
  title: string
  language: string
  cefrLevel: string
  topic: string
  durationMinutes?: number | null
  objectives?: string | null
  status?: LessonStatus | null
  studentId?: string | null
  scheduledAt?: string | null
}

export interface SectionInput {
  sectionType: SectionType
  orderIndex: number
  notes?: string | null
}

export interface LessonListQuery {
  language?: string
  cefrLevel?: string
  status?: string
  search?: string
  page?: number
  pageSize?: number
  scheduledFrom?: string
  scheduledTo?: string
}

export async function getLessons(query?: LessonListQuery): Promise<LessonListResponse> {
  const res = await apiClient.get<LessonListResponse>('/api/lessons', { params: query })
  return res.data
}

export async function getLesson(id: string): Promise<Lesson> {
  const res = await apiClient.get<Lesson>(`/api/lessons/${id}`)
  return res.data
}

export async function createLesson(data: CreateLessonRequest): Promise<Lesson> {
  const res = await apiClient.post<Lesson>('/api/lessons', data)
  return res.data
}

export async function updateLesson(id: string, data: UpdateLessonRequest): Promise<Lesson> {
  const res = await apiClient.put<Lesson>(`/api/lessons/${id}`, data)
  return res.data
}

export async function updateSections(id: string, sections: SectionInput[]): Promise<Lesson> {
  const res = await apiClient.put<Lesson>(`/api/lessons/${id}/sections`, { sections })
  return res.data
}

export async function deleteLesson(id: string): Promise<void> {
  await apiClient.delete(`/api/lessons/${id}`)
}

export async function duplicateLesson(id: string): Promise<Lesson> {
  const res = await apiClient.post<Lesson>(`/api/lessons/${id}/duplicate`)
  return res.data
}

export async function getLessonTemplates(): Promise<LessonTemplate[]> {
  const res = await apiClient.get<LessonTemplate[]>('/api/lesson-templates')
  return res.data
}

export interface StudyBlockDto {
  id: string
  blockType: ContentBlockType
  parsedContent: unknown | null
  displayContent: string
}

export interface StudySectionDto {
  id: string
  sectionType: string
  orderIndex: number
  notes: string | null
  blocks: StudyBlockDto[]
}

export interface StudyLessonDto {
  id: string
  title: string
  language: string
  cefrLevel: string
  topic: string
  sections: StudySectionDto[]
  learningTargets?: string[] | null
}

export interface LessonNotesDto {
  id: string
  lessonId: string
  whatWasCovered: string | null
  homeworkAssigned: string | null
  areasToImprove: string | null
  nextLessonIdeas: string | null
  emotionalSignals: string | null
}

export interface SaveLessonNotesRequest {
  whatWasCovered?: string | null
  homeworkAssigned?: string | null
  areasToImprove?: string | null
  nextLessonIdeas?: string | null
  emotionalSignals?: string | null
}

export interface ExtractedReflection {
  whatWasCovered: string | null
  areasToImprove: string | null
  emotionalSignals: string | null
  homeworkAssigned: string | null
  nextLessonIdeas: string | null
}

export async function getLessonNotes(lessonId: string): Promise<LessonNotesDto | null> {
  const res = await apiClient.get(`/api/lessons/${lessonId}/notes`)
  if (res.status === 204 || !res.data) return null
  return res.data as LessonNotesDto
}

export async function saveLessonNotes(lessonId: string, data: SaveLessonNotesRequest): Promise<LessonNotesDto> {
  const res = await apiClient.put<LessonNotesDto>(`/api/lessons/${lessonId}/notes`, data)
  return res.data
}

export async function extractReflectionNotes(lessonId: string, text: string): Promise<ExtractedReflection> {
  const res = await apiClient.post<ExtractedReflection>(`/api/lessons/${lessonId}/notes/extract`, { text })
  return res.data
}

export async function getStudyLesson(id: string): Promise<StudyLessonDto> {
  const res = await apiClient.get<StudyLessonDto>(`/api/lessons/${id}/study`)
  return res.data
}

export function updateLearningTargets(lessonId: string, labels: string[]): Promise<Lesson> {
  return apiClient.put<Lesson>(`/api/lessons/${lessonId}/learning-targets`, { learningTargets: labels }).then(r => r.data)
}
