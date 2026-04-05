import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CourseSuggestionsPanel } from './CourseSuggestionsPanel'
import type { CourseSuggestion } from '../../api/courseSuggestions'

const mockGetSuggestions = vi.fn()
const mockGenerateSuggestions = vi.fn()
const mockRespondToSuggestion = vi.fn()

vi.mock('../../api/courseSuggestions', () => ({
  getSuggestions: (...args: unknown[]) => mockGetSuggestions(...args),
  generateSuggestions: (...args: unknown[]) => mockGenerateSuggestions(...args),
  respondToSuggestion: (...args: unknown[]) => mockRespondToSuggestion(...args),
}))

const courseId = 'course-123'

const pendingSuggestion: CourseSuggestion = {
  id: 'sug-1',
  courseId,
  curriculumEntryId: 'entry-1',
  curriculumEntryTopic: 'Tourism Vocabulary',
  curriculumEntryOrderIndex: 1,
  proposedChange: 'Add a subjunctive review activity.',
  reasoning: 'Student struggled with subjunctive.',
  status: 'pending',
  teacherEdit: null,
  generatedAt: '2026-04-05T10:00:00Z',
  respondedAt: null,
}

const acceptedSuggestion: CourseSuggestion = {
  ...pendingSuggestion,
  id: 'sug-2',
  status: 'accepted',
  respondedAt: '2026-04-05T11:00:00Z',
  proposedChange: 'Increase speaking time.',
  reasoning: 'Student has speaking difficulty.',
}

function renderPanel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <CourseSuggestionsPanel courseId={courseId} />
    </QueryClientProvider>,
  )
}

describe('CourseSuggestionsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSuggestions.mockResolvedValue([])
    mockGenerateSuggestions.mockResolvedValue([pendingSuggestion])
    mockRespondToSuggestion.mockResolvedValue({ ...pendingSuggestion, status: 'accepted' })
  })

  it('renders empty state when no suggestions', async () => {
    renderPanel()
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument())
  })

  it('shows pending suggestion card', async () => {
    mockGetSuggestions.mockResolvedValue([pendingSuggestion])
    renderPanel()
    await waitFor(() =>
      expect(screen.getByTestId(`suggestion-card-${pendingSuggestion.id}`)).toBeInTheDocument(),
    )
    expect(screen.getByText('Add a subjunctive review activity.')).toBeInTheDocument()
    expect(screen.getByText(/Student struggled with subjunctive/)).toBeInTheDocument()
  })

  it('accept button calls respondToSuggestion with action=accept', async () => {
    mockGetSuggestions.mockResolvedValue([pendingSuggestion])
    renderPanel()
    await waitFor(() => screen.getByTestId('accept-btn'))

    fireEvent.click(screen.getByTestId('accept-btn'))

    await waitFor(() =>
      expect(mockRespondToSuggestion).toHaveBeenCalledWith(courseId, pendingSuggestion.id, { action: 'accept' }),
    )
  })

  it('dismiss button calls respondToSuggestion with action=dismiss', async () => {
    mockGetSuggestions.mockResolvedValue([pendingSuggestion])
    renderPanel()
    await waitFor(() => screen.getByTestId('dismiss-btn'))

    fireEvent.click(screen.getByTestId('dismiss-btn'))

    await waitFor(() =>
      expect(mockRespondToSuggestion).toHaveBeenCalledWith(courseId, pendingSuggestion.id, { action: 'dismiss' }),
    )
  })

  it('Edit & Accept shows textarea, confirm calls with teacherEdit', async () => {
    mockGetSuggestions.mockResolvedValue([pendingSuggestion])
    renderPanel()
    await waitFor(() => screen.getByTestId('edit-btn'))

    fireEvent.click(screen.getByTestId('edit-btn'))
    const textarea = screen.getByTestId('edit-textarea') as HTMLTextAreaElement
    expect(textarea).toBeInTheDocument()
    expect(textarea.value).toBe('Add a subjunctive review activity.')

    fireEvent.change(textarea, { target: { value: 'Edited proposal' } })
    fireEvent.click(screen.getByTestId('confirm-edit-btn'))

    await waitFor(() =>
      expect(mockRespondToSuggestion).toHaveBeenCalledWith(courseId, pendingSuggestion.id, {
        action: 'accept',
        teacherEdit: 'Edited proposal',
      }),
    )
  })

  it('history section shows accepted suggestions when toggled', async () => {
    mockGetSuggestions.mockResolvedValue([acceptedSuggestion])
    renderPanel()
    await waitFor(() => screen.getByTestId('history-toggle'))

    expect(screen.queryByTestId(`suggestion-card-${acceptedSuggestion.id}`)).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('history-toggle'))
    expect(screen.getByTestId(`suggestion-card-${acceptedSuggestion.id}`)).toBeInTheDocument()
  })

  it('generate button calls generateSuggestions', async () => {
    renderPanel()
    await waitFor(() => screen.getByTestId('generate-btn'))

    fireEvent.click(screen.getByTestId('generate-btn'))

    await waitFor(() => expect(mockGenerateSuggestions).toHaveBeenCalledWith(courseId))
  })
})
