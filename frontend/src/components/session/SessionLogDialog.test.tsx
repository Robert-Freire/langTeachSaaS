import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionLogDialog } from './SessionLogDialog'
import * as sessionLogsApi from '../../api/sessionLogs'
import type { SessionLog } from '../../api/sessionLogs'
import * as lessonsApi from '../../api/lessons'

vi.mock('../../api/sessionLogs', () => ({
  listSessions: vi.fn(),
  createSession: vi.fn(),
  updateSession: vi.fn(),
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

const SAMPLE_SESSION: SessionLog = {
  id: 'session-42',
  studentId: STUDENT_ID,
  sessionDate: '2026-03-15T00:00:00Z',
  plannedContent: 'Subjunctive introduction',
  actualContent: 'Covered ser vs estar',
  homeworkAssigned: 'Exercise 4A',
  previousHomeworkStatus: 0,
  previousHomeworkStatusName: 'Done',
  nextSessionTopics: 'Review homework errors',
  generalNotes: 'Student was tired',
  levelReassessmentSkill: 'Speaking',
  levelReassessmentLevel: 'B1.2',
  linkedLessonId: null,
  topicTags: '[]',
  createdAt: '2026-03-15T10:00:00Z',
  updatedAt: '2026-03-15T10:00:00Z',
}

function wrapper(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('SessionLogDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
        actualContent: 'Some content', homeworkAssigned: null, previousHomeworkStatus: 3,
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
        actualContent: 'Some content', homeworkAssigned: 'Read chapter 3', previousHomeworkStatus: 3,
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

  it('renders next-session-topics as a textarea', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([])

    wrapper(
      <SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />
    )

    await waitFor(() => expect(screen.getByTestId('next-session-topics')).toBeInTheDocument())

    const field = screen.getByTestId('next-session-topics') as HTMLTextAreaElement
    expect(field.tagName).toBe('TEXTAREA')
    expect(field.rows).toBe(3)
  })

  describe('edit mode', () => {
    beforeEach(() => {
      vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([])
    })

    it('shows "Edit Session" title and "Save changes" button', async () => {
      wrapper(
        <SessionLogDialog
          studentId={STUDENT_ID}
          open={true}
          onOpenChange={vi.fn()}
          initialSession={SAMPLE_SESSION}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Edit Session')).toBeInTheDocument()
        expect(screen.getByTestId('submit-session-log')).toHaveTextContent('Save changes')
      })
    })

    it('pre-populates all fields from initialSession', async () => {
      wrapper(
        <SessionLogDialog
          studentId={STUDENT_ID}
          open={true}
          onOpenChange={vi.fn()}
          initialSession={SAMPLE_SESSION}
        />
      )

      await waitFor(() => {
        expect((screen.getByTestId('session-date') as HTMLInputElement).value).toBe('2026-03-15')
        expect((screen.getByTestId('planned-content') as HTMLTextAreaElement).value).toBe('Subjunctive introduction')
        expect((screen.getByTestId('actual-content') as HTMLTextAreaElement).value).toBe('Covered ser vs estar')
        expect((screen.getByTestId('homework-assigned') as HTMLInputElement).value).toBe('Exercise 4A')
        expect((screen.getByTestId('next-session-topics') as HTMLTextAreaElement).value).toBe('Review homework errors')
        expect((screen.getByTestId('general-notes') as HTMLTextAreaElement).value).toBe('Student was tired')
        expect(screen.getByTestId('reassessment-toggle')).toBeChecked()
      })
    })

    it('calls updateSession instead of createSession on submit', async () => {
      vi.mocked(sessionLogsApi.updateSession).mockResolvedValue({
        ...SAMPLE_SESSION,
        actualContent: 'Updated content',
      })

      wrapper(
        <SessionLogDialog
          studentId={STUDENT_ID}
          open={true}
          onOpenChange={vi.fn()}
          initialSession={SAMPLE_SESSION}
        />
      )

      await waitFor(() => expect(screen.getByTestId('submit-session-log')).toBeInTheDocument())

      fireEvent.click(screen.getByTestId('submit-session-log'))

      await waitFor(() => {
        expect(vi.mocked(sessionLogsApi.updateSession)).toHaveBeenCalledWith(
          STUDENT_ID,
          SAMPLE_SESSION.id,
          expect.objectContaining({ sessionDate: '2026-03-15' }),
        )
        expect(vi.mocked(sessionLogsApi.createSession)).not.toHaveBeenCalled()
      })
    })
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

  it('shows validation error when session date is in the future', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([])

    // Pre-populate with a far-future date via initialSession (edit mode)
    const futureSession: SessionLog = {
      ...SAMPLE_SESSION,
      sessionDate: '2099-12-31T00:00:00Z',
    }

    wrapper(
      <SessionLogDialog
        studentId={STUDENT_ID}
        open={true}
        onOpenChange={vi.fn()}
        initialSession={futureSession}
      />
    )

    // Wait for the form to pre-populate
    await waitFor(() => {
      const dateInput = screen.getByTestId('session-date') as HTMLInputElement
      expect(dateInput.value).toBe('2099-12-31')
    })

    // Submit via the form element directly (base-ui button type handling may vary)
    const form = screen.getByTestId('session-log-dialog').querySelector('form')!
    fireEvent.submit(form)

    expect(await screen.findByText(/cannot be in the future/i)).toBeInTheDocument()
    expect(vi.mocked(sessionLogsApi.updateSession)).not.toHaveBeenCalled()
  })
})
