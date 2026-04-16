import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { TodayAgenda } from './TodayAgenda'
import type { TodaySession, UpcomingSession } from '@/api/dashboard'

function makeSession(overrides: Partial<TodaySession> = {}): TodaySession {
  return {
    sessionLogId: 'sl1',
    studentId: 'student-1',
    studentName: 'Ana García',
    studentCefrLevel: 'B1',
    sessionDate: new Date().toISOString(),
    plannedContent: 'Subjunctive',
    status: 'Confirmed',
    ...overrides,
  }
}

function makeUpcoming(overrides: Partial<UpcomingSession> = {}): UpcomingSession {
  return {
    sessionLogId: 'ul1',
    studentId: 'student-2',
    studentName: 'Marco Rossi',
    studentCefrLevel: 'A2',
    sessionDate: new Date(Date.now() + 2 * 86400000).toISOString(),
    plannedContent: null,
    ...overrides,
  }
}

describe('TodayAgenda', () => {
  it('shows no sessions this week when both empty', () => {
    render(
      <MemoryRouter>
        <TodayAgenda sessions={[]} nextSessionId={null} upcomingThisWeek={[]} />
      </MemoryRouter>,
    )
    expect(screen.getByText(/No sessions this week/)).toBeInTheDocument()
  })

  it('shows This Week fallback when today empty but upcoming non-empty', () => {
    render(
      <MemoryRouter>
        <TodayAgenda sessions={[]} nextSessionId={null} upcomingThisWeek={[makeUpcoming()]} />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('this-week-sessions')).toBeInTheDocument()
    expect(screen.getByText('Marco Rossi')).toBeInTheDocument()
  })

  it('renders session rows when today has sessions', () => {
    const sessions = [
      makeSession({ sessionLogId: 'sl1', studentName: 'Ana' }),
      makeSession({ sessionLogId: 'sl2', studentName: 'Carmen' }),
    ]
    render(
      <MemoryRouter>
        <TodayAgenda sessions={sessions} nextSessionId={null} upcomingThisWeek={[]} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('Carmen')).toBeInTheDocument()
  })

  it('highlights the next session and shows NEXT SESSION chip', () => {
    const session = makeSession({ sessionLogId: 'sl-next' })
    render(
      <MemoryRouter>
        <TodayAgenda sessions={[session]} nextSessionId="sl-next" upcomingThisWeek={[]} />
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: /Ana/ })
    expect(link.className).toContain('border-l-indigo-600')
    expect(screen.getByText('NEXT SESSION')).toBeInTheDocument()
  })

  it('shows DONE chip for past session', () => {
    const pastSession = makeSession({
      sessionLogId: 'sl-past',
      sessionDate: new Date(Date.now() - 2 * 3600000).toISOString(),
    })
    render(
      <MemoryRouter>
        <TodayAgenda sessions={[pastSession]} nextSessionId={null} upcomingThisWeek={[]} />
      </MemoryRouter>,
    )
    expect(screen.getByText('DONE')).toBeInTheDocument()
  })

  it('shows SCHEDULED chip for future session today', () => {
    const futureSession = makeSession({
      sessionLogId: 'sl-future',
      sessionDate: new Date(Date.now() + 2 * 3600000).toISOString(),
    })
    render(
      <MemoryRouter>
        <TodayAgenda sessions={[futureSession]} nextSessionId={null} upcomingThisWeek={[]} />
      </MemoryRouter>,
    )
    expect(screen.getByText('SCHEDULED')).toBeInTheDocument()
  })

  it('renders zone2-today-agenda testid', () => {
    render(
      <MemoryRouter>
        <TodayAgenda sessions={[]} nextSessionId={null} upcomingThisWeek={[]} />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('zone2-today-agenda')).toBeInTheDocument()
  })
})
