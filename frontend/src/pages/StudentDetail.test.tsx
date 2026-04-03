import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import StudentDetail from './StudentDetail'
import * as studentsApi from '../api/students'

vi.mock('../api/students', () => ({
  getStudent: vi.fn(),
}))

vi.mock('../api/sessionLogs', () => ({
  listSessions: vi.fn().mockResolvedValue([]),
  createSession: vi.fn(),
  serializeTopicTags: vi.fn(() => '[]'),
  parseTopicTags: vi.fn(() => []),
}))

vi.mock('../api/lessons', () => ({
  getLessons: vi.fn().mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 100 }),
}))

vi.mock('../components/student/LessonHistoryCard', () => ({
  LessonHistoryCard: () => <div data-testid="lesson-history-card" />,
}))

vi.mock('../components/student/StudentCoursesCard', () => ({
  StudentCoursesCard: () => <div data-testid="student-courses-card" />,
}))

vi.mock('../components/StudentProfileSummary', () => ({
  StudentProfileSummary: () => <div data-testid="student-profile-summary" />,
}))

const MOCK_STUDENT: studentsApi.Student = {
  id: 'student-1',
  name: 'Ana Garcia',
  learningLanguage: 'Spanish',
  cefrLevel: 'B1',
  interests: [],
  notes: null,
  nativeLanguage: 'English',
  learningGoals: [],
  weaknesses: [],
  difficulties: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

function wrapper(studentId = 'student-1') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/students/${studentId}`]}>
        <Routes>
          <Route path="/students/:id" element={<StudentDetail />} />
          <Route path="/students" element={<div>Students list</div>} />
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

  it('shows Log session button', async () => {
    wrapper()
    expect(await screen.findByTestId('log-session-button')).toBeInTheDocument()
  })

  it('opens session log dialog when Log session is clicked', async () => {
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
})
