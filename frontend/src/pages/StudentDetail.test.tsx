import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import StudentDetail from './StudentDetail'
import * as studentsApi from '../api/students'

vi.mock('../api/followups', () => ({
  getFollowups: vi.fn().mockResolvedValue([]),
  createFollowup: vi.fn(),
  updateFollowupStatus: vi.fn(),
}))

vi.mock('../api/students', () => ({
  getStudent: vi.fn(),
  updateStudent: vi.fn(),
  appendTeachingTodo: vi.fn(),
  updateTeachingTodo: vi.fn(),
  deleteTeachingTodo: vi.fn(),
}))

vi.mock('../api/sessionLogs', () => ({
  listSessions: vi.fn().mockResolvedValue([]),
  createSession: vi.fn(),
  serializeTopicTags: vi.fn(() => '[]'),
  parseTopicTags: vi.fn(() => []),
}))

vi.mock('@/api/followups', () => ({
  getFollowups: vi.fn().mockResolvedValue([]),
  createFollowup: vi.fn(),
  updateFollowupStatus: vi.fn(),
  deleteFollowup: vi.fn(),
}))

vi.mock('../api/lessons', () => ({
  getLessons: vi.fn().mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 100 }),
}))

vi.mock('../components/session/SessionHistoryTab', () => ({
  SessionHistoryTab: () => <div data-testid="session-history-tab" />,
}))

vi.mock('../components/session/SessionLogDialog', () => ({
  SessionLogDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="session-log-dialog" /> : null,
}))

vi.mock('../components/student/ProgressDashboard', () => ({
  ProgressDashboard: () => <div data-testid="progress-dashboard" />,
}))

const MOCK_STUDENT: studentsApi.Student = {
  id: 'student-1',
  name: 'Ana Garcia',
  learningLanguage: 'Spanish',
  cefrLevel: 'B1',
  interests: ['travel', 'cooking'],
  personalNotes: null,
  teachingNotes: null,
  nativeLanguages: ['English'],
  learningGoals: ['Travel', 'DELE B1'],
  weaknesses: [],
  difficulties: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  birthYear: 1995,
  profession: 'Designer',
  countryOfOrigin: 'United Kingdom',
  cityOfOrigin: 'London',
  countryOfResidence: 'Spain',
  cityOfResidence: 'Barcelona',
  reasonForStudying: 'Moved to Barcelona for work',
  officialCefrLevel: null,
  shortTermObjectives: [
    { id: 'obj-1', text: 'Complete DELE B1 exam prep', targetDate: '2026-06-01' },
  ],
  isActive: true,
  isCorporate: false,
  rate: '30 EUR/h',
  spokenLanguages: ['French'],
  skillLevelOverrides: {},
  teachingTodos: [
    { id: 'todo-1', text: 'Send homework exercises', createdAt: '2026-01-01T00:00:00Z', sourceSessionLogId: null, status: 'Pending', coveredInSessionLogId: null },
  ],
}

function wrapper(studentId = 'student-1') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/students/${studentId}`]}>
        <Routes>
          <Route path="/students/:id" element={<StudentDetail />} />
          <Route path="/students" element={<div>Students list</div>} />
          <Route path="/students/:id/edit" element={<div data-testid="edit-page">Edit</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('StudentDetail', () => {
  beforeEach(() => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue(MOCK_STUDENT)
  })

  it('renders student name when loaded', async () => {
    wrapper()
    expect(await screen.findByTestId('student-detail-name')).toHaveTextContent('Ana Garcia')
  })

  it('shows Log Session button', async () => {
    wrapper()
    expect(await screen.findByTestId('log-session-button')).toBeInTheDocument()
  })

  it('opens session log dialog when Log Session is clicked', async () => {
    wrapper()
    await screen.findByTestId('log-session-button')
    fireEvent.click(screen.getByTestId('log-session-button'))
    expect(await screen.findByTestId('session-log-dialog')).toBeInTheDocument()
  })

  it('shows not found message for missing student', async () => {
    vi.mocked(studentsApi.getStudent).mockRejectedValue(new Error('Not found'))
    wrapper('bad-id')
    expect(await screen.findByText('Student not found.')).toBeInTheDocument()
  })

  it('renders Overview, Profile, Sessions, and Progress tabs', async () => {
    wrapper()
    await screen.findByTestId('student-detail-name')
    expect(screen.getByTestId('tab-overview')).toBeInTheDocument()
    expect(screen.getByTestId('tab-profile')).toBeInTheDocument()
    expect(screen.getByTestId('tab-sessions')).toBeInTheDocument()
    expect(screen.getByTestId('tab-progress')).toBeInTheDocument()
  })

  it('shows Overview tab content by default', async () => {
    wrapper()
    await screen.findByTestId('student-detail-name')
    expect(screen.getByTestId('student-overview-tab')).toBeInTheDocument()
    expect(screen.queryByTestId('student-profile-tab')).not.toBeInTheDocument()
    expect(screen.queryByTestId('session-history-tab')).not.toBeInTheDocument()
    expect(screen.queryByTestId('progress-dashboard')).not.toBeInTheDocument()
  })

  it('switches to Profile tab on click', async () => {
    wrapper()
    await screen.findByTestId('student-detail-name')
    fireEvent.click(screen.getByTestId('tab-profile'))
    expect(screen.getByTestId('student-profile-tab')).toBeInTheDocument()
    expect(screen.queryByTestId('student-overview-tab')).not.toBeInTheDocument()
  })

  it('switches to Sessions tab on click', async () => {
    wrapper()
    await screen.findByTestId('student-detail-name')
    fireEvent.click(screen.getByTestId('tab-sessions'))
    expect(screen.getByTestId('session-history-tab')).toBeInTheDocument()
    expect(screen.queryByTestId('student-profile-tab')).not.toBeInTheDocument()
  })

  it('switches to Progress tab on click', async () => {
    wrapper()
    await screen.findByTestId('student-detail-name')
    fireEvent.click(screen.getByTestId('tab-progress'))
    expect(screen.getByTestId('progress-dashboard')).toBeInTheDocument()
    expect(screen.queryByTestId('student-profile-tab')).not.toBeInTheDocument()
  })

  it('shows CEFR badge in header', async () => {
    wrapper()
    await screen.findByTestId('student-detail-name')
    expect(screen.getByTestId('cefr-badge')).toHaveTextContent('B1')
  })

  it('shows Edit and Log Session quick actions', async () => {
    wrapper()
    await screen.findByTestId('student-detail-name')
    expect(screen.getByTestId('edit-profile-link')).toBeInTheDocument()
    expect(screen.getByTestId('log-session-button')).toBeInTheDocument()
  })

  it('shows official CEFR badge when different from teacher level', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue({
      ...MOCK_STUDENT,
      officialCefrLevel: 'A2',
    })
    wrapper()
    await screen.findByTestId('student-detail-name')
    expect(screen.getByTestId('official-cefr-badge')).toHaveTextContent('Official: A2')
  })

  it('shows official CEFR badge even when same as teacher level', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue({
      ...MOCK_STUDENT,
      officialCefrLevel: 'B1',
    })
    wrapper()
    await screen.findByTestId('student-detail-name')
    expect(screen.getByTestId('official-cefr-badge')).toHaveTextContent('Official: B1')
  })

  it('shows profession below name in header when set', async () => {
    wrapper()
    await screen.findByTestId('student-detail-name')
    expect(screen.getByTestId('student-header-profession')).toHaveTextContent('Designer')
  })

  it('does not render profession element when profession is null', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue({
      ...MOCK_STUDENT,
      profession: null,
    })
    wrapper()
    await screen.findByTestId('student-detail-name')
    expect(screen.queryByTestId('student-header-profession')).not.toBeInTheDocument()
  })

  it('shows origin/residence compact in metadata when cities are set', async () => {
    wrapper()
    await screen.findByTestId('student-detail-name')
    expect(screen.getByTestId('student-header-location')).toHaveTextContent('London / Barcelona')
  })

  it('does not render location element when no city data', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue({
      ...MOCK_STUDENT,
      cityOfOrigin: null,
      cityOfResidence: null,
    })
    wrapper()
    await screen.findByTestId('student-detail-name')
    expect(screen.queryByTestId('student-header-location')).not.toBeInTheDocument()
  })
})

describe('StudentDetail - Overview tab', () => {
  beforeEach(() => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue(MOCK_STUDENT)
  })

  it('renders primary objective card', async () => {
    wrapper()
    await screen.findByTestId('primary-objective-card')
    expect(screen.getByTestId('objective-text')).toHaveTextContent('Complete DELE B1 exam prep')
  })

  it('shows days remaining for objective with future date', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue({
      ...MOCK_STUDENT,
      shortTermObjectives: [
        { id: 'obj-1', text: 'Future objective', targetDate: '2030-01-01' },
      ],
    })
    wrapper()
    await screen.findByTestId('primary-objective-card')
    expect(screen.getByTestId('days-remaining')).toHaveTextContent('days left')
  })

  it('shows empty state when no objectives', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue({ ...MOCK_STUDENT, shortTermObjectives: [] })
    wrapper()
    await screen.findByTestId('primary-objective-card')
    expect(screen.getByText('No objectives set')).toBeInTheDocument()
  })
})

describe('StudentDetail - Profile tab sections', () => {
  beforeEach(() => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue(MOCK_STUDENT)
  })

  async function openProfileTab() {
    wrapper()
    await screen.findByTestId('student-detail-name')
    fireEvent.click(screen.getByTestId('tab-profile'))
  }

  it('renders hero section with reason for studying', async () => {
    await openProfileTab()
    await screen.findByTestId('profile-hero')
    expect(screen.getByTestId('reason-quote')).toHaveTextContent('Moved to Barcelona for work')
  })

  it('renders Identity Details section with identity fields', async () => {
    await openProfileTab()
    await screen.findByTestId('profile-about')
    expect(screen.getByText('London, United Kingdom')).toBeInTheDocument()
    expect(screen.getByText('Barcelona, Spain')).toBeInTheDocument()
    expect(screen.getByText(/^1995 \(\d+ years\)$/)).toBeInTheDocument()
    expect(screen.getAllByText('Designer').length).toBeGreaterThanOrEqual(1)
  })

  it('renders Language Ecosystem section', async () => {
    await openProfileTab()
    const section = await screen.findByTestId('profile-language-ecosystem')
    expect(section).toHaveTextContent('English')
    expect(section).toHaveTextContent('French')
    expect(section).toHaveTextContent('Spanish')
    expect(section).toHaveTextContent('B1')
  })

  it('renders Learning Goals section', async () => {
    await openProfileTab()
    await screen.findByTestId('profile-learning-goals')
    expect(screen.getByText('Travel')).toBeInTheDocument()
    expect(screen.getByText('DELE B1')).toBeInTheDocument()
  })

  it('renders Short-Term Objectives section', async () => {
    await openProfileTab()
    await screen.findByTestId('profile-objectives')
    expect(screen.getByText('Complete DELE B1 exam prep')).toBeInTheDocument()
  })

  it('renders Teaching Todos section', async () => {
    await openProfileTab()
    await screen.findByTestId('profile-teaching-todos')
    expect(screen.getByText('Send homework exercises')).toBeInTheDocument()
  })

  it('renders Commercial section with active status', async () => {
    await openProfileTab()
    await screen.findByTestId('profile-commercial')
    expect(screen.getByTestId('active-status-badge')).toHaveTextContent('Active')
    expect(screen.getByText('30 EUR/h')).toBeInTheDocument()
  })

  it('shows empty states when no profile data', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue({
      ...MOCK_STUDENT,
      birthYear: null,
      profession: null,
      countryOfOrigin: null,
      cityOfOrigin: null,
      countryOfResidence: null,
      cityOfResidence: null,
      reasonForStudying: null,
      learningGoals: [],
      shortTermObjectives: [],
      teachingTodos: [],
    })
    await openProfileTab()
    await screen.findByTestId('profile-about')
    expect(screen.getByText('No identity details added yet')).toBeInTheDocument()
    expect(screen.getByText('No learning goals set')).toBeInTheDocument()
    expect(screen.getByText('No objectives set')).toBeInTheDocument()
    expect(screen.getByTestId('teaching-todos-empty')).toBeInTheDocument()
  })
})
