import { apiClient } from '../lib/apiClient'

export interface SessionListItem {
  sessionLogId: string
  studentId: string
  studentName: string
  studentCefrLevel: string
  sessionDate: string
  plannedContent: string | null
  status: string
}

export interface SessionFilterStudent {
  studentId: string
  name: string
  cefrLevel: string
}

export interface SessionsListData {
  upcoming: SessionListItem[]
  today: SessionListItem[]
  recent: SessionListItem[]
  students: SessionFilterStudent[]
}

export async function getSessionsList(studentId?: string): Promise<SessionsListData> {
  const params = studentId ? { studentId } : {}
  const res = await apiClient.get<SessionsListData>('/api/dashboard/sessions', { params })
  return res.data
}
