import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionLogDialog } from './SessionLogDialog'
import * as sessionLogsApi from '../../api/sessionLogs'
import type { SessionLog } from '../../api/sessionLogs'
import * as lessonsApi from '../../api/lessons'
import { createFollowup } from '../../api/followups'
import * as studentsApi from '../../api/students'

vi.mock('../../api/followups', () => ({
  getFollowups: vi.fn().mockResolvedValue([]),
  createFollowup: vi.fn().mockResolvedValue({
    id: 'new-f', text: '', status: 'pending', createdAt: new Date().toISOString(),
    studentId: 'student-1', studentName: null, dueDate: null, completedAt: null, sourceSessionLogId: null,
  }),
  updateFollowupStatus: vi.fn().mockResolvedValue({}),
}))

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

vi.mock('../../api/students', () => ({
  getStudent: vi.fn().mockResolvedValue({
    id: 'student-1', name: 'Marco', difficulties: [], teachingTodos: [],
  }),
  appendTeachingTodo: vi.fn().mockResolvedValue({}),
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
  duration: null,
  title: null,
  hasVoiceNote: false,
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
        suggestedDifficulties: '[]', duration: null, title: null, hasVoiceNote: false,
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
        suggestedDifficulties: '[]', duration: null, title: null, hasVoiceNote: false,
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
          suggestedDifficulties: '[]', duration: null, title: null, hasVoiceNote: false,
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
          suggestedDifficulties: '[]', duration: null, title: null, hasVoiceNote: false,
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
          suggestedDifficulties: '[]', duration: null, title: null, hasVoiceNote: false,
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
      sessionDate: '2026-04-11',
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

    it('shows AudioRecorder in edit mode', async () => {
      wrapper(
        <SessionLogDialog
          studentId={STUDENT_ID}
          open={true}
          onOpenChange={vi.fn()}
          initialSession={SAMPLE_SESSION}
        />
      )
      await waitFor(() => expect(screen.getByText('Edit Session')).toBeInTheDocument())
      expect(screen.queryByTestId('mock-audio-recorder-trigger')).toBeInTheDocument()
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

    it('pre-fills session date field from extracted sessionDate when form date is empty', async () => {
      wrapper(<SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />)
      await waitFor(() => expect(screen.getByTestId('mock-audio-recorder-trigger')).toBeInTheDocument())

      fireEvent.click(screen.getByTestId('mock-audio-recorder-trigger'))

      await waitFor(() => {
        expect(screen.getByTestId('session-date-iso')).toHaveTextContent('2026-04-11')
      })
    })

    it('includes extracted sessionDate in the draft payload', async () => {
      wrapper(<SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />)
      await waitFor(() => expect(screen.getByTestId('mock-audio-recorder-trigger')).toBeInTheDocument())

      fireEvent.click(screen.getByTestId('mock-audio-recorder-trigger'))

      await waitFor(() => {
        expect(vi.mocked(sessionLogsApi.createSession)).toHaveBeenCalledWith(
          STUDENT_ID,
          expect.objectContaining({ sessionDate: '2026-04-11' }),
        )
      })
    })

    it('includes voiceNoteId, voiceNoteTranscription and rawExtractionJson in draft payload', async () => {
      const EXTRACTED_WITH_RAW = {
        ...EXTRACTED,
        rawExtractionJson: '{"whatWasCovered":"Covered ser vs estar"}',
      }
      vi.mocked(sessionLogsApi.extractSessionReflection).mockResolvedValue(EXTRACTED_WITH_RAW)

      wrapper(<SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />)
      await waitFor(() => expect(screen.getByTestId('mock-audio-recorder-trigger')).toBeInTheDocument())

      fireEvent.click(screen.getByTestId('mock-audio-recorder-trigger'))

      await waitFor(() => {
        expect(vi.mocked(sessionLogsApi.createSession)).toHaveBeenCalledWith(
          STUDENT_ID,
          expect.objectContaining({
            voiceNoteId: 'vn-1',
            voiceNoteTranscription: 'We covered ser vs estar.',
            rawExtractionJson: '{"whatWasCovered":"Covered ser vs estar"}',
          }),
        )
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

    it('second voice note in create mode calls updateSession on draft, not createSession again', async () => {
      vi.mocked(sessionLogsApi.updateSession).mockResolvedValue({
        ...SAMPLE_SESSION,
        id: 'draft-session-id',
        status: 1,
        statusName: 'Draft' as const,
      })

      wrapper(<SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />)
      await waitFor(() => expect(screen.getByTestId('mock-audio-recorder-trigger')).toBeInTheDocument())

      // First voice note: creates Draft
      fireEvent.click(screen.getByTestId('mock-audio-recorder-trigger'))
      await waitFor(() => expect(vi.mocked(sessionLogsApi.createSession)).toHaveBeenCalledTimes(1))

      // Second voice note: updates the existing Draft
      fireEvent.click(screen.getByTestId('mock-audio-recorder-trigger'))
      await waitFor(() => {
        expect(vi.mocked(sessionLogsApi.updateSession)).toHaveBeenCalledWith(
          STUDENT_ID,
          'draft-session-id',
          expect.objectContaining({ status: 'Draft' }),
        )
      })
      expect(vi.mocked(sessionLogsApi.createSession)).toHaveBeenCalledTimes(1)
    })

    it('voice note in edit mode calls updateSession on initialSession, not createSession', async () => {
      vi.mocked(sessionLogsApi.updateSession).mockResolvedValue({ ...SAMPLE_SESSION })

      wrapper(
        <SessionLogDialog
          studentId={STUDENT_ID}
          open={true}
          onOpenChange={vi.fn()}
          initialSession={SAMPLE_SESSION}
        />
      )
      await waitFor(() => expect(screen.getByTestId('mock-audio-recorder-trigger')).toBeInTheDocument())

      fireEvent.click(screen.getByTestId('mock-audio-recorder-trigger'))

      await waitFor(() => {
        expect(vi.mocked(sessionLogsApi.updateSession)).toHaveBeenCalledWith(
          STUDENT_ID,
          SAMPLE_SESSION.id,
          expect.anything(),
        )
      })
      expect(vi.mocked(sessionLogsApi.createSession)).not.toHaveBeenCalled()
    })

    it('voice note on confirmed session keeps status Confirmed in auto-save', async () => {
      const CONFIRMED_SESSION = { ...SAMPLE_SESSION, statusName: 'Confirmed' as const, status: 0 }
      vi.mocked(sessionLogsApi.updateSession).mockResolvedValue(CONFIRMED_SESSION)

      wrapper(
        <SessionLogDialog
          studentId={STUDENT_ID}
          open={true}
          onOpenChange={vi.fn()}
          initialSession={CONFIRMED_SESSION}
        />
      )
      await waitFor(() => expect(screen.getByTestId('mock-audio-recorder-trigger')).toBeInTheDocument())

      fireEvent.click(screen.getByTestId('mock-audio-recorder-trigger'))

      await waitFor(() => {
        expect(vi.mocked(sessionLogsApi.updateSession)).toHaveBeenCalledWith(
          STUDENT_ID,
          CONFIRMED_SESSION.id,
          expect.objectContaining({ status: 'Confirmed' }),
        )
      })
      expect(vi.mocked(sessionLogsApi.createSession)).not.toHaveBeenCalled()
    })

    it('second voice note appends to narrative fields instead of replacing', async () => {
      vi.mocked(sessionLogsApi.extractSessionReflection)
        .mockResolvedValueOnce({ ...EXTRACTED, whatWasCovered: 'First topic' })
        .mockResolvedValueOnce({ ...EXTRACTED, whatWasCovered: 'Second topic' })
      vi.mocked(sessionLogsApi.updateSession).mockResolvedValue({
        ...SAMPLE_SESSION,
        id: 'draft-session-id',
        status: 1,
        statusName: 'Draft' as const,
      })

      wrapper(<SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />)
      await waitFor(() => expect(screen.getByTestId('mock-audio-recorder-trigger')).toBeInTheDocument())

      fireEvent.click(screen.getByTestId('mock-audio-recorder-trigger'))
      await waitFor(() => {
        expect((screen.getByTestId('actual-content') as HTMLTextAreaElement).value).toBe('First topic')
      })

      fireEvent.click(screen.getByTestId('mock-audio-recorder-trigger'))
      await waitFor(() => {
        const value = (screen.getByTestId('actual-content') as HTMLTextAreaElement).value
        expect(value).toContain('First topic')
        expect(value).toContain('Second topic')
      })
    })

    it('voice note unions topic tags without duplicates', async () => {
      vi.mocked(sessionLogsApi.extractSessionReflection)
        .mockResolvedValueOnce({ ...EXTRACTED, topicTags: [{ tag: 'ser/estar' }, { tag: 'subjuntivo' }] })
        .mockResolvedValueOnce({ ...EXTRACTED, topicTags: [{ tag: 'subjuntivo' }, { tag: 'vocabulario' }] })
      vi.mocked(sessionLogsApi.updateSession).mockResolvedValue({
        ...SAMPLE_SESSION,
        id: 'draft-session-id',
        status: 1,
        statusName: 'Draft' as const,
      })

      wrapper(<SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />)
      await waitFor(() => expect(screen.getByTestId('mock-audio-recorder-trigger')).toBeInTheDocument())

      // First voice note: sets topic tags
      fireEvent.click(screen.getByTestId('mock-audio-recorder-trigger'))
      await waitFor(() => expect(vi.mocked(sessionLogsApi.createSession)).toHaveBeenCalledTimes(1))

      // Second voice note: unions topic tags
      fireEvent.click(screen.getByTestId('mock-audio-recorder-trigger'))
      await waitFor(() => {
        expect(vi.mocked(sessionLogsApi.updateSession)).toHaveBeenCalledWith(
          STUDENT_ID,
          'draft-session-id',
          expect.objectContaining({
            topicTags: expect.stringContaining('ser/estar'),
          }),
        )
        // Should contain all three unique tags
        const call = vi.mocked(sessionLogsApi.updateSession).mock.calls[0]
        const payload = call[2] as { topicTags: string }
        const tags = JSON.parse(payload.topicTags) as { tag: string }[]
        expect(tags.map(t => t.tag)).toEqual(expect.arrayContaining(['ser/estar', 'subjuntivo', 'vocabulario']))
        expect(tags).toHaveLength(3)
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

  describe('initialPlannedContent pre-fill (start next session)', () => {
    beforeEach(() => {
      vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([])
    })

    it('pre-fills planned content when initialPlannedContent is provided', async () => {
      wrapper(
        <SessionLogDialog
          studentId={STUDENT_ID}
          open={true}
          onOpenChange={vi.fn()}
          initialPlannedContent="Review irregular verbs"
        />
      )
      await waitFor(() => expect(screen.getByTestId('session-log-dialog')).toBeInTheDocument())
      const plannedField = screen.getByTestId('planned-content') as HTMLTextAreaElement
      expect(plannedField.value).toBe('Review irregular verbs')
    })

    it('does not consider form dirty when only initialPlannedContent is set and unchanged', async () => {
      const onOpenChange = vi.fn()
      wrapper(
        <SessionLogDialog
          studentId={STUDENT_ID}
          open={true}
          onOpenChange={onOpenChange}
          initialPlannedContent="Review irregular verbs"
        />
      )
      await waitFor(() => expect(screen.getByTestId('session-log-dialog')).toBeInTheDocument())

      // Escape without changing anything
      await userEvent.keyboard('{Escape}')

      expect(onOpenChange).toHaveBeenCalledWith(false)
      expect(screen.queryByTestId('discard-confirm-dialog')).not.toBeInTheDocument()
    })

    it('teacher can modify the pre-filled planned content', async () => {
      wrapper(
        <SessionLogDialog
          studentId={STUDENT_ID}
          open={true}
          onOpenChange={vi.fn()}
          initialPlannedContent="Review irregular verbs"
        />
      )
      await waitFor(() => expect(screen.getByTestId('session-log-dialog')).toBeInTheDocument())
      const plannedField = screen.getByTestId('planned-content') as HTMLTextAreaElement
      fireEvent.change(plannedField, { target: { value: 'Review irregular verbs + ser/estar' } })
      expect(plannedField.value).toBe('Review irregular verbs + ser/estar')
    })
  })

  describe('followup quick-add', () => {
    beforeEach(() => {
      vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([])
      vi.mocked(lessonsApi.getLessons).mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 100 })
    })

    it('renders the new followups quick-add section', async () => {
      wrapper(
        <SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />
      )
      await waitFor(() => expect(screen.getByTestId('session-new-followup-section')).toBeInTheDocument())
    })

    it('calls createFollowup when add button clicked with text', async () => {
      wrapper(
        <SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />
      )
      await waitFor(() => expect(screen.getByTestId('session-followup-input')).toBeInTheDocument())
      fireEvent.change(screen.getByTestId('session-followup-input'), { target: { value: 'Send homework' } })
      fireEvent.click(screen.getByTestId('session-followup-add-btn'))
      await waitFor(() =>
        expect(vi.mocked(createFollowup)).toHaveBeenCalledWith(
          expect.objectContaining({ text: 'Send homework', studentId: STUDENT_ID })
        )
      )
    })
  })

  describe('handleVoiceNote - new extracted fields', () => {
    const DRAFT_SESSION = { id: 'draft-1', studentId: STUDENT_ID, sessionDate: null }

    beforeEach(() => {
      vi.mocked(sessionLogsApi.listSessions).mockResolvedValue([])
      vi.mocked(lessonsApi.getLessons).mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 100 })
      vi.mocked(sessionLogsApi.createSession).mockResolvedValue(DRAFT_SESSION as never)
    })

    it('creates teaching todos from extraction', async () => {
      vi.mocked(sessionLogsApi.extractSessionReflection).mockResolvedValue({
        whatWasCovered: 'Subjuntivo',
        areasToImprove: null,
        emotionalSignals: null,
        homeworkAssigned: null,
        nextLessonIdeas: null,
        suggestedDifficulties: [],
        teachingTodos: ['Trabajar conectores', 'Practicar subjuntivo'],
        teacherFollowups: [],
      })

      wrapper(<SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />)
      await waitFor(() => expect(screen.getByTestId('mock-audio-recorder-trigger')).toBeInTheDocument())
      fireEvent.click(screen.getByTestId('mock-audio-recorder-trigger'))

      await waitFor(() => {
        expect(vi.mocked(studentsApi.appendTeachingTodo)).toHaveBeenCalledWith(STUDENT_ID, 'Trabajar conectores')
        expect(vi.mocked(studentsApi.appendTeachingTodo)).toHaveBeenCalledWith(STUDENT_ID, 'Practicar subjuntivo')
      })
    })

    it('creates teacher followups from extraction', async () => {
      vi.mocked(sessionLogsApi.extractSessionReflection).mockResolvedValue({
        whatWasCovered: 'Subjuntivo',
        areasToImprove: null,
        emotionalSignals: null,
        homeworkAssigned: null,
        nextLessonIdeas: null,
        suggestedDifficulties: [],
        teachingTodos: [],
        teacherFollowups: ['Enviar el PDF', 'Mandar el audio'],
      })

      wrapper(<SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />)
      await waitFor(() => expect(screen.getByTestId('mock-audio-recorder-trigger')).toBeInTheDocument())
      fireEvent.click(screen.getByTestId('mock-audio-recorder-trigger'))

      await waitFor(() => {
        expect(vi.mocked(createFollowup)).toHaveBeenCalledWith(
          expect.objectContaining({ text: 'Enviar el PDF', studentId: STUDENT_ID, sourceSessionLogId: 'draft-1' })
        )
        expect(vi.mocked(createFollowup)).toHaveBeenCalledWith(
          expect.objectContaining({ text: 'Mandar el audio', studentId: STUDENT_ID })
        )
      })
    })

    it('sets previousHomeworkStatus from extraction', async () => {
      vi.mocked(sessionLogsApi.extractSessionReflection).mockResolvedValue({
        whatWasCovered: null,
        areasToImprove: null,
        emotionalSignals: null,
        homeworkAssigned: null,
        nextLessonIdeas: null,
        suggestedDifficulties: [],
        previousHomeworkStatus: 'Done',
        teachingTodos: [],
        teacherFollowups: [],
      })

      wrapper(<SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />)
      await waitFor(() => expect(screen.getByTestId('mock-audio-recorder-trigger')).toBeInTheDocument())
      fireEvent.click(screen.getByTestId('mock-audio-recorder-trigger'))

      await waitFor(() => {
        expect(vi.mocked(sessionLogsApi.createSession)).toHaveBeenCalledWith(
          STUDENT_ID,
          expect.objectContaining({ previousHomeworkStatus: 'Done' })
        )
      })
    })

    it('passes durationMinutes to session creation', async () => {
      vi.mocked(sessionLogsApi.extractSessionReflection).mockResolvedValue({
        whatWasCovered: null,
        areasToImprove: null,
        emotionalSignals: null,
        homeworkAssigned: null,
        nextLessonIdeas: null,
        suggestedDifficulties: [],
        durationMinutes: 45,
        teachingTodos: [],
        teacherFollowups: [],
      })

      wrapper(<SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />)
      await waitFor(() => expect(screen.getByTestId('mock-audio-recorder-trigger')).toBeInTheDocument())
      fireEvent.click(screen.getByTestId('mock-audio-recorder-trigger'))

      await waitFor(() => {
        expect(vi.mocked(sessionLogsApi.createSession)).toHaveBeenCalledWith(
          STUDENT_ID,
          expect.objectContaining({ duration: 45 })
        )
      })
    })

    it('pre-fills level reassessment field without auto-enabling toggle', async () => {
      vi.mocked(sessionLogsApi.extractSessionReflection).mockResolvedValue({
        whatWasCovered: 'Conditionals',
        areasToImprove: null,
        emotionalSignals: null,
        homeworkAssigned: null,
        nextLessonIdeas: null,
        suggestedDifficulties: [],
        levelReassessment: 'B2',
        teachingTodos: [],
        teacherFollowups: [],
      })

      wrapper(<SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />)
      await waitFor(() => expect(screen.getByTestId('mock-audio-recorder-trigger')).toBeInTheDocument())
      fireEvent.click(screen.getByTestId('mock-audio-recorder-trigger'))

      // Toggle is NOT auto-enabled (coarse B2 != sublevel B2.1); draft has null reassessment
      await waitFor(() => {
        expect(vi.mocked(sessionLogsApi.createSession)).toHaveBeenCalledWith(
          STUDENT_ID,
          expect.objectContaining({ levelReassessmentLevel: null, levelReassessmentSkill: null })
        )
      })
    })

    it('matches difficultiesWorkedOn against student active difficulties without error', async () => {
      vi.mocked(studentsApi.getStudent).mockResolvedValue({
        id: STUDENT_ID, name: 'Marco',
        difficulties: [
          { id: 'd1', description: 'Subjuntivo en concesivas', competency: 'Grammar', subcategory: 'Subjunctive', severity: 'Medium', status: 'Active', createdAt: '' },
        ],
        teachingTodos: [],
      } as never)
      vi.mocked(sessionLogsApi.extractSessionReflection).mockResolvedValue({
        whatWasCovered: 'Worked on subjuntivo',
        areasToImprove: null,
        emotionalSignals: null,
        homeworkAssigned: null,
        nextLessonIdeas: null,
        suggestedDifficulties: [],
        difficultiesWorkedOn: ['Subjuntivo en concesivas'],
        teachingTodos: [],
        teacherFollowups: [],
      })

      wrapper(<SessionLogDialog studentId={STUDENT_ID} open={true} onOpenChange={vi.fn()} />)
      await waitFor(() => expect(screen.getByTestId('mock-audio-recorder-trigger')).toBeInTheDocument())
      fireEvent.click(screen.getByTestId('mock-audio-recorder-trigger'))

      // Draft is saved successfully (extraction + matching ran without errors)
      await waitFor(() => {
        expect(vi.mocked(sessionLogsApi.createSession)).toHaveBeenCalledWith(
          STUDENT_ID,
          expect.objectContaining({ actualContent: 'Worked on subjuntivo' })
        )
      })
    })
  })
})
