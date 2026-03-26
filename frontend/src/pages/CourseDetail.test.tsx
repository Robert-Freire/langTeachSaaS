import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
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
  addCurriculumEntry: vi.fn(),
  deleteCurriculumEntry: vi.fn(),
  dismissWarning: vi.fn(),
}))

// Capture the onDragEnd handler from DndContext so we can trigger it in tests
let capturedOnDragEnd: ((event: { active: { id: string }; over: { id: string } | null }) => void) | null = null

vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>()
  return {
    ...actual,
    DndContext: ({ children, onDragEnd, ...props }: { children: React.ReactNode; onDragEnd?: (e: { active: { id: string }; over: { id: string } | null }) => void; [key: string]: unknown }) => {
      capturedOnDragEnd = onDragEnd ?? null
      return <div {...props}>{children}</div>
    },
  }
})

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
  studentId: 's1',
  studentName: 'Ana',
  lessonsCreated: 0,
  createdAt: '2026-03-10T10:00:00Z',
  updatedAt: '2026-03-10T10:00:00Z',
  entries: [
    { id: 'e1', orderIndex: 1, topic: 'Greetings', grammarFocus: 'Present simple', competencies: 'speaking,listening', lessonType: 'Communicative', lessonId: null, status: 'planned' as const, contextDescription: null, personalizationNotes: null, vocabularyThemes: null },
    { id: 'e2', orderIndex: 2, topic: 'Daily Routines', grammarFocus: null, competencies: 'reading', lessonType: null, lessonId: null, status: 'planned' as const, contextDescription: null, personalizationNotes: null, vocabularyThemes: null },
    { id: 'e3', orderIndex: 3, topic: 'Hobbies', grammarFocus: 'Present continuous', competencies: 'writing', lessonType: 'Grammar-focused', lessonId: null, status: 'planned' as const, contextDescription: null, personalizationNotes: null, vocabularyThemes: null },
  ],
  warnings: null,
  dismissedWarningKeys: null,
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

    expect(screen.queryByTestId('entry-details-0')).not.toBeInTheDocument()

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

  // -------------------------------------------------------------------------
  // Summary header
  // -------------------------------------------------------------------------

  it('renders summary header with course stats', async () => {
    vi.mocked(coursesApi.getCourse).mockResolvedValue(mockCourse)
    wrapper(<CourseDetail />)

    await screen.findByTestId('course-summary-header')
    expect(screen.getByTestId('summary-sessions')).toHaveTextContent('3')
    expect(screen.getByTestId('summary-level')).toHaveTextContent('B2')
    expect(screen.getByTestId('summary-student')).toHaveTextContent('Ana')
    expect(screen.getByTestId('summary-mode')).toHaveTextContent('General Learning')
    expect(screen.getByTestId('summary-progress')).toHaveTextContent('0/3')
  })

  // -------------------------------------------------------------------------
  // Add session
  // -------------------------------------------------------------------------

  it('shows add entry form when add button clicked', async () => {
    vi.mocked(coursesApi.getCourse).mockResolvedValue(mockCourse)
    wrapper(<CourseDetail />)

    await screen.findByTestId('course-title')
    fireEvent.click(screen.getByTestId('add-entry-btn'))

    expect(screen.getByTestId('add-entry-form')).toBeInTheDocument()
    expect(screen.getByTestId('add-topic')).toBeInTheDocument()
  })

  it('add entry form calls addCurriculumEntry on save', async () => {
    vi.mocked(coursesApi.getCourse).mockResolvedValue(mockCourse)
    vi.mocked(coursesApi.addCurriculumEntry).mockResolvedValue({
      id: 'e4', orderIndex: 4, topic: 'New Session', grammarFocus: null,
      competencies: '', lessonType: null, lessonId: null, status: 'planned',
      contextDescription: null, personalizationNotes: null, vocabularyThemes: null,
    })
    wrapper(<CourseDetail />)

    await screen.findByTestId('course-title')
    fireEvent.click(screen.getByTestId('add-entry-btn'))
    fireEvent.change(screen.getByTestId('add-topic'), { target: { value: 'New Session' } })
    fireEvent.click(screen.getByTestId('save-add-entry-btn'))

    await waitFor(() => {
      expect(coursesApi.addCurriculumEntry).toHaveBeenCalledWith('course-1', expect.objectContaining({ topic: 'New Session' }))
    })
  })

  it('cancel add entry hides the form', async () => {
    vi.mocked(coursesApi.getCourse).mockResolvedValue(mockCourse)
    wrapper(<CourseDetail />)

    await screen.findByTestId('course-title')
    fireEvent.click(screen.getByTestId('add-entry-btn'))
    expect(screen.getByTestId('add-entry-form')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('cancel-add-entry-btn'))
    expect(screen.queryByTestId('add-entry-form')).not.toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Remove session
  // -------------------------------------------------------------------------

  it('shows confirmation dialog when delete icon clicked', async () => {
    vi.mocked(coursesApi.getCourse).mockResolvedValue(mockCourse)
    wrapper(<CourseDetail />)

    await screen.findByTestId('course-title')
    fireEvent.click(screen.getByTestId('delete-entry-0'))

    // Wait for the dialog content to appear (base-ui uses portals)
    expect(await screen.findByText('Remove session?')).toBeInTheDocument()
    expect(screen.getByTestId('confirm-delete-ok')).toBeInTheDocument()
  })

  it('confirming delete calls deleteCurriculumEntry', async () => {
    vi.mocked(coursesApi.getCourse).mockResolvedValue(mockCourse)
    vi.mocked(coursesApi.deleteCurriculumEntry).mockResolvedValue(undefined)
    wrapper(<CourseDetail />)

    await screen.findByTestId('course-title')
    fireEvent.click(screen.getByTestId('delete-entry-0'))
    fireEvent.click(screen.getByTestId('confirm-delete-ok'))

    await waitFor(() => {
      expect(coursesApi.deleteCurriculumEntry).toHaveBeenCalledWith('course-1', 'e1')
    })
  })

  it('cancelling delete dialog does not call deleteCurriculumEntry', async () => {
    vi.mocked(coursesApi.getCourse).mockResolvedValue(mockCourse)
    wrapper(<CourseDetail />)

    await screen.findByTestId('course-title')
    fireEvent.click(screen.getByTestId('delete-entry-1'))
    fireEvent.click(screen.getByTestId('confirm-delete-cancel'))

    expect(coursesApi.deleteCurriculumEntry).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // Drag handles and reorder
  // -------------------------------------------------------------------------

  it('renders drag handles for each entry', async () => {
    vi.mocked(coursesApi.getCourse).mockResolvedValue(mockCourse)
    wrapper(<CourseDetail />)

    await screen.findByTestId('course-title')
    expect(screen.getByTestId('drag-handle-0')).toBeInTheDocument()
    expect(screen.getByTestId('drag-handle-1')).toBeInTheDocument()
    expect(screen.getByTestId('drag-handle-2')).toBeInTheDocument()
  })

  it('drag-end event triggers reorderCurriculum with new order', async () => {
    vi.mocked(coursesApi.getCourse).mockResolvedValue(mockCourse)
    vi.mocked(coursesApi.reorderCurriculum).mockResolvedValue(undefined)
    wrapper(<CourseDetail />)

    await screen.findByTestId('course-title')

    // Simulate dragging e1 to position of e2 (swap first two entries)
    await act(async () => {
      capturedOnDragEnd?.({ active: { id: 'e1' }, over: { id: 'e2' } })
    })

    await waitFor(() => {
      expect(coursesApi.reorderCurriculum).toHaveBeenCalledWith(
        'course-1',
        expect.arrayContaining(['e2', 'e1'])
      )
    })
    // e2 should come before e1 in the call
    const call = vi.mocked(coursesApi.reorderCurriculum).mock.calls[0]
    expect(call[1].indexOf('e2')).toBeLessThan(call[1].indexOf('e1'))
  })

  it('shows error state with retry button when fetch fails', async () => {
    vi.mocked(coursesApi.getCourse).mockRejectedValue(new Error('network error'))
    wrapper(<CourseDetail />)

    expect(await screen.findByTestId('course-load-error')).toBeInTheDocument()
    expect(screen.getByText('Failed to load course.')).toBeInTheDocument()
    expect(screen.getByTestId('course-load-retry-btn')).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Exam prep session type badges
  // -------------------------------------------------------------------------

  describe('exam prep session type badges', () => {
    const examPrepCourse = {
      ...mockCourse,
      mode: 'exam-prep' as const,
      targetCefrLevel: null,
      targetExam: 'DELE',
      entries: [
        { id: 'e1', orderIndex: 1, topic: 'Exam skills overview', grammarFocus: null, competencies: 'reading,writing', lessonType: 'Input Session', lessonId: null, status: 'planned' as const, contextDescription: null, personalizationNotes: null, vocabularyThemes: null },
        { id: 'e2', orderIndex: 2, topic: 'Exam strategy deep-dive', grammarFocus: null, competencies: 'writing', lessonType: 'Strategy Session', lessonId: null, status: 'planned' as const, contextDescription: null, personalizationNotes: null, vocabularyThemes: null },
        { id: 'e3', orderIndex: 3, topic: 'Full mock exam', grammarFocus: null, competencies: 'reading,writing,listening,speaking', lessonType: 'Mock Test', lessonId: null, status: 'planned' as const, contextDescription: null, personalizationNotes: null, vocabularyThemes: null },
      ],
    }

    it('shows session type badge in collapsed row for exam-prep course', async () => {
      vi.mocked(coursesApi.getCourse).mockResolvedValue(examPrepCourse)
      wrapper(<CourseDetail />)

      await screen.findByTestId('course-title')

      expect(screen.getByTestId('session-type-badge-0')).toHaveTextContent('Input Session')
      expect(screen.getByTestId('session-type-badge-1')).toHaveTextContent('Strategy Session')
      expect(screen.getByTestId('session-type-badge-2')).toHaveTextContent('Mock Test')
    })

    it('does not show session type badge for general mode course', async () => {
      vi.mocked(coursesApi.getCourse).mockResolvedValue(mockCourse)
      wrapper(<CourseDetail />)

      await screen.findByTestId('course-title')

      expect(screen.queryByTestId('session-type-badge-0')).not.toBeInTheDocument()
    })
  })

  describe('generation warnings panel', () => {
    const warningCourse = {
      ...mockCourse,
      warnings: [
        { sessionIndex: 1, grammarFocus: 'Subjunctive Mood', flagReason: 'C1 structure, above A1.', suggestedLevel: 'C1' },
      ],
      dismissedWarningKeys: null,
    }

    it('does not render warnings panel when warnings is null', async () => {
      vi.mocked(coursesApi.getCourse).mockResolvedValue(mockCourse)
      wrapper(<CourseDetail />)
      await screen.findByTestId('course-title')
      expect(screen.queryByTestId('warnings-panel')).not.toBeInTheDocument()
    })

    it('renders warnings panel when warnings are present', async () => {
      vi.mocked(coursesApi.getCourse).mockResolvedValue(warningCourse)
      wrapper(<CourseDetail />)
      await screen.findByTestId('warnings-panel')
      expect(screen.getByText(/Subjunctive Mood/)).toBeInTheDocument()
      expect(screen.getByText(/C1 structure/)).toBeInTheDocument()
    })

    it('calls dismissWarning when dismiss button clicked', async () => {
      vi.mocked(coursesApi.getCourse).mockResolvedValue(warningCourse)
      vi.mocked(coursesApi.dismissWarning).mockResolvedValue(undefined)
      wrapper(<CourseDetail />)
      await screen.findByTestId('warnings-panel')
      fireEvent.click(screen.getByTestId('dismiss-warning-1'))
      await waitFor(() => {
        expect(coursesApi.dismissWarning).toHaveBeenCalledWith('course-1', 'session:1:Subjunctive Mood')
      })
    })

    it('shows clear badge when all warnings are dismissed', async () => {
      const clearedCourse = {
        ...warningCourse,
        dismissedWarningKeys: ['session:1:Subjunctive Mood'],
      }
      vi.mocked(coursesApi.getCourse).mockResolvedValue(clearedCourse)
      wrapper(<CourseDetail />)
      await screen.findByTestId('warnings-panel-clear')
      expect(screen.getByText(/All grammar structures are level-appropriate/)).toBeInTheDocument()
    })
  })
})
