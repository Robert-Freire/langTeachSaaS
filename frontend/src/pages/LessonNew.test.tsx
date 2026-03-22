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

const STUDENT_WITH_PROFILE = {
  id: 'stu-1',
  name: 'Marco',
  learningLanguage: 'Spanish',
  cefrLevel: 'B2',
  interests: [],
  notes: null,
  nativeLanguage: null,
  learningGoals: [],
  weaknesses: [],
  difficulties: [],
  createdAt: '',
  updatedAt: '',
}

async function goToStep2(initialEntries?: string[]) {
  renderWithProviders(initialEntries)
  const blankBtn = await screen.findByTestId('template-blank')
  await userEvent.click(blankBtn)
  await screen.findByText('Lesson Details')
}

describe('LessonNew', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetLessonTemplates.mockResolvedValue([])
    mockGetStudents.mockResolvedValue({ items: [], totalCount: 0 })
    mockCreateLesson.mockResolvedValue({ id: 'new-id', title: 'Test' })
  })

  it('renders the scheduled date picker on step 2', async () => {
    await goToStep2()

    const datePicker = screen.getByTestId('input-scheduled-at')
    expect(datePicker).toBeInTheDocument()
    expect(datePicker.textContent).toContain('Pick a date')
  })

  it('pre-fills studentId and scheduledAt from URL query params', async () => {
    mockGetStudents.mockResolvedValue({ items: [STUDENT_WITH_PROFILE], totalCount: 1 })

    await goToStep2(['/lessons/new?studentId=stu-1&scheduledAt=2026-03-20T10:00'])

    const datePicker = screen.getByTestId('input-scheduled-at')
    expect(datePicker.textContent).toContain('2026')
    expect(screen.getByText('Marco')).toBeInTheDocument()
  })

  it('renders date picker with placeholder when no date is set', async () => {
    await goToStep2()

    const datePicker = screen.getByTestId('input-scheduled-at')
    expect(datePicker.textContent).toContain('Pick a date')
  })

  it('student selector appears before language and level in the DOM', async () => {
    mockGetStudents.mockResolvedValue({ items: [STUDENT_WITH_PROFILE], totalCount: 1 })

    await goToStep2()

    const studentTrigger = screen.getByTestId('select-student')
    const languageTrigger = screen.getByTestId('select-language')

    const position = studentTrigger.compareDocumentPosition(languageTrigger)
    // DOCUMENT_POSITION_FOLLOWING means languageTrigger comes after studentTrigger
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('auto-fills language and CEFR level when a student is selected', async () => {
    mockGetStudents.mockResolvedValue({ items: [STUDENT_WITH_PROFILE], totalCount: 1 })

    await goToStep2()

    await userEvent.click(screen.getByTestId('select-student'))
    await userEvent.click(await screen.findByRole('option', { name: 'Marco' }))

    expect(screen.getByTestId('select-language').textContent).toContain('Spanish')
    expect(screen.getByTestId('select-level').textContent).toContain('B2')
  })

  it('clearing student selection does not clear language and level', async () => {
    mockGetStudents.mockResolvedValue({ items: [STUDENT_WITH_PROFILE], totalCount: 1 })

    await goToStep2()

    // Select student to auto-fill
    await userEvent.click(screen.getByTestId('select-student'))
    await userEvent.click(await screen.findByRole('option', { name: 'Marco' }))

    // Language and level should be auto-filled
    expect(screen.getByTestId('select-language').textContent).toContain('Spanish')
    expect(screen.getByTestId('select-level').textContent).toContain('B2')

    // Clear the student
    await userEvent.click(screen.getByTestId('select-student'))
    await userEvent.click(await screen.findByRole('option', { name: 'No student' }))

    // Language and level should still show the auto-filled values
    expect(screen.getByTestId('select-language').textContent).toContain('Spanish')
    expect(screen.getByTestId('select-level').textContent).toContain('B2')
  })
})
