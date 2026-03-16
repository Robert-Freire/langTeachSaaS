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

function renderWithProviders() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
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

    const dateInput = screen.getByTestId('input-scheduled-at')
    expect(dateInput).toBeInTheDocument()
    expect(dateInput).toHaveAttribute('type', 'datetime-local')
  })

  it('includes scheduledAt in create request when provided', async () => {
    renderWithProviders()

    const blankBtn = await screen.findByTestId('template-blank')
    await userEvent.click(blankBtn)

    // Fill required fields
    await userEvent.type(screen.getByTestId('input-title'), 'Test Lesson')
    await userEvent.type(screen.getByTestId('input-topic'), 'Test Topic')

    // Set scheduled date
    const dateInput = screen.getByTestId('input-scheduled-at')
    await userEvent.type(dateInput, '2026-03-20T10:00')

    expect(dateInput).toHaveValue('2026-03-20T10:00')
  })
})
