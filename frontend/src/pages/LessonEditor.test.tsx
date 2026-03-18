import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import React from 'react'
import LessonEditor from './LessonEditor'

const mockPanelCallbacks = vi.hoisted(() => ({
  onStreamingChange: undefined as ((v: boolean) => void) | undefined,
  onClose: undefined as (() => void) | undefined,
}))

vi.mock('@/components/lesson/GeneratePanel', () => ({
  GeneratePanel: (props: { onStreamingChange?: (v: boolean) => void; onClose: () => void }) => {
    mockPanelCallbacks.onStreamingChange = props.onStreamingChange
    mockPanelCallbacks.onClose = props.onClose
    return React.createElement('div', { 'data-testid': 'generate-panel' })
  },
}))

const mockLessonFull = {
  id: 'lesson-1',
  title: 'Test Lesson',
  language: 'English',
  cefrLevel: 'B1',
  topic: 'Travel',
  durationMinutes: 60,
  objectives: 'Learn travel vocabulary',
  status: 'Draft' as const,
  studentId: null,
  templateId: null,
  sections: [
    { id: 'sec-1', sectionType: 'WarmUp', orderIndex: 0, notes: 'Opener' },
    { id: 'sec-2', sectionType: 'Presentation', orderIndex: 1, notes: null },
    { id: 'sec-3', sectionType: 'Practice', orderIndex: 2, notes: null },
    { id: 'sec-4', sectionType: 'Production', orderIndex: 3, notes: null },
    { id: 'sec-5', sectionType: 'WrapUp', orderIndex: 4, notes: null },
  ],
  createdAt: '2026-03-10T10:00:00Z',
  updatedAt: '2026-03-10T10:00:00Z',
  scheduledAt: '2026-03-20T14:00:00',
  studentName: null,
}

const mockLessonPartial = {
  ...mockLessonFull,
  id: 'lesson-2',
  title: 'Conversation Lesson',
  sections: [
    { id: 'sec-a', sectionType: 'WarmUp', orderIndex: 0, notes: 'Hello' },
    { id: 'sec-b', sectionType: 'Practice', orderIndex: 1, notes: null },
    { id: 'sec-c', sectionType: 'Production', orderIndex: 2, notes: null },
  ],
}

const mockGetLesson = vi.fn()
const mockUpdateLesson = vi.fn()
const mockUpdateSections = vi.fn()
const mockGetStudents = vi.fn()
const mockGetContentBlocks = vi.fn()

const mockGetLessonNotes = vi.fn()
const mockSaveLessonNotes = vi.fn()

vi.mock('../api/lessons', () => ({
  getLesson: (...args: unknown[]) => mockGetLesson(...args),
  updateLesson: (...args: unknown[]) => mockUpdateLesson(...args),
  updateSections: (...args: unknown[]) => mockUpdateSections(...args),
  deleteLesson: vi.fn(),
  duplicateLesson: vi.fn(),
  getLessonNotes: (...args: unknown[]) => mockGetLessonNotes(...args),
  saveLessonNotes: (...args: unknown[]) => mockSaveLessonNotes(...args),
}))

vi.mock('../api/students', () => ({
  getStudents: (...args: unknown[]) => mockGetStudents(...args),
}))

vi.mock('../api/generate', () => ({
  getContentBlocks: (...args: unknown[]) => mockGetContentBlocks(...args),
}))

function renderWithProviders() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/lessons/lesson-1']}>
        <Routes>
          <Route path="/lessons/:id" element={<LessonEditor />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('LessonEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetLesson.mockResolvedValue(mockLessonFull)
    mockGetStudents.mockResolvedValue({ items: [], totalCount: 0 })
    mockGetContentBlocks.mockResolvedValue([])
    mockUpdateLesson.mockResolvedValue(mockLessonFull)
    mockUpdateSections.mockResolvedValue(mockLessonFull)
    mockGetLessonNotes.mockResolvedValue(null)
    mockSaveLessonNotes.mockResolvedValue({})
  })

  it('shows student name in metadata strip when present', async () => {
    mockGetLesson.mockResolvedValue({ ...mockLessonFull, studentId: 'student-1', studentName: 'Carlos Mendez' })
    renderWithProviders()

    await screen.findByTestId('lesson-title')
    expect(screen.getByTestId('editor-student-name')).toHaveTextContent('Carlos Mendez')
  })

  it('hides student name in metadata strip when null', async () => {
    renderWithProviders()

    await screen.findByTestId('lesson-title')
    expect(screen.queryByTestId('editor-student-name')).not.toBeInTheDocument()
  })

  it('renders Save and Cancel buttons when inline scheduling is active', async () => {
    mockGetLesson.mockResolvedValue({ ...mockLessonFull, scheduledAt: null })
    renderWithProviders()

    await screen.findByTestId('lesson-title')

    // Expand metadata strip
    const metaStrip = screen.getByText('English').closest('[role="button"]') as HTMLElement
    metaStrip.click()

    const scheduleBtn = await screen.findByTestId('quick-schedule-btn')
    scheduleBtn.click()

    // Both Save and Cancel must be in the DOM (not overflow-clipped out of the DOM)
    expect(await screen.findByRole('button', { name: /save/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    expect(screen.getByTestId('inline-schedule-input')).toBeInTheDocument()
  })

  it('shows scheduled date badge in metadata strip', async () => {
    renderWithProviders()

    await screen.findByTestId('lesson-title')
    const badges = screen.getAllByText((_content, element) =>
      element?.tagName === 'SPAN' &&
      element.className.includes('amber') &&
      element.textContent !== null &&
      element.textContent.length > 0
    )
    expect(badges.length).toBeGreaterThan(0)
  })

  it('shows scheduled date in expanded metadata view', async () => {
    renderWithProviders()

    await screen.findByTestId('lesson-title')

    const metaStrip = screen.getByText('English').closest('[role="button"]') as HTMLElement
    metaStrip.click()

    const scheduledText = await screen.findByText(/Scheduled:/)
    expect(scheduledText).toBeInTheDocument()
  })

  it('renders without scheduledAt when null', async () => {
    mockGetLesson.mockResolvedValue({ ...mockLessonFull, scheduledAt: null })
    renderWithProviders()

    await screen.findByTestId('lesson-title')
    expect(screen.queryByText(/Scheduled:/)).not.toBeInTheDocument()
  })

  it('shows Lesson Notes card when studentId is present', async () => {
    mockGetLesson.mockResolvedValue({ ...mockLessonFull, studentId: 'student-1' })
    renderWithProviders()

    await screen.findByTestId('lesson-title')
    expect(screen.getByTestId('lesson-notes-card')).toBeInTheDocument()
  })

  it('hides Lesson Notes card when studentId is null', async () => {
    mockGetLesson.mockResolvedValue({ ...mockLessonFull, studentId: null })
    renderWithProviders()

    await screen.findByTestId('lesson-title')
    expect(screen.queryByTestId('lesson-notes-card')).not.toBeInTheDocument()
  })

  describe('section rendering', () => {
    it('renders only sections present in the lesson (3 of 5)', async () => {
      mockGetLesson.mockResolvedValue(mockLessonPartial)
      renderWithProviders()

      await screen.findByTestId('lesson-title')

      expect(screen.getByTestId('section-card-warmup')).toBeInTheDocument()
      expect(screen.getByTestId('section-card-practice')).toBeInTheDocument()
      expect(screen.getByTestId('section-card-production')).toBeInTheDocument()
      expect(screen.queryByTestId('section-card-presentation')).not.toBeInTheDocument()
      expect(screen.queryByTestId('section-card-wrapup')).not.toBeInTheDocument()
    })

    it('renders all 5 sections when lesson has all 5', async () => {
      renderWithProviders()

      await screen.findByTestId('lesson-title')

      expect(screen.getByTestId('section-card-warmup')).toBeInTheDocument()
      expect(screen.getByTestId('section-card-presentation')).toBeInTheDocument()
      expect(screen.getByTestId('section-card-practice')).toBeInTheDocument()
      expect(screen.getByTestId('section-card-production')).toBeInTheDocument()
      expect(screen.getByTestId('section-card-wrapup')).toBeInTheDocument()
    })

    it('hides Add Section dropdown when all 5 sections present', async () => {
      renderWithProviders()

      await screen.findByTestId('lesson-title')
      expect(screen.queryByTestId('add-section-container')).not.toBeInTheDocument()
    })

    it('shows Add Section dropdown with missing types when fewer than 5 sections', async () => {
      mockGetLesson.mockResolvedValue(mockLessonPartial)
      renderWithProviders()

      await screen.findByTestId('lesson-title')
      expect(screen.getByTestId('add-section-select')).toBeInTheDocument()
    })

    it('disables remove button when only 1 section remains', async () => {
      const singleSection = {
        ...mockLessonFull,
        sections: [{ id: 'sec-1', sectionType: 'WarmUp', orderIndex: 0, notes: 'Only one' }],
      }
      mockGetLesson.mockResolvedValue(singleSection)
      renderWithProviders()

      await screen.findByTestId('lesson-title')
      const removeBtn = screen.getByTestId('remove-section-warmup')
      expect(removeBtn).toBeDisabled()
    })

    it('remove button is enabled when multiple sections exist', async () => {
      renderWithProviders()

      await screen.findByTestId('lesson-title')
      const removeBtn = screen.getByTestId('remove-section-warmup')
      expect(removeBtn).not.toBeDisabled()
    })

    it('calls updateSections on add section', async () => {
      mockGetLesson.mockResolvedValue(mockLessonPartial)
      mockUpdateSections.mockResolvedValue({
        ...mockLessonPartial,
        sections: [
          ...mockLessonPartial.sections,
          { id: 'sec-new', sectionType: 'Presentation', orderIndex: 1, notes: null },
        ],
      })

      renderWithProviders()
      await screen.findByTestId('lesson-title')

      const user = userEvent.setup()
      // Open the Add Section select
      await user.click(screen.getByTestId('add-section-select'))
      // Click Presentation option
      const option = await screen.findByText('Presentation')
      await user.click(option)

      expect(mockUpdateSections).toHaveBeenCalledWith(
        'lesson-1',
        expect.arrayContaining([
          expect.objectContaining({ sectionType: 'Presentation' }),
        ]),
      )
    })

    it('calls updateSections on remove section after confirmation', async () => {
      mockUpdateSections.mockResolvedValue({
        ...mockLessonFull,
        sections: mockLessonFull.sections.filter(s => s.sectionType !== 'Practice'),
      })

      renderWithProviders()
      await screen.findByTestId('lesson-title')

      const user = userEvent.setup()
      await user.click(screen.getByTestId('remove-section-practice'))

      // Confirm dialog should appear
      const confirmBtn = await screen.findByTestId('confirm-remove-section')
      await user.click(confirmBtn)

      expect(mockUpdateSections).toHaveBeenCalledWith(
        'lesson-1',
        expect.not.arrayContaining([
          expect.objectContaining({ sectionType: 'Practice' }),
        ]),
      )
    })
  })

  describe('Generate button streaming state', () => {
    beforeEach(() => {
      mockPanelCallbacks.onStreamingChange = undefined
      mockPanelCallbacks.onClose = undefined
    })

    it('disables Generate buttons on other sections while one section is streaming', async () => {
      renderWithProviders()
      await screen.findByTestId('lesson-title')

      const user = userEvent.setup()
      await user.click(screen.getByTestId('generate-btn-warmup'))
      await screen.findByTestId('generate-panel')

      act(() => {
        mockPanelCallbacks.onStreamingChange?.(true)
      })

      expect(screen.getByTestId('generate-btn-presentation')).toBeDisabled()
      expect(screen.getByTestId('generate-btn-practice')).toBeDisabled()
      expect(screen.getByTestId('generate-btn-production')).toBeDisabled()
      expect(screen.getByTestId('generate-btn-wrapup')).toBeDisabled()
    })

    it('shows Stop on the active section Generate button while streaming', async () => {
      renderWithProviders()
      await screen.findByTestId('lesson-title')

      const user = userEvent.setup()
      await user.click(screen.getByTestId('generate-btn-warmup'))
      await screen.findByTestId('generate-panel')

      act(() => {
        mockPanelCallbacks.onStreamingChange?.(true)
      })

      const activeBtn = screen.getByTestId('generate-btn-warmup')
      expect(activeBtn).not.toBeDisabled()
      expect(activeBtn).toHaveTextContent('Stop')
    })

    it('re-enables Generate buttons after streaming ends', async () => {
      renderWithProviders()
      await screen.findByTestId('lesson-title')

      const user = userEvent.setup()
      await user.click(screen.getByTestId('generate-btn-warmup'))
      await screen.findByTestId('generate-panel')

      act(() => { mockPanelCallbacks.onStreamingChange?.(true) })
      act(() => { mockPanelCallbacks.onStreamingChange?.(false) })

      expect(screen.getByTestId('generate-btn-presentation')).not.toBeDisabled()
    })
  })
})
