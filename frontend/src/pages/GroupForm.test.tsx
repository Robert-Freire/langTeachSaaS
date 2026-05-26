import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import GroupForm from './GroupForm'
import * as groupsApi from '../api/groups'
import * as studentsApi from '../api/students'

vi.mock('../api/groups', () => ({
  getGroup: vi.fn(),
  createGroup: vi.fn(),
  updateGroup: vi.fn(),
  deleteGroup: vi.fn(),
  addGroupMember: vi.fn(),
  removeGroupMember: vi.fn(),
}))

vi.mock('../api/students', () => ({
  getStudents: vi.fn(),
}))

vi.mock('../api/followups', () => ({
  getFollowups: vi.fn().mockResolvedValue([]),
  createFollowup: vi.fn(),
  updateFollowupStatus: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const STUDENTS: any[] = [
  { id: 's1', name: 'Ana Garcia', commercial: { isActive: true }, level: { cefrLevel: 'B1' }, learningLanguage: 'es', createdAt: '', updatedAt: '' },
  { id: 's2', name: 'Carlos M', commercial: { isActive: true }, level: { cefrLevel: 'A2' }, learningLanguage: 'es', createdAt: '', updatedAt: '' },
  { id: 's3', name: 'Inactive Student', commercial: { isActive: false }, level: { cefrLevel: 'B1' }, learningLanguage: 'es', createdAt: '', updatedAt: '' },
]

function renderCreate() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  vi.mocked(studentsApi.getStudents).mockResolvedValue({ items: STUDENTS, totalCount: 3, page: 1, pageSize: 200 })
  return render(
    <MemoryRouter initialEntries={['/groups/new']}>
      <QueryClientProvider client={qc}>
        <Routes>
          <Route path="/groups/new" element={<GroupForm />} />
          <Route path="/groups" element={<div data-testid="groups-page">Groups</div>} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

function renderEdit(groupId: string, groupData: Partial<groupsApi.Group> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  vi.mocked(studentsApi.getStudents).mockResolvedValue({ items: STUDENTS, totalCount: 3, page: 1, pageSize: 200 })
  vi.mocked(groupsApi.getGroup).mockResolvedValue({
    id: groupId,
    teacherId: 't1',
    name: 'B1 Tuesday',
    cefrLevel: 'B1',
    description: null,
    memberCount: 1,
    isActive: true,
    createdAt: '',
    updatedAt: '',
    members: [{ id: 's1', name: 'Ana Garcia', cefrLevel: 'B1' }],
    memberPreview: null,
    lastSessionDate: null,
    nextSessionDate: null,
    teachingNotes: null,
    reasonForStudying: null,
    interests: '[]',
    commonFocusAreas: '[]',
    ...groupData,
  })
  return render(
    <MemoryRouter initialEntries={[`/groups/${groupId}/edit`]}>
      <QueryClientProvider client={qc}>
        <Routes>
          <Route path="/groups/:id/edit" element={<GroupForm />} />
          <Route path="/groups" element={<div data-testid="groups-page">Groups</div>} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

describe('GroupForm - create mode', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders all fields', () => {
    renderCreate()
    expect(screen.getByTestId('group-name-input')).toBeInTheDocument()
    expect(screen.getByTestId('group-cefr-select')).toBeInTheDocument()
    expect(screen.getByTestId('group-description-input')).toBeInTheDocument()
    expect(screen.getByTestId('group-reason-input')).toBeInTheDocument()
    expect(screen.getByTestId('interest-input')).toBeInTheDocument()
    expect(screen.getByTestId('focus-area-input')).toBeInTheDocument()
    expect(screen.getByTestId('member-search-input')).toBeInTheDocument()
  })

  it('adds and removes interest chips', async () => {
    renderCreate()
    const input = screen.getByTestId('interest-input')
    fireEvent.change(input, { target: { value: 'Travel' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(screen.getByTestId('interest-chip')).toHaveTextContent('Travel'))
    fireEvent.click(screen.getByLabelText('Remove Travel'))
    expect(screen.queryByTestId('interest-chip')).not.toBeInTheDocument()
  })

  it('adds and removes focus area chips', async () => {
    renderCreate()
    const input = screen.getByTestId('focus-area-input')
    fireEvent.change(input, { target: { value: 'Subjunctive' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(screen.getByTestId('focus-area-chip')).toHaveTextContent('Subjunctive'))
    fireEvent.click(screen.getByLabelText('Remove Subjunctive'))
    expect(screen.queryByTestId('focus-area-chip')).not.toBeInTheDocument()
  })

  it('shows a placeholder for the CEFR control instead of a lowercase "none" default', () => {
    renderCreate()
    expect(screen.getByText('Select level…')).toBeInTheDocument()
    expect(screen.queryByText('none')).not.toBeInTheDocument()
  })

  it('shows validation error when saving with empty name', async () => {
    renderCreate()
    fireEvent.click(screen.getByTestId('save-button'))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Group name is required')
    })
    expect(groupsApi.createGroup).not.toHaveBeenCalled()
  })

  it('creates group and members on save', async () => {
    vi.mocked(groupsApi.createGroup).mockResolvedValue({
      id: 'new-g',
      teacherId: 't1',
      name: 'New Group',
      cefrLevel: null,
      description: null,
      memberCount: 0,
      isActive: true,
      createdAt: '',
      updatedAt: '',
      members: null,
      memberPreview: null,
      lastSessionDate: null,
      nextSessionDate: null,
      teachingNotes: null,
      reasonForStudying: null,
      interests: '[]',
      commonFocusAreas: '[]',
    })
    vi.mocked(groupsApi.addGroupMember).mockResolvedValue({} as groupsApi.Group)

    renderCreate()
    fireEvent.change(screen.getByTestId('group-name-input'), { target: { value: 'New Group' } })

    // Add a member via search
    fireEvent.change(screen.getByTestId('member-search-input'), { target: { value: 'Ana' } })
    await waitFor(() => {
      const opt = screen.queryByTestId('student-option-s1')
      if (opt) fireEvent.mouseDown(opt)
    })

    fireEvent.click(screen.getByTestId('save-button'))
    await waitFor(() => {
      expect(groupsApi.createGroup).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Group' }))
    })
  })
})

describe('GroupForm - edit mode', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads group data into fields', async () => {
    renderEdit('g1')
    await waitFor(() => {
      expect(screen.getByTestId('group-name-input')).toHaveValue('B1 Tuesday')
    })
    expect(screen.getByTestId('member-chips')).toBeInTheDocument()
    expect(screen.getByText('Ana Garcia')).toBeInTheDocument()
  })

  it('removes member chip on × click', async () => {
    renderEdit('g1')
    await waitFor(() => screen.getByText('Ana Garcia'))
    fireEvent.click(screen.getByTestId('remove-member-s1'))
    expect(screen.queryByText('Ana Garcia')).not.toBeInTheDocument()
  })

  it('shows delete button in edit mode', async () => {
    renderEdit('g1')
    await waitFor(() => screen.getByTestId('delete-group-button'))
  })

  it('inactive students are not shown in picker', async () => {
    renderEdit('g1')
    await waitFor(() => screen.getByTestId('member-search-input'))
    fireEvent.change(screen.getByTestId('member-search-input'), { target: { value: 'Inactive' } })
    await waitFor(() => {
      expect(screen.queryByText('Inactive Student')).not.toBeInTheDocument()
    })
  })

  it('shows goals section and empty state in edit mode', async () => {
    renderEdit('g1')
    await waitFor(() => screen.getByTestId('goals-empty'))
    expect(screen.getByTestId('goal-text-input')).toBeInTheDocument()
    expect(screen.getByTestId('goal-due-date-input')).toBeInTheDocument()
    expect(screen.getByTestId('goal-add-btn')).toBeInTheDocument()
  })

  it('loads existing profile fields', async () => {
    renderEdit('g1', {
      reasonForStudying: 'DELE B2 prep',
      interests: '["Viajes","Cine"]',
      commonFocusAreas: '["Subjuntivo"]',
    })
    await waitFor(() => {
      expect(screen.getByTestId('group-reason-input')).toHaveValue('DELE B2 prep')
    })
    expect(screen.getAllByTestId('interest-chip')[0]).toHaveTextContent('Viajes')
    expect(screen.getAllByTestId('focus-area-chip')[0]).toHaveTextContent('Subjuntivo')
  })
})
