import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Students from './Students'
import * as studentsApi from '../api/students'

vi.mock('../api/students', () => ({
  getStudents: vi.fn(),
  deleteStudent: vi.fn(),
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

describe('Students error states', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading skeleton while students are fetching', () => {
    vi.mocked(studentsApi.getStudents).mockReturnValue(new Promise(() => {}))
    wrapper(<Students />)
    // Skeleton loading state renders skeleton elements instead of text
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('shows error message when student list fetch fails', async () => {
    vi.mocked(studentsApi.getStudents).mockRejectedValue(new Error('Network error'))
    wrapper(<Students />)
    await screen.findByText('Failed to load students. Please try again.')
  })

  it('shows inline error when delete mutation fails', async () => {
    vi.mocked(studentsApi.getStudents).mockResolvedValue({
      items: [
        {
          id: 'abc-123',
          name: 'Ana García',
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
        },
      ],
      totalCount: 1,
      page: 1,
      pageSize: 20,
    })
    vi.mocked(studentsApi.deleteStudent).mockRejectedValue(new Error('Server error'))

    wrapper(<Students />)

    // Wait for the student card to appear
    await screen.findByTestId('student-name')

    // Open the delete dialog
    fireEvent.click(screen.getByTestId('delete-student'))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()

    // Confirm deletion
    fireEvent.click(screen.getByTestId('confirm-delete'))

    // Error message should appear after the mutation fails
    await waitFor(() => {
      expect(screen.getByTestId('delete-error')).toBeInTheDocument()
    })
    expect(screen.getByTestId('delete-error')).toHaveTextContent(
      'Failed to delete student. Please try again.'
    )
  })

  it('renders student list when fetch succeeds', async () => {
    vi.mocked(studentsApi.getStudents).mockResolvedValue({
      items: [
        {
          id: 'abc-123',
          name: 'Ana García',
          learningLanguage: 'Spanish',
          cefrLevel: 'B2',
          interests: ['travel'],
          notes: null,
          nativeLanguage: null,
          learningGoals: [],
          weaknesses: [],
          difficulties: [],
          createdAt: '',
          updatedAt: '',
        },
      ],
      totalCount: 1,
      page: 1,
      pageSize: 20,
    })

    wrapper(<Students />)
    await screen.findByTestId('student-name')
    expect(screen.getByText('Ana García')).toBeInTheDocument()
  })

  it('shows native language badge as "Native: X" when set', async () => {
    vi.mocked(studentsApi.getStudents).mockResolvedValue({
      items: [
        {
          id: 'abc-123',
          name: 'Ana García',
          learningLanguage: 'Spanish',
          cefrLevel: 'B2',
          interests: [],
          notes: null,
          nativeLanguage: 'Portuguese',
          learningGoals: [],
          weaknesses: [],
          difficulties: [],
          createdAt: '',
          updatedAt: '',
        },
      ],
      totalCount: 1,
      page: 1,
      pageSize: 20,
    })

    wrapper(<Students />)
    await screen.findByTestId('native-language-chip')
    expect(screen.getByTestId('native-language-chip')).toHaveTextContent('Native: Portuguese')
  })

  it('renders scroll sentinel element and no loading indicator when all students fit one page', async () => {
    vi.mocked(studentsApi.getStudents).mockResolvedValue({
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 20,
    })

    wrapper(<Students />)
    await waitFor(() => {
      expect(document.querySelector('[data-testid="scroll-sentinel"]')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('fetch-next-loading')).not.toBeInTheDocument()
  })

  it('fetches next page when sentinel enters viewport and more pages exist', async () => {
    const originalIO = globalThis.IntersectionObserver
    let triggerIntersect: () => void = () => {}
    globalThis.IntersectionObserver = class {
      callback: IntersectionObserverCallback
      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback
        triggerIntersect = () =>
          callback(
            [{ isIntersecting: true } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver
          )
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof IntersectionObserver

    try {
      const page1Items = Array.from({ length: 20 }, (_, i) => ({
        id: `id-${i}`,
        name: `Student ${i}`,
        learningLanguage: 'Spanish',
        cefrLevel: 'B1',
        interests: [] as string[],
        notes: null,
        nativeLanguage: null,
        learningGoals: [] as string[],
        weaknesses: [] as string[],
        difficulties: [] as studentsApi.Difficulty[],
        createdAt: '',
        updatedAt: '',
      }))

      vi.mocked(studentsApi.getStudents)
        .mockResolvedValueOnce({ items: page1Items, totalCount: 21, page: 1, pageSize: 20 })
        .mockResolvedValueOnce({
          items: [{ id: 'id-20', name: 'Student 20', learningLanguage: 'Spanish', cefrLevel: 'B1', interests: [], notes: null, nativeLanguage: null, learningGoals: [], weaknesses: [], difficulties: [], createdAt: '', updatedAt: '' }],
          totalCount: 21,
          page: 2,
          pageSize: 20,
        })

      wrapper(<Students />)

      await waitFor(() => expect(screen.getAllByTestId('student-name').length).toBe(20))

      act(() => triggerIntersect())

      await waitFor(() => expect(studentsApi.getStudents).toHaveBeenCalledWith({ page: 2 }))
      await waitFor(() => expect(screen.getAllByTestId('student-name').length).toBe(21))
    } finally {
      globalThis.IntersectionObserver = originalIO
    }
  })

  it('hides target language badge when native language is set', async () => {
    vi.mocked(studentsApi.getStudents).mockResolvedValue({
      items: [
        {
          id: 'abc-123',
          name: 'Ana García',
          learningLanguage: 'Spanish',
          cefrLevel: 'B2',
          interests: [],
          notes: null,
          nativeLanguage: 'Portuguese',
          learningGoals: [],
          weaknesses: [],
          difficulties: [],
          createdAt: '',
          updatedAt: '',
        },
      ],
      totalCount: 1,
      page: 1,
      pageSize: 20,
    })

    wrapper(<Students />)
    await screen.findByTestId('native-language-chip')
    // Target language badge should not appear when L1 is shown
    expect(screen.queryByText('Spanish')).not.toBeInTheDocument()
  })
})
