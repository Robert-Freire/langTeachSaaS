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
}

export interface GroupListResponse {
  items: Group[]
  totalCount: number
  page: number
  pageSize: number
}

export interface CreateGroupPayload {
  name: string
  cefrLevel?: string | null
  description?: string | null
  isActive: boolean
}

export interface UpdateGroupPayload {
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

export async function createGroup(payload: CreateGroupPayload): Promise<Group> {
  const res = await apiClient.post<Group>('/api/groups', payload)
  return res.data
}

export async function updateGroup(id: string, payload: UpdateGroupPayload): Promise<Group> {
  const res = await apiClient.put<Group>(`/api/groups/${id}`, payload)
  return res.data
}

export async function deleteGroup(id: string): Promise<void> {
  await apiClient.delete(`/api/groups/${id}`)
}

export async function addGroupMember(groupId: string, studentId: string): Promise<Group> {
  const res = await apiClient.post<Group>(`/api/groups/${groupId}/members`, { studentId })
  return res.data
}

export async function removeGroupMember(groupId: string, studentId: string): Promise<Group> {
  const res = await apiClient.delete<Group>(`/api/groups/${groupId}/members/${studentId}`)
  return res.data
}
