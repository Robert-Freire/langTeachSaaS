import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { LastSessionCard } from './LastSessionCard'
import { pickLastSession } from '@/lib/sessionUtils'
import type { SessionLog } from '@/api/sessionLogs'

function makeSession(overrides: Partial<SessionLog> = {}): SessionLog {
  const now = new Date().toISOString()
  return {
    id: 'sess-x',
    studentId: 'student-1',
    sessionDate: now,
    plannedContent: null,
    actualContent: 'We reviewed the subjunctive.',
    homeworkAssigned: null,
    previousHomeworkStatus: 0,
    previousHomeworkStatusName: 'NotApplicable',
    nextSessionTopics: null,
    generalNotes: null,
    levelReassessmentSkill: null,
    levelReassessmentLevel: null,
    linkedLessonId: null,
    topicTags: '[]',
    createdAt: now,
    updatedAt: now,
    isCancelled: false,
    status: 1,
    statusName: 'Confirmed',
    mentionedDifficultyPairs: '[]',
    suggestedDifficulties: '[]',
    duration: 60,
    title: 'Subjunctive review',
    hasVoiceNote: false,
    ...overrides,
  }
}

function renderCard(session: SessionLog | null, studentId = 'student-1') {
  return render(
    <MemoryRouter>
      <LastSessionCard session={session} studentId={studentId} />
    </MemoryRouter>,
  )
}

function renderWithPicker(sessions: SessionLog[], studentId = 'student-1') {
  return renderCard(pickLastSession(sessions), studentId)
}

describe('pickLastSession', () => {
  it('returns null for empty list', () => {
    expect(pickLastSession([])).toBeNull()
  })

  it('skips cancelled sessions', () => {
    const recent = makeSession({ id: 'recent', sessionDate: '2026-04-20', isCancelled: true })
    const older = makeSession({ id: 'older', sessionDate: '2026-04-10' })
    expect(pickLastSession([recent, older])?.id).toBe('older')
  })

  it('skips sessions without a sessionDate', () => {
    const draft = makeSession({ id: 'draft', sessionDate: null })
    const confirmed = makeSession({ id: 'confirmed', sessionDate: '2026-04-10' })
    expect(pickLastSession([draft, confirmed])?.id).toBe('confirmed')
  })

  it('picks the most recent session by date', () => {
    const a = makeSession({ id: 'a', sessionDate: '2026-04-01' })
    const b = makeSession({ id: 'b', sessionDate: '2026-04-15' })
    const c = makeSession({ id: 'c', sessionDate: '2026-04-10' })
    expect(pickLastSession([a, b, c])?.id).toBe('b')
  })
})

describe('LastSessionCard', () => {
  it('renders empty state with log link when session is null', () => {
    renderCard(null)
    expect(screen.getByTestId('last-session-card')).toBeInTheDocument()
    expect(screen.getByTestId('last-session-empty')).toHaveTextContent('No sessions logged yet')
    const link = screen.getByTestId('last-session-log-link')
    expect(link).toHaveAttribute('href', '/students/student-1/log-session')
  })

  it('integrates with pickLastSession: empty state when all sessions cancelled or dateless', () => {
    renderWithPicker([
      makeSession({ id: '1', isCancelled: true }),
      makeSession({ id: '2', sessionDate: null }),
    ])
    expect(screen.getByTestId('last-session-empty')).toBeInTheDocument()
  })

  it('renders date, title, duration, content, tags, and notes', () => {
    const session = makeSession({
      sessionDate: '2026-04-15T10:00:00Z',
      title: 'Pretérito indefinido',
      duration: 45,
      actualContent: 'Covered irregular verbs in preterite.',
      generalNotes: 'Student struggled with "traer" conjugation.',
      topicTags: JSON.stringify([{ tag: 'GRAMMAR' }, { tag: 'PRETERITE' }]),
    })
    renderCard(session)

    expect(screen.getByTestId('last-session-date')).toBeInTheDocument()
    expect(screen.getByTestId('last-session-title')).toHaveTextContent('Pretérito indefinido')
    expect(screen.getByTestId('last-session-duration')).toHaveTextContent('45min')
    expect(screen.getByTestId('last-session-content')).toHaveTextContent(
      'Covered irregular verbs in preterite.',
    )
    expect(screen.getByTestId('last-session-notes')).toHaveTextContent('traer')
    const tags = screen.getAllByTestId('last-session-tag')
    expect(tags).toHaveLength(2)
    expect(tags[0]).toHaveTextContent('GRAMMAR')
    expect(tags[1]).toHaveTextContent('PRETERITE')
  })

  it('hides duration chip when duration is null', () => {
    renderCard(makeSession({ duration: null }))
    expect(screen.queryByTestId('last-session-duration')).not.toBeInTheDocument()
  })

  it('hides notes block when generalNotes is null or empty', () => {
    renderCard(makeSession({ generalNotes: null }))
    expect(screen.queryByTestId('last-session-notes')).not.toBeInTheDocument()
    renderCard(makeSession({ generalNotes: '   ' }))
    expect(screen.queryByTestId('last-session-notes')).not.toBeInTheDocument()
  })

  it('hides tag row when topicTags parse to empty', () => {
    renderCard(makeSession({ topicTags: '[]' }))
    expect(screen.queryByTestId('last-session-tags')).not.toBeInTheDocument()
    renderCard(makeSession({ topicTags: 'not-valid-json' }))
    expect(screen.queryByTestId('last-session-tags')).not.toBeInTheDocument()
  })

  it('hides actualContent block when empty', () => {
    renderCard(makeSession({ actualContent: null }))
    expect(screen.queryByTestId('last-session-content')).not.toBeInTheDocument()
  })

  it('integrates with pickLastSession: picks most recent non-cancelled session when mixed', () => {
    renderWithPicker([
      makeSession({ id: 'old', sessionDate: '2026-04-01', title: 'Old one' }),
      makeSession({ id: 'cancel', sessionDate: '2026-04-20', isCancelled: true, title: 'Cancelled' }),
      makeSession({ id: 'new', sessionDate: '2026-04-15', title: 'Most recent' }),
    ])
    expect(screen.getByTestId('last-session-title')).toHaveTextContent('Most recent')
  })

  it('wraps the title in a link to the session edit page', () => {
    renderCard(makeSession())
    const titleLink = screen.getByTestId('last-session-title-link')
    expect(titleLink).toHaveAttribute('href', '/students/student-1/sessions/sess-x/edit')
    expect(titleLink).toContainElement(screen.getByTestId('last-session-title'))
    // Hover state per design system: indigo + underline on hover, no underline at rest.
    expect(titleLink).toHaveClass('hover:text-indigo-700', 'hover:underline')
  })

  it('renders View session link with correct href', () => {
    renderCard(makeSession())
    const link = screen.getByTestId('last-session-view-link')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/students/student-1/sessions/sess-x/edit')
    expect(link).toHaveTextContent('View session')
  })

  it('renders View session link even when actualContent is null', () => {
    renderCard(makeSession({ actualContent: null }))
    expect(screen.queryByTestId('last-session-content')).not.toBeInTheDocument()
    const link = screen.getByTestId('last-session-view-link')
    expect(link).toHaveAttribute('href', '/students/student-1/sessions/sess-x/edit')
  })

  it('does not render an edit control (read-only)', () => {
    renderCard(makeSession())
    const card = screen.getByTestId('last-session-card')
    expect(card.querySelector('button[aria-label*="edit" i]')).toBeNull()
    expect(card.querySelector('input')).toBeNull()
    expect(card.querySelector('textarea')).toBeNull()
  })
})
