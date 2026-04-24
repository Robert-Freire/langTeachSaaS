import { apiClient } from '../lib/apiClient'

export interface StudentWeaknessItem {
  description: string
  weaknessType: 'grammatical' | 'lexical' | 'orthographic'
}

export interface Difficulty {
  id: string
  description: string
  competency: string
  subcategory: string
  severity: string
  trend: string
  status: string
}

export type ObjectiveType = 'exam_prep' | 'communicative' | 'other'

export interface ShortTermObjective {
  id: string
  text: string
  targetDate: string | null
  objectiveType: ObjectiveType
}

export interface LearningGoalItem {
  id: string
  text: string
  children: LearningGoalItem[]
}

export interface TeachingTodo {
  id: string
  text: string
  createdAt: string
  sourceSessionLogId: string | null
  status: string
  coveredInSessionLogId: string | null
}

export interface StudentLevel {
  cefrLevel: string
  officialCefrLevel: string | null
  skillLevelOverrides: Record<string, string>
}

export interface StudentLanguages {
  nativeLanguages: string[]
  spokenLanguages: string[]
}

export interface StudentIdentity {
  birthYear: number | null
  age: number | null
  profession: string | null
  countryOfOrigin: string | null
  cityOfOrigin: string | null
  countryOfResidence: string | null
  cityOfResidence: string | null
}

export interface StudentProfile {
  interests: string[]
  personalNotes: string | null
  teachingNotes: string | null
  learningGoals: LearningGoalItem[]
  weaknesses: StudentWeaknessItem[]
  difficulties: Difficulty[]
  shortTermObjectives: ShortTermObjective[]
  teachingTodos: TeachingTodo[]
  reasonForStudying: string | null
}

export interface StudentCommercial {
  isActive: boolean
  isCorporate: boolean
  rate: string | null
}

export interface Student {
  id: string
  name: string
  learningLanguage: string
  level: StudentLevel
  languages: StudentLanguages
  identity: StudentIdentity
  profile: StudentProfile
  commercial: StudentCommercial
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
  personalNotes?: string | null
  teachingNotes?: string | null
  nativeLanguages?: string[]
  learningGoals: LearningGoalItem[]
  weaknesses: StudentWeaknessItem[]
  difficulties: Difficulty[]
  birthYear?: number | null
  profession?: string | null
  countryOfOrigin?: string | null
  cityOfOrigin?: string | null
  countryOfResidence?: string | null
  cityOfResidence?: string | null
  reasonForStudying?: string | null
  officialCefrLevel?: string | null
  shortTermObjectives?: ShortTermObjective[]
  isActive?: boolean
  isCorporate?: boolean
  rate?: string | null
  spokenLanguages?: string[]
  teachingTodos?: TeachingTodo[]
  skillLevelOverrides?: Record<string, string>
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
  emotionalSignals: string | null
  followingSessionHomeworkStatus: number | null
  followingSessionHomeworkStatusName: string | null
}

export async function getLessonHistory(studentId: string): Promise<LessonHistoryEntry[]> {
  const res = await apiClient.get<LessonHistoryEntry[]>(`/api/students/${studentId}/lesson-history`)
  return res.data
}

export async function appendTeachingTodo(studentId: string, text: string): Promise<Student> {
  const res = await apiClient.post<Student>(`/api/students/${studentId}/teaching-todos`, { text })
  return res.data
}

export async function updateTeachingTodo(
  studentId: string,
  todoId: string,
  update: { status: string; text?: string; coveredInSessionLogId?: string | null }
): Promise<Student> {
  const res = await apiClient.patch<Student>(`/api/students/${studentId}/teaching-todos/${todoId}`, update)
  return res.data
}

export async function deleteTeachingTodo(studentId: string, todoId: string): Promise<Student> {
  const res = await apiClient.delete<Student>(`/api/students/${studentId}/teaching-todos/${todoId}`)
  return res.data
}
