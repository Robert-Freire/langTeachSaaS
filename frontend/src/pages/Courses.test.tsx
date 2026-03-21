import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Courses from './Courses'
import * as coursesApi from '../api/courses'

vi.mock('../api/courses', () => ({
  getCourses: vi.fn(),
  deleteCourse: vi.fn(),
}))

function wrapper(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

const mockCourse = {
  id: 'course-1',
  name: 'B2 English for Ana',
  description: null,
  language: 'English',
  mode: 'general' as const,
  targetCefrLevel: 'B2',
  targetExam: null,
  sessionCount: 10,
  studentId: 'student-1',
  studentName: 'Ana',
  lessonsCreated: 3,
  createdAt: '2026-03-10T10:00:00Z',
}

describe('Courses list', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders course cards', async () => {
    vi.mocked(coursesApi.getCourses).mockResolvedValue([mockCourse])
    wrapper(<Courses />)

    expect(await screen.findByText('B2 English for Ana')).toBeInTheDocument()
    expect(screen.getByText('3/10 sessions')).toBeInTheDocument()
  })

  it('shows empty state when no courses', async () => {
    vi.mocked(coursesApi.getCourses).mockResolvedValue([])
    wrapper(<Courses />)

    expect(await screen.findByText('No courses yet')).toBeInTheDocument()
  })

  it('shows delete confirmation dialog on delete click', async () => {
    vi.mocked(coursesApi.getCourses).mockResolvedValue([mockCourse])
    wrapper(<Courses />)

    const deleteBtn = await screen.findByTestId('delete-course-course-1')
    fireEvent.click(deleteBtn)

    expect(await screen.findByText('Delete course?')).toBeInTheDocument()
  })
})
