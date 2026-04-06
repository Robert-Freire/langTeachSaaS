import { apiClient } from '../lib/apiClient'
import type { Difficulty } from './students'

export type { Difficulty as DifficultyProgress }

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
  difficulties: Difficulty[]
  timeline: TimelineEntry[]
}

export function getProgress(studentId: string): Promise<StudentProgress> {
  return apiClient.get<StudentProgress>(`/api/students/${studentId}/progress`).then(r => r.data)
}
