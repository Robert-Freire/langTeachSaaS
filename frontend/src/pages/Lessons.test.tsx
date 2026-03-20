import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Lessons from './Lessons'
import * as lessonsApi from '../api/lessons'

vi.mock('../api/lessons', () => ({
  getLessons: vi.fn(),
  deleteLesson: vi.fn(),
  duplicateLesson: vi.fn(),
}))

vi.mock('../lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

function wrapper(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

const mockLesson = {
  id: 'lesson-1',
  title: 'Greetings and Introductions',
  language: 'English',
  cefrLevel: 'A1',
  topic: 'Greetings',
  durationMinutes: 45,
  status: 'Draft' as const,
  studentId: 'student-1',
  studentName: 'Carlos Mendez',
  templateId: null,
  sections: [],
  createdAt: '2026-03-10T10:00:00Z',
  updatedAt: '2026-03-10T10:00:00Z',
  scheduledAt: null,
  objectives: null,
}

describe('Lessons list', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows student name on lesson card when present', async () => {
    vi.mocked(lessonsApi.getLessons).mockResolvedValue({ items: [mockLesson], totalCount: 1, page: 1, pageSize: 20 })
    wrapper(<Lessons />)

    const nameEl = await screen.findByTestId('lesson-student-name')
    expect(nameEl).toHaveTextContent('Carlos Mendez')
  })

  it('omits student name on lesson card when null', async () => {
    vi.mocked(lessonsApi.getLessons).mockResolvedValue({
      items: [{ ...mockLesson, studentId: null, studentName: null }],
      totalCount: 1, page: 1, pageSize: 20,
    })
    wrapper(<Lessons />)

    await screen.findByTestId('lesson-title')
    expect(screen.queryByTestId('lesson-student-name')).not.toBeInTheDocument()
  })

  it('shows empty state when no lessons', async () => {
    vi.mocked(lessonsApi.getLessons).mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 20 })
    wrapper(<Lessons />)

    await screen.findByTestId('empty-state')
  })

  it('shows error message when fetch fails', async () => {
    vi.mocked(lessonsApi.getLessons).mockRejectedValue(new Error('Network error'))
    wrapper(<Lessons />)

    await screen.findByText('Failed to load lessons. Please try again.')
  })

  it('shows title-case defaults in filter dropdowns', async () => {
    vi.mocked(lessonsApi.getLessons).mockResolvedValue({ items: [mockLesson], totalCount: 1, page: 1, pageSize: 20 })
    wrapper(<Lessons />)

    await screen.findByTestId('lesson-title')

    expect(screen.getByTestId('filter-language')).toHaveTextContent('All Languages')
    expect(screen.getByTestId('filter-level')).toHaveTextContent('All Levels')
    expect(screen.getByTestId('filter-status')).toHaveTextContent('All Statuses')
  })
})
