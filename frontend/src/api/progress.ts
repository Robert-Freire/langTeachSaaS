import { apiClient } from '../lib/apiClient'

export interface DifficultyProgress {
  id: string
  description: string
  competency: string
  subcategory: string
  severity: string
  status: 'Active' | 'Covered'
  trend: 'improving' | 'stable' | 'worsening'
}

export interface TimelineEntry {
  orderIndex: number
  topic: string
  grammarFocus: string | null
  status: 'planned' | 'created' | 'taught'
  sessionDate: string | null
}

export type PacingStatus = 'on-track' | 'ahead' | 'behind' | 'unknown'

export interface StudentProgress {
  studentName: string
  courseName: string | null
  courseId: string | null
  totalEntries: number
  taughtEntries: number
  createdEntries: number
  plannedEntries: number
  plannedSessionCount: number | null
  sessionsDone: number
  examDate: string | null
  pacingStatus: PacingStatus
  daysUntilExam: number | null
  sessionsRemaining: number | null
  difficulties: DifficultyProgress[]
  timeline: TimelineEntry[]
}

export function getProgress(studentId: string): Promise<StudentProgress> {
  return apiClient(`/students/${studentId}/progress`)
}
