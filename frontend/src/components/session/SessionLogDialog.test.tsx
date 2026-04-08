import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
  extractSessionReflection: vi.fn(),
  serializeTopicTags: vi.fn((tags) => JSON.stringify(tags)),
  parseTopicTags: vi.fn((raw) => JSON.parse(raw)),
}))

vi.mock('../../api/lessons', () => ({
  getLessons: vi.fn(),
}))

// AudioRecorder mock: exposes a button that fires onVoiceNote when clicked
vi.mock('../audio/AudioRecorder', () => ({
  AudioRecorder: ({ onVoiceNote, disabled }: { onVoiceNote: (note: { id: string; transcription: string }) => void; disabled?: boolean }) => {
    return (
      <button
        type="button"
        data-testid="mock-audio-recorder-trigger"
        disabled={disabled}
        onClick={() => onVoiceNote({ id: 'vn-1', transcription: 'We covered ser vs estar.' })}
      >
        Record
      </button>
    )
  },
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
  isCancelled: false,
  status: 0,
  statusName: 'Confirmed' as const,
  mentionedDifficultyPairs: '[]',
        suggestedDifficulties: '[]',
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
        isCancelled: false, status: 0, statusName: 'Confirmed' as const, mentionedDifficultyPairs: '[]',
        suggestedDifficulties: '[]',
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
        isCancelled: false, status: 0, statusName: 'Confirmed' as const, mentionedDifficultyPairs: '[]',
        suggestedDifficulties: '[]',
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

  it('shows (optional) label on "What was actually done" field', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([])

    wrapper(
      <SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />
    )

    await waitFor(() => {
      expect(screen.getByTestId('actual-content')).toBeInTheDocument()
    })

    const label = screen.getByText(/What was actually done/i).closest('label')
    expect(label).toHaveTextContent('(optional)')
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

  it('auto-populates planned content when lesson is selected from dropdown', async () => {
    const user = userEvent.setup()

    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([])
    vi.mocked(lessonsApi.getLessons).mockResolvedValue({
      items: [{
        id: 'lesson-99',
        title: 'Unit 5',
        objectives: 'Practice subjunctive mood',
        studentId: STUDENT_ID,
        language: 'Spanish',
        cefrLevel: 'B1',
        topic: 'Subjunctive',
        durationMinutes: 60,
        status: 'Published' as const,
        templateId: null,
        templateName: null,
        sections: [],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        scheduledAt: null,
        studentName: 'Test Student',
        learningTargets: null,
      }],
      totalCount: 1,
      page: 1,
      pageSize: 100,
    })

    wrapper(
      <SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />
    )

    // Wait for the lesson selector to appear
    await waitFor(() => {
      expect(screen.getByTestId('linked-lesson')).toBeInTheDocument()
    })

    // Open the Select dropdown and pick the lesson
    await user.click(screen.getByTestId('linked-lesson'))
    await user.click(await screen.findByRole('option', { name: 'Unit 5' }))

    // Planned content should be auto-populated
    await waitFor(() => {
      const textarea = screen.getByTestId('planned-content') as HTMLTextAreaElement
      expect(textarea.value).toBe('Unit 5: Practice subjunctive mood')
    })
  })

  it('fetches lessons with studentId to avoid client-side filtering', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([])

    wrapper(
      <SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />
    )

    await waitFor(() => {
      expect(vi.mocked(lessonsApi.getLessons)).toHaveBeenCalledWith(
        expect.objectContaining({ studentId: STUDENT_ID })
      )
    })
  })

  it('sends linkedLessonId in payload when lesson is selected', async () => {
    const user = userEvent.setup()

    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([])
    vi.mocked(sessionLogsApi.createSession).mockResolvedValue({
      ...SAMPLE_SESSION,
      id: 'new-session',
      linkedLessonId: 'lesson-99',
    })
    vi.mocked(lessonsApi.getLessons).mockResolvedValue({
      items: [{
        id: 'lesson-99',
        title: 'Unit 5',
        objectives: 'Practice subjunctive mood',
        studentId: STUDENT_ID,
        language: 'Spanish',
        cefrLevel: 'B1',
        topic: 'Subjunctive',
        durationMinutes: 60,
        status: 'Published' as const,
        templateId: null,
        templateName: null,
        sections: [],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        scheduledAt: null,
        studentName: 'Test Student',
        learningTargets: null,
      }],
      totalCount: 1,
      page: 1,
      pageSize: 100,
    })

    wrapper(
      <SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />
    )

    await waitFor(() => expect(screen.getByTestId('linked-lesson')).toBeInTheDocument())

    await user.click(screen.getByTestId('linked-lesson'))
    await user.click(await screen.findByRole('option', { name: 'Unit 5' }))

    // Submit the form
    const form = screen.getByTestId('session-log-dialog').querySelector('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(vi.mocked(sessionLogsApi.createSession)).toHaveBeenCalledWith(
        STUDENT_ID,
        expect.objectContaining({ linkedLessonId: 'lesson-99' }),
      )
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

  describe('previous session topics context block', () => {
    it('shows topics from previous session in create mode', async () => {
      vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([
        {
          id: 's1', studentId: STUDENT_ID, sessionDate: '2026-03-30', plannedContent: null,
          actualContent: 'Some content', homeworkAssigned: null, previousHomeworkStatus: 3,
          previousHomeworkStatusName: 'Not applicable', nextSessionTopics: 'Work on para/por distinction',
          generalNotes: null, levelReassessmentSkill: null, levelReassessmentLevel: null,
          linkedLessonId: null, topicTags: '[]', isCancelled: false, status: 0, statusName: 'Confirmed' as const,
          mentionedDifficultyPairs: '[]',
        suggestedDifficulties: '[]',
          createdAt: '2026-03-30T10:00:00Z', updatedAt: '2026-03-30T10:00:00Z',
        },
      ])

      wrapper(
        <SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />
      )

      await waitFor(() => {
        const block = screen.getByTestId('prev-session-topics')
        expect(block).toBeInTheDocument()
        expect(block).toHaveTextContent('Work on para/por distinction')
      })
    })

    it('hides topics block when there are no previous sessions', async () => {
      vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([])

      wrapper(
        <SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />
      )

      await waitFor(() => expect(screen.getByTestId('session-date')).toBeInTheDocument())
      expect(screen.queryByTestId('prev-session-topics')).not.toBeInTheDocument()
    })

    it('hides topics block when previous session has null nextSessionTopics', async () => {
      vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([
        {
          id: 's1', studentId: STUDENT_ID, sessionDate: '2026-03-30', plannedContent: null,
          actualContent: 'Some content', homeworkAssigned: null, previousHomeworkStatus: 3,
          previousHomeworkStatusName: 'Not applicable', nextSessionTopics: null,
          generalNotes: null, levelReassessmentSkill: null, levelReassessmentLevel: null,
          linkedLessonId: null, topicTags: '[]', isCancelled: false, status: 0, statusName: 'Confirmed' as const,
          mentionedDifficultyPairs: '[]',
        suggestedDifficulties: '[]',
          createdAt: '2026-03-30T10:00:00Z', updatedAt: '2026-03-30T10:00:00Z',
        },
      ])

      wrapper(
        <SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />
      )

      await waitFor(() => expect(screen.getByTestId('session-date')).toBeInTheDocument())
      expect(screen.queryByTestId('prev-session-topics')).not.toBeInTheDocument()
    })

    it('hides topics block in edit mode even when previous session has topics', async () => {
      vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([
        {
          id: 's0', studentId: STUDENT_ID, sessionDate: '2026-03-01', plannedContent: null,
          actualContent: 'Older session', homeworkAssigned: null, previousHomeworkStatus: 3,
          previousHomeworkStatusName: 'Not applicable', nextSessionTopics: 'Review subjunctive',
          generalNotes: null, levelReassessmentSkill: null, levelReassessmentLevel: null,
          linkedLessonId: null, topicTags: '[]', isCancelled: false, status: 0, statusName: 'Confirmed' as const,
          mentionedDifficultyPairs: '[]',
        suggestedDifficulties: '[]',
          createdAt: '2026-03-01T10:00:00Z', updatedAt: '2026-03-01T10:00:00Z',
        },
      ])

      wrapper(
        <SessionLogDialog
          studentId={STUDENT_ID}
          open={true}
          onOpenChange={vi.fn()}
          initialSession={SAMPLE_SESSION}
        />
      )

      await waitFor(() => expect(screen.getByText('Edit Session')).toBeInTheDocument())
      expect(screen.queryByTestId('prev-session-topics')).not.toBeInTheDocument()
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

  it('shows ISO date helper text when a date is entered', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([])

    wrapper(
      <SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />
    )

    await waitFor(() => expect(screen.getByTestId('session-date')).toBeInTheDocument())

    fireEvent.change(screen.getByTestId('session-date'), { target: { value: '2026-04-06' } })

    expect(screen.getByTestId('session-date-iso')).toHaveTextContent('2026-04-06')
  })

  it('shows ISO date helper text pre-populated in edit mode', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([])

    wrapper(
      <SessionLogDialog
        studentId={STUDENT_ID}
        open={true}
        onOpenChange={vi.fn()}
        initialSession={SAMPLE_SESSION}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('session-date-iso')).toHaveTextContent('2026-03-15')
    })
  })

  it('accepts a future session date without validation error', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([])
    vi.mocked(sessionLogsApi.createSession).mockResolvedValue({
      ...SAMPLE_SESSION,
      sessionDate: '2099-12-31T00:00:00Z',
    })

    wrapper(
      <SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />
    )

    await waitFor(() => expect(screen.getByTestId('session-date')).toBeInTheDocument())

    fireEvent.change(screen.getByTestId('session-date'), { target: { value: '2099-12-31' } })
    fireEvent.change(screen.getByTestId('actual-content'), { target: { value: 'Planned content.' } })
    fireEvent.click(screen.getByTestId('submit-session-log'))

    await waitFor(() => {
      expect(vi.mocked(sessionLogsApi.createSession)).toHaveBeenCalledWith(
        STUDENT_ID,
        expect.objectContaining({ sessionDate: '2099-12-31' }),
      )
    })
    expect(screen.queryByText(/cannot be in the future/i)).not.toBeInTheDocument()
  })

  it('renders cancelled toggle unchecked by default', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([])

    wrapper(
      <SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />
    )

    await waitFor(() => expect(screen.getByTestId('cancelled-toggle')).toBeInTheDocument())
    expect(screen.getByTestId('cancelled-toggle')).not.toBeChecked()
  })

  it('includes isCancelled: true in payload when cancelled toggle is checked', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([])
    vi.mocked(sessionLogsApi.createSession).mockResolvedValue({ ...SAMPLE_SESSION, isCancelled: true })

    wrapper(
      <SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />
    )

    await waitFor(() => expect(screen.getByTestId('cancelled-toggle')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('cancelled-toggle'))
    fireEvent.change(screen.getByTestId('planned-content'), { target: { value: 'Planned for tomorrow.' } })
    fireEvent.click(screen.getByTestId('submit-session-log'))

    await waitFor(() => {
      expect(vi.mocked(sessionLogsApi.createSession)).toHaveBeenCalledWith(
        STUDENT_ID,
        expect.objectContaining({ isCancelled: true }),
      )
    })
  })

  it('pre-populates isCancelled from initialSession in edit mode', async () => {
    vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([])

    const cancelledSession: SessionLog = { ...SAMPLE_SESSION, isCancelled: true }

    wrapper(
      <SessionLogDialog
        studentId={STUDENT_ID}
        open={true}
        onOpenChange={vi.fn()}
        initialSession={cancelledSession}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('cancelled-toggle')).toBeChecked()
    })
  })

  describe('voice extraction', () => {
    const EXTRACTED = {
      whatWasCovered: 'Covered ser vs estar',
      areasToImprove: 'Irregular verbs need work',
      emotionalSignals: 'Student was enthusiastic',
      homeworkAssigned: 'Exercise 4A',
      nextLessonIdeas: 'Review preterito',
      suggestedDifficulties: [] as { description: string; competency: string; subcategory: string; severity: string }[],
    }

    beforeEach(() => {
      vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([])
      vi.mocked(sessionLogsApi.extractSessionReflection).mockResolvedValue(EXTRACTED)
      vi.mocked(sessionLogsApi.createSession).mockResolvedValue({
        ...SAMPLE_SESSION,
        id: 'draft-session-id',
        status: 1,
        statusName: 'Draft' as const,
      })
    })

    it('shows AudioRecorder in create mode', async () => {
      wrapper(<SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />)
      await waitFor(() => expect(screen.getByTestId('mock-audio-recorder-trigger')).toBeInTheDocument())
    })

    it('does not show AudioRecorder in edit mode', async () => {
      wrapper(
        <SessionLogDialog
          studentId={STUDENT_ID}
          open={true}
          onOpenChange={vi.fn()}
          initialSession={SAMPLE_SESSION}
        />
      )
      await waitFor(() => expect(screen.getByText('Edit Session')).toBeInTheDocument())
      expect(screen.queryByTestId('mock-audio-recorder-trigger')).not.toBeInTheDocument()
    })

    it('calls extractSessionReflection after voice note received', async () => {
      wrapper(<SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />)
      await waitFor(() => expect(screen.getByTestId('mock-audio-recorder-trigger')).toBeInTheDocument())

      fireEvent.click(screen.getByTestId('mock-audio-recorder-trigger'))

      await waitFor(() => {
        expect(vi.mocked(sessionLogsApi.extractSessionReflection)).toHaveBeenCalledWith(
          STUDENT_ID,
          'We covered ser vs estar.',
        )
      })
    })

    it('pre-fills form fields after successful extraction', async () => {
      wrapper(<SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />)
      await waitFor(() => expect(screen.getByTestId('mock-audio-recorder-trigger')).toBeInTheDocument())

      fireEvent.click(screen.getByTestId('mock-audio-recorder-trigger'))

      await waitFor(() => {
        expect((screen.getByTestId('actual-content') as HTMLTextAreaElement).value).toBe('Covered ser vs estar')
        expect((screen.getByTestId('homework-assigned') as HTMLInputElement).value).toBe('Exercise 4A')
        expect((screen.getByTestId('next-session-topics') as HTMLTextAreaElement).value).toBe('Review preterito')
      })
    })

    it('auto-saves Draft and changes submit button to "Confirm"', async () => {
      wrapper(<SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />)
      await waitFor(() => expect(screen.getByTestId('mock-audio-recorder-trigger')).toBeInTheDocument())

      fireEvent.click(screen.getByTestId('mock-audio-recorder-trigger'))

      await waitFor(() => {
        expect(vi.mocked(sessionLogsApi.createSession)).toHaveBeenCalledWith(
          STUDENT_ID,
          expect.objectContaining({ status: 'Draft' }),
        )
        expect(screen.getByTestId('submit-session-log')).toHaveTextContent('Confirm')
      })
    })

    it('calls updateSession with Confirmed on Confirm click after draft save', async () => {
      vi.mocked(sessionLogsApi.updateSession).mockResolvedValue({
        ...SAMPLE_SESSION,
        status: 0,
        statusName: 'Confirmed' as const,
      })

      wrapper(<SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />)
      await waitFor(() => expect(screen.getByTestId('mock-audio-recorder-trigger')).toBeInTheDocument())

      fireEvent.click(screen.getByTestId('mock-audio-recorder-trigger'))

      await waitFor(() => expect(screen.getByTestId('submit-session-log')).toHaveTextContent('Confirm'))

      fireEvent.click(screen.getByTestId('submit-session-log'))

      await waitFor(() => {
        expect(vi.mocked(sessionLogsApi.updateSession)).toHaveBeenCalledWith(
          STUDENT_ID,
          'draft-session-id',
          expect.objectContaining({ status: 'Confirmed' }),
        )
      })
    })

    it('shows extraction-failed message and keeps blank form when extraction throws', async () => {
      vi.mocked(sessionLogsApi.extractSessionReflection).mockRejectedValue(new Error('AI failed'))

      wrapper(<SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />)
      await waitFor(() => expect(screen.getByTestId('mock-audio-recorder-trigger')).toBeInTheDocument())

      fireEvent.click(screen.getByTestId('mock-audio-recorder-trigger'))

      await waitFor(() => {
        expect(screen.getByTestId('extraction-failed-message')).toBeInTheDocument()
        expect(screen.getByTestId('submit-session-log')).toHaveTextContent('Log session')
      })
      // Draft should NOT have been saved
      expect(vi.mocked(sessionLogsApi.createSession)).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ status: 'Draft' }),
      )
    })

    it('manual create (no voice) sends status Confirmed', async () => {
      vi.mocked(sessionLogsApi.createSession).mockResolvedValue({ ...SAMPLE_SESSION, status: 0, statusName: 'Confirmed' as const })

      wrapper(<SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />)
      await waitFor(() => expect(screen.getByTestId('submit-session-log')).toBeInTheDocument())

      fireEvent.change(screen.getByTestId('actual-content'), { target: { value: 'We did grammar.' } })
      fireEvent.click(screen.getByTestId('submit-session-log'))

      await waitFor(() => {
        expect(vi.mocked(sessionLogsApi.createSession)).toHaveBeenCalledWith(
          STUDENT_ID,
          expect.objectContaining({ status: 'Confirmed' }),
        )
      })
    })

    it('shows suggested difficulties after extraction returns them', async () => {
      vi.mocked(sessionLogsApi.extractSessionReflection).mockResolvedValue({
        ...EXTRACTED,
        suggestedDifficulties: [
          { description: 'Confuses ser and estar', competency: 'Grammar', subcategory: 'ser/estar', severity: 'high' },
        ],
      })

      wrapper(<SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />)
      await waitFor(() => expect(screen.getByTestId('mock-audio-recorder-trigger')).toBeInTheDocument())

      fireEvent.click(screen.getByTestId('mock-audio-recorder-trigger'))

      await waitFor(() => {
        expect(screen.getByTestId('suggested-difficulties')).toBeInTheDocument()
        expect(screen.getAllByTestId('suggested-difficulty-item')).toHaveLength(1)
        expect(screen.getByText('Confuses ser and estar')).toBeInTheDocument()
      })
    })

    it('does not show suggested difficulties section when extraction returns empty list', async () => {
      wrapper(<SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />)
      await waitFor(() => expect(screen.getByTestId('mock-audio-recorder-trigger')).toBeInTheDocument())

      fireEvent.click(screen.getByTestId('mock-audio-recorder-trigger'))

      await waitFor(() => {
        // Wait for extraction to complete (actual-content gets filled)
        expect((screen.getByTestId('actual-content') as HTMLTextAreaElement).value).toBe('Covered ser vs estar')
      })

      expect(screen.queryByTestId('suggested-difficulties')).not.toBeInTheDocument()
    })

    it('removes a suggested difficulty when the remove button is clicked', async () => {
      vi.mocked(sessionLogsApi.extractSessionReflection).mockResolvedValue({
        ...EXTRACTED,
        suggestedDifficulties: [
          { description: 'Grammar issue', competency: 'Grammar', subcategory: 'ser/estar', severity: 'high' },
          { description: 'Vocab gap', competency: 'Vocabulary', subcategory: 'food', severity: 'medium' },
        ],
      })

      wrapper(<SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />)
      await waitFor(() => expect(screen.getByTestId('mock-audio-recorder-trigger')).toBeInTheDocument())

      fireEvent.click(screen.getByTestId('mock-audio-recorder-trigger'))

      await waitFor(() => {
        expect(screen.getAllByTestId('suggested-difficulty-item')).toHaveLength(2)
      })

      const removeButtons = screen.getAllByTestId('remove-suggested-difficulty')
      fireEvent.click(removeButtons[0])

      expect(screen.getAllByTestId('suggested-difficulty-item')).toHaveLength(1)
      expect(screen.getByText('Vocab gap')).toBeInTheDocument()
      expect(screen.queryByText('Grammar issue')).not.toBeInTheDocument()
    })

    it('shows severity as display text, not a selector input', async () => {
      vi.mocked(sessionLogsApi.extractSessionReflection).mockResolvedValue({
        ...EXTRACTED,
        suggestedDifficulties: [
          { description: 'Mixes up ser and estar', competency: 'Grammar', subcategory: 'ser/estar', severity: 'high' },
        ],
      })

      wrapper(<SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />)
      await waitFor(() => expect(screen.getByTestId('mock-audio-recorder-trigger')).toBeInTheDocument())

      fireEvent.click(screen.getByTestId('mock-audio-recorder-trigger'))

      await waitFor(() => {
        expect(screen.getByTestId('suggested-difficulties')).toBeInTheDocument()
      })

      // Severity label should be visible as text
      expect(screen.getByText(/high/)).toBeInTheDocument()
      // No select or input for severity within the suggested difficulties section
      const section = screen.getByTestId('suggested-difficulties')
      expect(section.querySelector('select')).toBeNull()
      expect(section.querySelector('input[type="text"]')).toBeNull()
      expect(section.querySelector('input[type="number"]')).toBeNull()
    })

    it('includes suggestedDifficulties in the confirm payload', async () => {
      vi.mocked(sessionLogsApi.extractSessionReflection).mockResolvedValue({
        ...EXTRACTED,
        suggestedDifficulties: [
          { description: 'Confuses ser and estar', competency: 'Grammar', subcategory: 'ser/estar', severity: 'high' },
        ],
      })
      vi.mocked(sessionLogsApi.updateSession).mockResolvedValue({ ...SAMPLE_SESSION, status: 0, statusName: 'Confirmed' as const })

      wrapper(<SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />)
      await waitFor(() => expect(screen.getByTestId('mock-audio-recorder-trigger')).toBeInTheDocument())

      fireEvent.click(screen.getByTestId('mock-audio-recorder-trigger'))

      await waitFor(() => expect(screen.getByTestId('submit-session-log')).toHaveTextContent('Confirm'))

      fireEvent.click(screen.getByTestId('submit-session-log'))

      await waitFor(() => {
        expect(vi.mocked(sessionLogsApi.updateSession)).toHaveBeenCalledWith(
          STUDENT_ID,
          'draft-session-id',
          expect.objectContaining({
            status: 'Confirmed',
            suggestedDifficulties: [
              { description: 'Confuses ser and estar', competency: 'Grammar', subcategory: 'ser/estar', severity: 'high' },
            ],
          }),
        )
      })
    })
  })

  describe('unsaved-changes guard', () => {
    beforeEach(() => {
      vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([])
    })

    it('closes immediately without confirmation when form is empty', async () => {
      const onOpenChange = vi.fn()
      wrapper(<SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={onOpenChange} />)
      await waitFor(() => expect(screen.getByTestId('session-log-dialog')).toBeInTheDocument())

      // Simulate clicking outside (Dialog calls onOpenChange(false))
      fireEvent.click(document.body)

      expect(onOpenChange).toHaveBeenCalledWith(false)
      expect(screen.queryByTestId('discard-confirm-dialog')).not.toBeInTheDocument()
    })

    it('shows confirmation dialog when user has typed data and closes is requested', async () => {
      const onOpenChange = vi.fn()
      wrapper(<SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={onOpenChange} />)
      await waitFor(() => expect(screen.getByTestId('actual-content')).toBeInTheDocument())

      fireEvent.change(screen.getByTestId('actual-content'), { target: { value: 'We covered ser vs estar.' } })

      // Trigger the dialog's onOpenChange(false) via the exposed handler
      // We simulate this by calling the Dialog's onOpenChange prop — achieved by pressing Escape
      await userEvent.keyboard('{Escape}')

      await waitFor(() => expect(screen.getByTestId('discard-confirm-dialog')).toBeInTheDocument())
      expect(onOpenChange).not.toHaveBeenCalledWith(false)
    })

    it('Discard button closes the form without saving', async () => {
      const onOpenChange = vi.fn()
      wrapper(<SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={onOpenChange} />)
      await waitFor(() => expect(screen.getByTestId('actual-content')).toBeInTheDocument())

      fireEvent.change(screen.getByTestId('actual-content'), { target: { value: 'Some content.' } })
      await userEvent.keyboard('{Escape}')
      await waitFor(() => expect(screen.getByTestId('discard-confirm-dialog')).toBeInTheDocument())

      fireEvent.click(screen.getByTestId('discard-btn'))

      expect(onOpenChange).toHaveBeenCalledWith(false)
      expect(vi.mocked(sessionLogsApi.createSession)).not.toHaveBeenCalled()
    })

    it('Keep editing button dismisses the confirmation and returns to form', async () => {
      const onOpenChange = vi.fn()
      wrapper(<SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={onOpenChange} />)
      await waitFor(() => expect(screen.getByTestId('actual-content')).toBeInTheDocument())

      fireEvent.change(screen.getByTestId('actual-content'), { target: { value: 'Some content.' } })
      await userEvent.keyboard('{Escape}')
      await waitFor(() => expect(screen.getByTestId('discard-confirm-dialog')).toBeInTheDocument())

      fireEvent.click(screen.getByTestId('keep-editing-btn'))

      await waitFor(() => expect(screen.queryByTestId('discard-confirm-dialog')).not.toBeInTheDocument())
      expect(onOpenChange).not.toHaveBeenCalledWith(false)
      expect(screen.getByTestId('session-log-dialog')).toBeInTheDocument()
    })

    it('shows confirmation in edit mode when a field is changed', async () => {
      const onOpenChange = vi.fn()
      wrapper(
        <SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={onOpenChange} initialSession={SAMPLE_SESSION} />
      )
      await waitFor(() => expect(screen.getByTestId('session-log-dialog')).toBeInTheDocument())

      fireEvent.change(screen.getByTestId('actual-content'), { target: { value: 'Changed content.' } })
      await userEvent.keyboard('{Escape}')

      await waitFor(() => expect(screen.getByTestId('discard-confirm-dialog')).toBeInTheDocument())
    })

    it('closes without confirmation in edit mode when no changes made', async () => {
      const onOpenChange = vi.fn()
      wrapper(
        <SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={onOpenChange} initialSession={SAMPLE_SESSION} />
      )
      await waitFor(() => expect(screen.getByTestId('session-log-dialog')).toBeInTheDocument())

      // Press Escape without changing anything
      await userEvent.keyboard('{Escape}')

      expect(onOpenChange).toHaveBeenCalledWith(false)
      expect(screen.queryByTestId('discard-confirm-dialog')).not.toBeInTheDocument()
    })
  })
})
