import { apiClient } from '../lib/apiClient'
import type { TeacherFollowup } from './followups'

export interface PendingTodo {
  id: string
  text: string
  createdAt: string
  sourceSessionLogId: string | null
  status: string
  coveredInSessionLogId: string | null
}

export interface NextSession {
  sessionLogId: string
  studentId: string
  studentName: string
  studentCefrLevel: string
  sessionDate: string
  plannedContent: string | null
  lastSessionNotes: string | null
  lastSessionDate: string | null
  homeworkAssigned: string | null
  previousHomeworkStatus: string | null
  lastSessionTopicTags: string[]
  lastSessionHomework: string | null
  lastSessionFollowups: string[]
}

export interface UpcomingSession {
  sessionLogId: string
  studentId: string
  studentName: string
  studentCefrLevel: string
  sessionDate: string
  plannedContent: string | null
}

export interface TodaySession {
  sessionLogId: string
  studentId: string
  studentName: string
  studentCefrLevel: string
  sessionDate: string
  plannedContent: string | null
  status: string
}

export interface ActiveStudent {
  studentId: string
  name: string
  cefrLevel: string
  nativeLanguages: string[]
  isActive: boolean
  lastSessionDate: string | null
  nextSessionDate: string | null
  totalSessions: number
  teachingTodosCount: number
  pendingTodos: PendingTodo[]
  cancelledSessionsLast30Days: number
  nearestObjectiveDeadline: string | null
  lastHomeworkStatus: string | null
}

export interface DashboardData {
  nextSession: NextSession | null
  todaySessions: TodaySession[]
  activeStudents: ActiveStudent[]
  pendingFollowups: TeacherFollowup[]
  upcomingThisWeek: UpcomingSession[]
}

export type { TeacherFollowup }

export async function getDashboard(): Promise<DashboardData> {
  const res = await apiClient.get<DashboardData>('/api/dashboard')
  return res.data
}
