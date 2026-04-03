import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionLogDialog } from './SessionLogDialog'
import * as sessionLogsApi from '../../api/sessionLogs'
import * as lessonsApi from '../../api/lessons'

vi.mock('../../api/sessionLogs', () => ({
  listSessions: vi.fn(),
  createSession: vi.fn(),
  serializeTopicTags: vi.fn((tags) => JSON.stringify(tags)),
  parseTopicTags: vi.fn((raw) => JSON.parse(raw)),
}))

vi.mock('../../api/lessons', () => ({
  getLessons: vi.fn(),
}))

// Minimal mock of TopicTagsInput to isolate SessionLogDialog tests
vi.mock('./TopicTagsInput', () => ({
  TopicTagsInput: ({ onChange }: { onChange: (tags: []) => void }) => (
    <div data-testid="topic-tags-input" onClick={() => onChange([])} />
  ),
}))

const STUDENT_ID = 'student-1'

function wrapper(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('SessionLogDialog', () => {
  beforeEach(() => {
    vi.mocked(lessonsApi.getLessons).mockResolvedValue({
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 100,
    })
  })

  it('does not show prev homework status when previous session has no homework', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([
      {
        id: 's1', studentId: STUDENT_ID, sessionDate: '2026-03-30', plannedContent: null,
        actualContent: 'Some content', homeworkAssigned: null, previousHomeworkStatus: 'NotApplicable',
        previousHomeworkStatusName: 'Not applicable', nextSessionTopics: null, generalNotes: null,
        levelReassessmentSkill: null, levelReassessmentLevel: null, linkedLessonId: null,
        topicTags: '[]', createdAt: '2026-03-30T10:00:00Z', updatedAt: '2026-03-30T10:00:00Z',
      },
    ])

    wrapper(
      <SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />
    )

    await waitFor(() => {
      expect(screen.queryByTestId('prev-homework-status')).not.toBeInTheDocument()
    })
  })

  it('shows prev homework status when previous session has homework', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([
      {
        id: 's1', studentId: STUDENT_ID, sessionDate: '2026-03-30', plannedContent: null,
        actualContent: 'Some content', homeworkAssigned: 'Read chapter 3', previousHomeworkStatus: 'NotApplicable',
        previousHomeworkStatusName: 'Not applicable', nextSessionTopics: null, generalNotes: null,
        levelReassessmentSkill: null, levelReassessmentLevel: null, linkedLessonId: null,
        topicTags: '[]', createdAt: '2026-03-30T10:00:00Z', updatedAt: '2026-03-30T10:00:00Z',
      },
    ])

    wrapper(
      <SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />
    )

    await waitFor(() => {
      expect(screen.getByTestId('prev-homework-status')).toBeInTheDocument()
    })
  })

  it('shows reassessment fields only when toggle is on', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([])

    wrapper(
      <SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />
    )

    await waitFor(() => {
      expect(screen.queryByTestId('reassessment-skill')).not.toBeInTheDocument()
      expect(screen.queryByTestId('reassessment-level')).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('reassessment-toggle'))

    expect(screen.getByTestId('reassessment-skill')).toBeInTheDocument()
    expect(screen.getByTestId('reassessment-level')).toBeInTheDocument()
  })

  it('auto-populates planned content when lessonObjectives provided', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([])

    wrapper(
      <SessionLogDialog
        studentId={STUDENT_ID}
        open={true}
        onOpenChange={vi.fn()}
        linkedLessonId="lesson-1"
        lessonTitle="Unit 3"
        lessonObjectives="Practice ser/estar in context"
      />
    )

    await waitFor(() => {
      const textarea = screen.getByTestId('planned-content') as HTMLTextAreaElement
      expect(textarea.value).toBe('Unit 3: Practice ser/estar in context')
    })
  })

  it('blocks submit when both planned and actual content are empty', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([])

    wrapper(
      <SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />
    )

    await waitFor(() => expect(screen.getByTestId('submit-session-log')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('submit-session-log'))

    expect(await screen.findByText(/at least one of/i)).toBeInTheDocument()
    expect(vi.mocked(sessionLogsApi.createSession)).not.toHaveBeenCalled()
  })

  it('shows CEFR validation error for invalid sub-level', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([])

    wrapper(
      <SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />
    )

    await waitFor(() => expect(screen.getByTestId('submit-session-log')).toBeInTheDocument())

    // Enable reassessment
    fireEvent.click(screen.getByTestId('reassessment-toggle'))

    // Type invalid level
    fireEvent.change(screen.getByTestId('reassessment-level'), { target: { value: 'A3.5' } })

    // Fill actual content so other validation passes
    fireEvent.change(screen.getByTestId('actual-content'), { target: { value: 'We did grammar.' } })

    fireEvent.click(screen.getByTestId('submit-session-log'))

    expect(await screen.findByText(/valid cefr sub-level/i)).toBeInTheDocument()
    expect(vi.mocked(sessionLogsApi.createSession)).not.toHaveBeenCalled()
  })
})
