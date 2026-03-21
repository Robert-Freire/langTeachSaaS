import { apiClient } from '../lib/apiClient'

export type CourseMode = 'general' | 'exam-prep'
export type EntryStatus = 'planned' | 'created' | 'taught'

export interface CurriculumEntry {
  id: string
  orderIndex: number
  topic: string
  grammarFocus: string | null
  competencies: string
  lessonType: string | null
  lessonId: string | null
  status: EntryStatus
}

export interface Course {
  id: string
  name: string
  description: string | null
  language: string
  mode: CourseMode
  targetCefrLevel: string | null
  targetExam: string | null
  examDate: string | null
  sessionCount: number
  studentId: string | null
  studentName: string | null
  lessonsCreated: number
  createdAt: string
  updatedAt: string
  entries: CurriculumEntry[]
}

export interface CourseSummary {
  id: string
  name: string
  description: string | null
  language: string
  mode: CourseMode
  targetCefrLevel: string | null
  targetExam: string | null
  sessionCount: number
  studentId: string | null
  studentName: string | null
  lessonsCreated: number
  createdAt: string
}

export interface CreateCourseRequest {
  name: string
  description?: string
  language: string
  mode: CourseMode
  targetCefrLevel?: string
  targetExam?: string
  examDate?: string
  sessionCount: number
  studentId?: string
}

export interface UpdateCurriculumEntryRequest {
  topic: string
  grammarFocus?: string
  competencies?: string
  lessonType?: string
}

export async function getCourses(): Promise<CourseSummary[]> {
  const res = await apiClient.get<CourseSummary[]>('/api/courses')
  return res.data
}

export async function getCourse(id: string): Promise<Course> {
  const res = await apiClient.get<Course>(`/api/courses/${id}`)
  return res.data
}

export async function createCourse(request: CreateCourseRequest): Promise<Course> {
  const res = await apiClient.post<Course>('/api/courses', request)
  return res.data
}

export async function updateCourse(id: string, request: { name?: string; description?: string }): Promise<void> {
  await apiClient.put(`/api/courses/${id}`, request)
}

export async function deleteCourse(id: string): Promise<void> {
  await apiClient.delete(`/api/courses/${id}`)
}

export async function reorderCurriculum(courseId: string, orderedEntryIds: string[]): Promise<void> {
  await apiClient.put(`/api/courses/${courseId}/curriculum/reorder`, { orderedEntryIds })
}

export async function updateCurriculumEntry(
  courseId: string,
  entryId: string,
  request: UpdateCurriculumEntryRequest
): Promise<CurriculumEntry> {
  const res = await apiClient.put<CurriculumEntry>(`/api/courses/${courseId}/curriculum/${entryId}`, request)
  return res.data
}

export async function generateLessonFromEntry(courseId: string, entryId: string): Promise<{ lessonId: string }> {
  const res = await apiClient.post<{ lessonId: string }>(`/api/courses/${courseId}/curriculum/${entryId}/lesson`, {})
  return res.data
}
