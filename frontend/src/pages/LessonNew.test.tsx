import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import LessonNew from './LessonNew'

const mockCreateLesson = vi.fn()
const mockGetLessonTemplates = vi.fn()
const mockGetStudents = vi.fn()

vi.mock('../api/lessons', () => ({
  createLesson: (...args: unknown[]) => mockCreateLesson(...args),
  getLessonTemplates: (...args: unknown[]) => mockGetLessonTemplates(...args),
}))

vi.mock('../api/students', () => ({
  getStudents: (...args: unknown[]) => mockGetStudents(...args),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderWithProviders(initialEntries?: string[]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={initialEntries ?? ['/lessons/new']}>
        <LessonNew />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('LessonNew', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetLessonTemplates.mockResolvedValue([])
    mockGetStudents.mockResolvedValue({ items: [], totalCount: 0 })
    mockCreateLesson.mockResolvedValue({ id: 'new-id', title: 'Test' })
  })

  it('renders the scheduled date picker on step 2', async () => {
    renderWithProviders()

    // Move to step 2 by clicking blank template
    const blankBtn = await screen.findByTestId('template-blank')
    await userEvent.click(blankBtn)

    const datePicker = screen.getByTestId('input-scheduled-at')
    expect(datePicker).toBeInTheDocument()
    // DateTimePicker renders a button trigger (not a native input)
    expect(datePicker.tagName).toBe('BUTTON')
  })

  it('pre-fills studentId and scheduledAt from URL query params', async () => {
    mockGetStudents.mockResolvedValue({
      items: [{ id: 'stu-1', name: 'Marco', learningLanguage: 'English', cefrLevel: 'B1', interests: [], notes: null, nativeLanguage: null, learningGoals: [], weaknesses: [], createdAt: '', updatedAt: '' }],
      totalCount: 1,
    })

    renderWithProviders(['/lessons/new?studentId=stu-1&scheduledAt=2026-03-20T10:00'])

    const blankBtn = await screen.findByTestId('template-blank')
    await userEvent.click(blankBtn)

    // DateTimePicker should display the formatted date
    const datePicker = screen.getByTestId('input-scheduled-at')
    expect(datePicker.textContent).toContain('2026')

    // Student should be pre-selected (shown in the trigger)
    expect(screen.getByText('Marco')).toBeInTheDocument()
  })

  it('renders date picker with placeholder when no date is set', async () => {
    renderWithProviders()

    const blankBtn = await screen.findByTestId('template-blank')
    await userEvent.click(blankBtn)

    const datePicker = screen.getByTestId('input-scheduled-at')
    expect(datePicker.textContent).toContain('Pick a date')
  })
})
