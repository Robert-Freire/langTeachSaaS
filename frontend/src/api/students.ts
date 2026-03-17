import { apiClient } from '../lib/apiClient'

export interface Student {
  id: string
  name: string
  learningLanguage: string
  cefrLevel: string
  interests: string[]
  notes: string | null
  nativeLanguage: string | null
  learningGoals: string[]
  weaknesses: string[]
  createdAt: string
  updatedAt: string
}

export interface StudentListResponse {
  items: Student[]
  totalCount: number
  page: number
  pageSize: number
}

export interface StudentFormData {
  name: string
  learningLanguage: string
  cefrLevel: string
  interests: string[]
  notes?: string | null
  nativeLanguage?: string | null
  learningGoals: string[]
  weaknesses: string[]
}

export async function getStudents(params?: {
  language?: string
  cefrLevel?: string
  page?: number
  pageSize?: number
}): Promise<StudentListResponse> {
  const res = await apiClient.get<StudentListResponse>('/api/students', { params })
  return res.data
}

export async function getStudent(id: string): Promise<Student> {
  const res = await apiClient.get<Student>(`/api/students/${id}`)
  return res.data
}

export async function createStudent(data: StudentFormData): Promise<Student> {
  const res = await apiClient.post<Student>('/api/students', data)
  return res.data
}

export async function updateStudent(id: string, data: StudentFormData): Promise<Student> {
  const res = await apiClient.put<Student>(`/api/students/${id}`, data)
  return res.data
}

export async function deleteStudent(id: string): Promise<void> {
  await apiClient.delete(`/api/students/${id}`)
}

export interface LessonHistoryEntry {
  lessonId: string
  title: string
  templateName: string | null
  lessonDate: string
  whatWasCovered: string | null
  homeworkAssigned: string | null
  areasToImprove: string | null
  nextLessonIdeas: string | null
}

export async function getLessonHistory(studentId: string): Promise<LessonHistoryEntry[]> {
  const res = await apiClient.get<LessonHistoryEntry[]>(`/api/students/${studentId}/lesson-history`)
  return res.data
}
