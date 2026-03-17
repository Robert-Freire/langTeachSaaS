import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import LessonEditor from './LessonEditor'

const mockLesson = {
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

const mockGetLesson = vi.fn()
const mockUpdateLesson = vi.fn()
const mockGetStudents = vi.fn()
const mockGetContentBlocks = vi.fn()

const mockGetLessonNotes = vi.fn()
const mockSaveLessonNotes = vi.fn()

vi.mock('../api/lessons', () => ({
  getLesson: (...args: unknown[]) => mockGetLesson(...args),
  updateLesson: (...args: unknown[]) => mockUpdateLesson(...args),
  updateSections: vi.fn().mockResolvedValue({}),
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
    mockGetLesson.mockResolvedValue(mockLesson)
    mockGetStudents.mockResolvedValue({ items: [], totalCount: 0 })
    mockGetContentBlocks.mockResolvedValue([])
    mockUpdateLesson.mockResolvedValue(mockLesson)
    mockGetLessonNotes.mockResolvedValue(null)
    mockSaveLessonNotes.mockResolvedValue({})
  })

  it('shows scheduled date badge in metadata strip', async () => {
    renderWithProviders()

    // Wait for lesson to load then check for the scheduled date badge
    await screen.findByTestId('lesson-title')
    // The date badge uses toLocaleDateString which varies by locale; check for any date-like text in amber badge
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

    // Wait for lesson to load
    await screen.findByTestId('lesson-title')

    // Expand metadata
    const metaStrip = screen.getByText('English').closest('[role="button"]') as HTMLElement
    metaStrip.click()

    const scheduledText = await screen.findByText(/Scheduled:/)
    expect(scheduledText).toBeInTheDocument()
  })

  it('renders without scheduledAt when null', async () => {
    mockGetLesson.mockResolvedValue({ ...mockLesson, scheduledAt: null })
    renderWithProviders()

    await screen.findByTestId('lesson-title')
    expect(screen.queryByText(/Scheduled:/)).not.toBeInTheDocument()
  })

  it('shows Lesson Notes card when studentId is present', async () => {
    mockGetLesson.mockResolvedValue({ ...mockLesson, studentId: 'student-1' })
    renderWithProviders()

    await screen.findByTestId('lesson-title')
    expect(screen.getByTestId('lesson-notes-card')).toBeInTheDocument()
  })

  it('hides Lesson Notes card when studentId is null', async () => {
    mockGetLesson.mockResolvedValue({ ...mockLesson, studentId: null })
    renderWithProviders()

    await screen.findByTestId('lesson-title')
    expect(screen.queryByTestId('lesson-notes-card')).not.toBeInTheDocument()
  })
})
