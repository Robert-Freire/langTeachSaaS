import { apiClient } from '../lib/apiClient'

export interface GroupMemberSummary {
  id: string
  name: string
  cefrLevel: string | null
}

export interface Group {
  id: string
  teacherId: string
  name: string
  cefrLevel: string | null
  description: string | null
  memberCount: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  members: GroupMemberSummary[] | null
  memberPreview: GroupMemberSummary[] | null
  lastSessionDate: string | null
  nextSessionDate: string | null
  teachingNotes: string | null
}

export interface GroupListResponse {
  items: Group[]
  totalCount: number
  page: number
  pageSize: number
}

export interface GroupFormData {
  name: string
  cefrLevel?: string | null
  description?: string | null
  isActive: boolean
}

export async function getGroups(params?: {
  search?: string
  cefrLevel?: string
  includeInactive?: boolean
  page?: number
  pageSize?: number
}): Promise<GroupListResponse> {
  const res = await apiClient.get<GroupListResponse>('/api/groups', { params })
  return res.data
}

export async function getGroup(id: string): Promise<Group> {
  const res = await apiClient.get<Group>(`/api/groups/${id}`)
  return res.data
}

export async function createGroup(payload: GroupFormData): Promise<Group> {
  const res = await apiClient.post<Group>('/api/groups', payload)
  return res.data
}

export async function updateGroup(id: string, payload: GroupFormData): Promise<Group> {
  const res = await apiClient.put<Group>(`/api/groups/${id}`, payload)
  return res.data
}

export async function deleteGroup(id: string): Promise<void> {
  await apiClient.delete(`/api/groups/${id}`)
}

export async function updateGroupTeachingNotes(id: string, teachingNotes: string | null): Promise<Group> {
  const res = await apiClient.patch<Group>(`/api/groups/${id}/teaching-notes`, { teachingNotes })
  return res.data
}


export async function addGroupMember(groupId: string, studentId: string): Promise<Group> {
  const res = await apiClient.post<Group>(`/api/groups/${groupId}/members`, { studentId })
  return res.data
}

export async function removeGroupMember(groupId: string, studentId: string): Promise<Group> {
  const res = await apiClient.delete<Group>(`/api/groups/${groupId}/members/${studentId}`)
  return res.data
}

export interface GroupSession {
  id: string
  groupId: string | null
  sessionDate: string | null
  title: string | null
  plannedContent: string | null
  actualContent: string | null
  generalNotes: string | null
  isCancelled: boolean
  status: number
  statusName: 'Draft' | 'Confirmed'
  createdAt: string
  updatedAt: string
  duration: number | null
}

export async function getGroupSessions(groupId: string): Promise<GroupSession[]> {
  const res = await apiClient.get<GroupSession[]>(`/api/groups/${groupId}/sessions`)
  return res.data
}

export interface CreateGroupSessionRequest {
  sessionDate?: string | null
  title?: string | null
  plannedContent?: string | null
  actualContent?: string | null
  generalNotes?: string | null
  duration?: number | null
  status?: 'Draft' | 'Confirmed'
  previousHomeworkStatus?: string
}

export async function createGroupSession(groupId: string, data: CreateGroupSessionRequest): Promise<GroupSession> {
  const res = await apiClient.post<GroupSession>(`/api/groups/${groupId}/sessions`, {
    ...data,
    previousHomeworkStatus: data.previousHomeworkStatus ?? 'NotApplicable',
  })
  return res.data
}
