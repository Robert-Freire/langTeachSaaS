import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import GroupLogSession from './GroupLogSession'
import * as groupsApi from '@/api/groups'
import type { Group } from '@/api/groups'
import type { SessionLog } from '@/api/sessionLogs'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/api/groups', () => ({
  getGroup: vi.fn(),
  listGroupSessions: vi.fn(),
  getGroupSession: vi.fn(),
  createGroupSession: vi.fn(),
  updateGroupSession: vi.fn(),
  appendGroupTeachingIdea: vi.fn().mockResolvedValue({}),
  extractGroupSessionReflection: vi.fn(),
}))

vi.mock('@/api/sessionLogs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/sessionLogs')>()
  return {
    ...actual,
    parseTopicTags: vi.fn((raw: string) => { try { return JSON.parse(raw) as unknown[] } catch { return [] } }),
    serializeTopicTags: vi.fn((tags: unknown[]) => JSON.stringify(tags)),
  }
})

vi.mock('@/components/audio/AudioRecorder', () => ({
  AudioRecorder: () => <div data-testid="audio-recorder" />,
}))

vi.mock('@/components/session/TopicTagsInput', () => ({
  TopicTagsInput: () => <div data-testid="topic-tags-input" />,
}))

const GROUP_ID = 'group-1'
const SESSION_ID = 'session-1'

const SAMPLE_GROUP: Group = {
  id: GROUP_ID,
  teacherId: 'teacher-1',
  name: 'Martes B1',
  cefrLevel: 'B1',
  description: null,
  memberCount: 3,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  members: [],
  memberPreview: [],
  lastSessionDate: null,
  nextSessionDate: null,
  teachingIdeas: [],
  teachingNotes: null,
  reasonForStudying: null,
  interests: '[]',
  commonFocusAreas: '[]',
}

const SAMPLE_SESSION: SessionLog = {
  id: SESSION_ID,
  studentId: null,
  groupId: GROUP_ID,
  targetType: 'group',
  targetName: 'Martes B1',
  sessionDate: '2026-04-15T10:00:00Z',
  plannedContent: null,
  actualContent: 'Practised the present subjunctive with role-play.',
  homeworkAssigned: 'Workbook page 42',
  previousHomeworkStatus: 0,
  previousHomeworkStatusName: 'NotApplicable',
  nextSessionTopics: 'Imperfect subjunctive',
  generalNotes: null,
  levelReassessmentSkill: null,
  levelReassessmentLevel: null,
  linkedLessonId: null,
  topicTags: '[]',
  createdAt: '2026-04-15T10:00:00Z',
  updatedAt: '2026-04-15T10:00:00Z',
  isCancelled: false,
  status: 1,
  statusName: 'Confirmed',
  mentionedDifficultyPairs: '[]',
  suggestedDifficulties: '[]',
  duration: 60,
  title: 'Subjuntivo practice',
  hasVoiceNote: false,
}

function renderEditMode() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/groups/${GROUP_ID}/sessions/${SESSION_ID}/edit`]}>
        <Routes>
          <Route path="/groups/:id/sessions/:sessionId/edit" element={<GroupLogSession />} />
          <Route path="/groups/:id" element={<div data-testid="group-detail">Group Detail</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function renderCreateMode() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/groups/${GROUP_ID}/log-session`]}>
        <Routes>
          <Route path="/groups/:id/log-session" element={<GroupLogSession />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('GroupLogSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockReset()
    vi.mocked(groupsApi.getGroup).mockResolvedValue(SAMPLE_GROUP)
    vi.mocked(groupsApi.listGroupSessions).mockResolvedValue([SAMPLE_SESSION])
    vi.mocked(groupsApi.getGroupSession).mockResolvedValue(SAMPLE_SESSION)
  })

  it('edit mode loads the existing session and prefills the form (not blank) (#1379)', async () => {
    renderEditMode()
    // The page renders (not a blank route) and prefills fields from the loaded session.
    const titleInput = await screen.findByTestId('log-session-title-input')
    expect(titleInput).toHaveValue('Subjuntivo practice')
    expect(screen.getByTestId('actual-content')).toHaveValue('Practised the present subjunctive with role-play.')
    expect(screen.getByTestId('homework-assigned')).toHaveValue('Workbook page 42')
    expect(groupsApi.getGroupSession).toHaveBeenCalledWith(GROUP_ID, SESSION_ID)
  })

  it('edit mode: clicking Back with no edits navigates to the Sessions tab without a discard prompt', async () => {
    const user = userEvent.setup()
    renderEditMode()
    await screen.findByTestId('log-session-title-input')
    await user.click(screen.getByTestId('back-button'))
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(`/groups/${GROUP_ID}?tab=sessions`)
    })
    expect(screen.queryByTestId('discard-confirm-bar')).not.toBeInTheDocument()
  })

  it('create mode renders without a sessionId and starts at session #1', async () => {
    vi.mocked(groupsApi.listGroupSessions).mockResolvedValue([])
    renderCreateMode()
    const sessionNumber = await screen.findByTestId('session-number')
    expect(sessionNumber).toHaveTextContent('Session #1')
    expect(groupsApi.getGroupSession).not.toHaveBeenCalled()
  })
})
