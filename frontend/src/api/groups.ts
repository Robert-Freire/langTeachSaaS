import { apiClient } from '../lib/apiClient'
import type { CreateSessionLogRequest, SessionLog, ExtractedReflection } from './sessionLogs'

export interface GroupMemberSummary {
  id: string
  name: string
  cefrLevel: string | null
}

export interface GroupTeachingIdea {
  id: string
  text: string
  status: string
  createdAt: string
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
  teachingIdeas?: GroupTeachingIdea[] | null
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

export async function addGroupMember(groupId: string, studentId: string): Promise<Group> {
  const res = await apiClient.post<Group>(`/api/groups/${groupId}/members`, { studentId })
  return res.data
}

export async function removeGroupMember(groupId: string, studentId: string): Promise<Group> {
  const res = await apiClient.delete<Group>(`/api/groups/${groupId}/members/${studentId}`)
  return res.data
}

export async function appendGroupTeachingIdea(groupId: string, text: string): Promise<GroupTeachingIdea> {
  const res = await apiClient.post<GroupTeachingIdea>(`/api/groups/${groupId}/teaching-ideas`, { text })
  return res.data
}

export async function listGroupSessions(groupId: string): Promise<SessionLog[]> {
  const res = await apiClient.get<SessionLog[]>(`/api/groups/${groupId}/sessions`)
  return res.data
}

export async function getGroupSession(groupId: string, sessionId: string): Promise<SessionLog> {
  const res = await apiClient.get<SessionLog>(`/api/groups/${groupId}/sessions/${sessionId}`)
  return res.data
}

export async function createGroupSession(groupId: string, data: CreateSessionLogRequest): Promise<SessionLog> {
  const res = await apiClient.post<SessionLog>(`/api/groups/${groupId}/sessions`, data)
  return res.data
}

export async function updateGroupSession(groupId: string, sessionId: string, data: CreateSessionLogRequest): Promise<SessionLog> {
  const res = await apiClient.put<SessionLog>(`/api/groups/${groupId}/sessions/${sessionId}`, data)
  return res.data
}

export async function extractGroupSessionReflection(groupId: string, text: string): Promise<ExtractedReflection> {
  const res = await apiClient.post<ExtractedReflection>(`/api/groups/${groupId}/sessions/extract`, { text })
  return res.data
}
