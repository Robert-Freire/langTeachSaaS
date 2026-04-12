import { apiClient } from '../lib/apiClient'

export interface TeacherFollowup {
  id: string
  studentId: string | null
  studentName: string | null
  text: string
  status: 'pending' | 'done'
  createdAt: string
  dueDate: string | null
  completedAt: string | null
  sourceSessionLogId: string | null
}

export interface CreateFollowupRequest {
  text: string
  studentId?: string | null
  dueDate?: string | null
  sourceSessionLogId?: string | null
}

export async function getFollowups(studentId?: string): Promise<TeacherFollowup[]> {
  const params = studentId ? { studentId } : {}
  const res = await apiClient.get<TeacherFollowup[]>('/api/teacher-followups', { params })
  return res.data
}

export async function createFollowup(data: CreateFollowupRequest): Promise<TeacherFollowup> {
  const res = await apiClient.post<TeacherFollowup>('/api/teacher-followups', data)
  return res.data
}

export async function updateFollowupStatus(id: string, status: 'pending' | 'done'): Promise<TeacherFollowup> {
  const res = await apiClient.patch<TeacherFollowup>(`/api/teacher-followups/${id}`, { status })
  return res.data
}

export async function deleteFollowup(id: string): Promise<void> {
  await apiClient.delete(`/api/teacher-followups/${id}`)
}
