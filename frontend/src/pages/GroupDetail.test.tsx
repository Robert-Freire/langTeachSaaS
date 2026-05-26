import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import GroupDetail from './GroupDetail'
import type { Group } from '@/api/groups'
import * as groupsApi from '@/api/groups'
import * as followupsApi from '@/api/followups'

vi.mock('@/api/groups', () => ({
  getGroup: vi.fn(),
  getGroupSessions: vi.fn().mockResolvedValue([]),
  updateGroupTeachingNotes: vi.fn(),
  addGroupMember: vi.fn(),
  removeGroupMember: vi.fn(),
}))

vi.mock('@/api/followups', () => ({
  getFollowups: vi.fn().mockResolvedValue([]),
  createFollowup: vi.fn(),
  updateFollowupStatus: vi.fn(),
  deleteFollowup: vi.fn(),
}))

const GROUP_ID = 'group-abc'

const mockGroup: Group = {
  id: GROUP_ID,
  teacherId: 'teacher-1',
  name: 'B1.1 Lunes',
  cefrLevel: 'B1',
  description: 'Lunes 19:00 in Cascais',
  memberCount: 3,
  isActive: true,
  createdAt: '2026-02-01T00:00:00Z',
  updatedAt: '2026-05-23T00:00:00Z',
  members: [
    { id: 's1', name: 'Ana García', cefrLevel: 'B1' },
    { id: 's2', name: 'Marco Bianchi', cefrLevel: 'A2' },
    { id: 's3', name: 'Sophie Dupont', cefrLevel: 'B1' },
  ],
  memberPreview: [
    { id: 's1', name: 'Ana García', cefrLevel: 'B1' },
    { id: 's2', name: 'Marco Bianchi', cefrLevel: 'A2' },
  ],
  lastSessionDate: null,
  nextSessionDate: null,
  teachingNotes: null,
}

function renderGroupDetail() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/groups/${GROUP_ID}`]}>
        <Routes>
          <Route path="/groups/:id" element={<GroupDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('GroupDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(groupsApi.getGroup).mockResolvedValue(mockGroup)
    vi.mocked(groupsApi.getGroupSessions).mockResolvedValue([])
    vi.mocked(followupsApi.getFollowups).mockResolvedValue([])
  })

  it('shows loading spinner before data loads', () => {
    vi.mocked(groupsApi.getGroup).mockReturnValue(new Promise(() => {}))
    renderGroupDetail()
    expect(screen.getByTestId('group-detail-loading')).toBeInTheDocument()
  })

  it('renders group name and tabs after data loads', async () => {
    renderGroupDetail()
    expect(await screen.findByTestId('group-detail-page')).toBeInTheDocument()
    expect(screen.getByTestId('group-name')).toHaveTextContent('B1.1 Lunes')
    expect(screen.getByTestId('tab-overview')).toBeInTheDocument()
    expect(screen.getByTestId('tab-members')).toBeInTheDocument()
    expect(screen.getByTestId('tab-sessions')).toBeInTheDocument()
  })

  it('renders ACTIVE pill when group is active', async () => {
    renderGroupDetail()
    await screen.findByTestId('group-detail-page')
    expect(screen.getByTestId('active-pill')).toBeInTheDocument()
  })

  it('renders empty members gracefully when 0 members', async () => {
    vi.mocked(groupsApi.getGroup).mockResolvedValue({ ...mockGroup, memberCount: 0, members: [], memberPreview: [] })
    renderGroupDetail()
    await screen.findByTestId('group-detail-page')
    expect(screen.getByTestId('group-detail-page')).toBeInTheDocument()
  })

  it('renders error state when group not found', async () => {
    vi.mocked(groupsApi.getGroup).mockRejectedValue(new Error('Not found'))
    renderGroupDetail()
    expect(await screen.findByTestId('group-detail-error')).toBeInTheDocument()
  })
})
