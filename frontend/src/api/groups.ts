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
