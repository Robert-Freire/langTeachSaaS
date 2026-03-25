import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CourseDetail from './CourseDetail'
import * as coursesApi from '../api/courses'

vi.mock('../api/courses', () => ({
  getCourse: vi.fn(),
  reorderCurriculum: vi.fn(),
  updateCurriculumEntry: vi.fn(),
  markEntryAsTaught: vi.fn(),
  generateLessonFromEntry: vi.fn(),
}))

function wrapper(ui: React.ReactElement, path = '/courses/course-1') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/courses/:id" element={ui} />
        </Routes>
      </MemoryRouter>
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
  examDate: null,
  sessionCount: 3,
  studentId: null,
  studentName: null,
  lessonsCreated: 0,
  createdAt: '2026-03-10T10:00:00Z',
  updatedAt: '2026-03-10T10:00:00Z',
  entries: [
    { id: 'e1', orderIndex: 1, topic: 'Greetings', grammarFocus: 'Present simple', competencies: 'speaking,listening', lessonType: 'Communicative', lessonId: null, status: 'planned' as const, contextDescription: null, personalizationNotes: null, vocabularyThemes: null },
    { id: 'e2', orderIndex: 2, topic: 'Daily Routines', grammarFocus: null, competencies: 'reading', lessonType: null, lessonId: null, status: 'planned' as const, contextDescription: null, personalizationNotes: null, vocabularyThemes: null },
    { id: 'e3', orderIndex: 3, topic: 'Hobbies', grammarFocus: 'Present continuous', competencies: 'writing', lessonType: 'Grammar-focused', lessonId: null, status: 'planned' as const, contextDescription: null, personalizationNotes: null, vocabularyThemes: null },
  ],
}

const mockCourseWithPersonalization = {
  ...mockCourse,
  studentName: 'Ana',
  entries: [
    {
      id: 'e1',
      orderIndex: 1,
      topic: 'Greetings: Saludar y despedirse',
      grammarFocus: 'Verbo llamarse, pronombres',
      competencies: 'speaking,listening',
      lessonType: 'Communicative',
      lessonId: null,
      status: 'planned' as const,
      contextDescription: 'Ana introduces herself at a Barcelona language school',
      personalizationNotes: 'Focused on oral production given Ana\'s speaking goal',
      vocabularyThemes: 'Saludos,Despedidas,Números del 1 al 10',
    },
  ],
}

describe('CourseDetail', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders course title and curriculum entries', async () => {
    vi.mocked(coursesApi.getCourse).mockResolvedValue(mockCourse)
    wrapper(<CourseDetail />)

    expect(await screen.findByTestId('course-title')).toHaveTextContent('B2 English for Ana')
    expect(screen.getByTestId('curriculum-list')).toBeInTheDocument()
    expect(screen.getByText('Greetings')).toBeInTheDocument()
    expect(screen.getByText('Daily Routines')).toBeInTheDocument()
  })

  it('shows progress indicator', async () => {
    vi.mocked(coursesApi.getCourse).mockResolvedValue(mockCourse)
    wrapper(<CourseDetail />)

    expect(await screen.findByTestId('course-progress')).toHaveTextContent('0 of 3 lessons created')
  })

  it('first entry move-up button is disabled', async () => {
    vi.mocked(coursesApi.getCourse).mockResolvedValue(mockCourse)
    wrapper(<CourseDetail />)

    const moveUpFirst = await screen.findByTestId('move-up-0')
    expect(moveUpFirst).toBeDisabled()
  })

  it('last entry move-down button is disabled', async () => {
    vi.mocked(coursesApi.getCourse).mockResolvedValue(mockCourse)
    wrapper(<CourseDetail />)

    await screen.findByTestId('course-title')
    const moveDownLast = screen.getByTestId('move-down-2')
    expect(moveDownLast).toBeDisabled()
  })

  it('clicking edit shows edit form', async () => {
    vi.mocked(coursesApi.getCourse).mockResolvedValue(mockCourse)
    wrapper(<CourseDetail />)

    const editBtn = await screen.findByTestId('edit-entry-0')
    fireEvent.click(editBtn)

    expect(screen.getByTestId('edit-topic')).toHaveValue('Greetings')
  })

  it('generate lesson button is visible for planned entries', async () => {
    vi.mocked(coursesApi.getCourse).mockResolvedValue(mockCourse)
    wrapper(<CourseDetail />)

    await screen.findByTestId('course-title')
    expect(screen.getByTestId('generate-lesson-0')).toBeInTheDocument()
  })

  it('entry details are hidden by default and shown after expand click', async () => {
    vi.mocked(coursesApi.getCourse).mockResolvedValue(mockCourseWithPersonalization)
    wrapper(<CourseDetail />)

    await screen.findByTestId('course-title')

    // Details not visible before expanding
    expect(screen.queryByTestId('entry-details-0')).not.toBeInTheDocument()

    // Click expand
    fireEvent.click(screen.getByTestId('expand-entry-0'))
    expect(screen.getByTestId('entry-details-0')).toBeInTheDocument()
  })

  it('expanded entry shows all fields when fully populated', async () => {
    vi.mocked(coursesApi.getCourse).mockResolvedValue(mockCourseWithPersonalization)
    wrapper(<CourseDetail />)

    await screen.findByTestId('course-title')
    fireEvent.click(screen.getByTestId('expand-entry-0'))

    expect(screen.getByTestId('context-description-0')).toHaveTextContent('Ana introduces herself at a Barcelona language school')
    expect(screen.getByTestId('personalization-notes-0')).toHaveTextContent('Focused on oral production')
    expect(screen.getByText('Saludos')).toBeInTheDocument()
    expect(screen.getByText('Despedidas')).toBeInTheDocument()
    expect(screen.getByText('speaking')).toBeInTheDocument()
  })

  it('expanded entry renders gracefully when optional fields are null', async () => {
    vi.mocked(coursesApi.getCourse).mockResolvedValue(mockCourse)
    wrapper(<CourseDetail />)

    await screen.findByTestId('course-title')
    fireEvent.click(screen.getByTestId('expand-entry-0'))

    expect(screen.getByTestId('entry-details-0')).toBeInTheDocument()
    expect(screen.queryByTestId('context-description-0')).not.toBeInTheDocument()
    expect(screen.queryByTestId('personalization-notes-0')).not.toBeInTheDocument()
  })

  it('expand toggle collapses when clicked again', async () => {
    vi.mocked(coursesApi.getCourse).mockResolvedValue(mockCourseWithPersonalization)
    wrapper(<CourseDetail />)

    await screen.findByTestId('course-title')
    fireEvent.click(screen.getByTestId('expand-entry-0'))
    expect(screen.getByTestId('entry-details-0')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('expand-entry-0'))
    expect(screen.queryByTestId('entry-details-0')).not.toBeInTheDocument()
  })
})
