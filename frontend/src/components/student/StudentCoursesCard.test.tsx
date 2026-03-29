import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StudentCoursesCard } from './StudentCoursesCard'
import * as coursesApi from '../../api/courses'

vi.mock('../../api/courses', () => ({
  getCourses: vi.fn(),
}))


const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const STUDENT_ID = 'student-1'

const mockCourses = [
  {
    id: 'course-1',
    name: 'B2 English for Ana',
    description: null,
    language: 'English',
    mode: 'general' as const,
    targetCefrLevel: 'B2',
    targetExam: null,
    sessionCount: 10,
    studentId: STUDENT_ID,
    studentName: 'Ana',
    lessonsCreated: 3,
    createdAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 'course-2',
    name: 'DELE Exam Prep',
    description: null,
    language: 'Spanish',
    mode: 'exam-prep' as const,
    targetCefrLevel: null,
    targetExam: 'DELE',
    sessionCount: 8,
    studentId: 'other-student',
    studentName: 'Marco',
    lessonsCreated: 0,
    createdAt: '2026-03-02T00:00:00Z',
  },
]

function wrapper(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('StudentCoursesCard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders loading skeletons while fetching', () => {
    vi.mocked(coursesApi.getCourses).mockReturnValue(new Promise(() => {}))
    wrapper(<StudentCoursesCard studentId={STUDENT_ID} />)
    expect(screen.getByTestId('student-courses-card')).toBeInTheDocument()
  })

  it('renders empty state with correct message and create button when no courses', async () => {
    vi.mocked(coursesApi.getCourses).mockResolvedValue([])
    wrapper(<StudentCoursesCard studentId={STUDENT_ID} />)

    expect(await screen.findByTestId('student-courses-empty')).toBeInTheDocument()
    expect(screen.getByText(/No courses yet\. Create one from the student's profile\./)).toBeInTheDocument()
    expect(screen.getByTestId('student-courses-create-btn')).toBeInTheDocument()
  })

  it('renders only courses belonging to the student', async () => {
    vi.mocked(coursesApi.getCourses).mockResolvedValue(mockCourses)
    wrapper(<StudentCoursesCard studentId={STUDENT_ID} />)

    expect(await screen.findByTestId('student-courses-list')).toBeInTheDocument()
    expect(screen.getByText('B2 English for Ana')).toBeInTheDocument()
    expect(screen.queryByText('DELE Exam Prep')).not.toBeInTheDocument()
    expect(screen.getByText('3/10 sessions')).toBeInTheDocument()
  })

  it('Create Course button navigates to CourseNew with studentId', async () => {
    vi.mocked(coursesApi.getCourses).mockResolvedValue([])
    wrapper(<StudentCoursesCard studentId={STUDENT_ID} />)

    const btn = await screen.findByTestId('student-courses-create-btn')
    fireEvent.click(btn)
    expect(mockNavigate).toHaveBeenCalledWith(`/courses/new?studentId=${STUDENT_ID}`)
  })
})
