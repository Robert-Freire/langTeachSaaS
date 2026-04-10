import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { TodayAgenda } from './TodayAgenda'
import type { TodaySession } from '@/api/dashboard'

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

describe('TodayAgenda', () => {
  it('shows empty state when no sessions', () => {
    render(
      <MemoryRouter>
        <TodayAgenda sessions={[]} nextSessionId={null} />
      </MemoryRouter>,
    )
    expect(screen.getByText(/No sessions today/)).toBeInTheDocument()
  })

  it('renders session rows', () => {
    const sessions = [
      makeSession({ sessionLogId: 'sl1', studentName: 'Ana' }),
      makeSession({ sessionLogId: 'sl2', studentName: 'Marco' }),
    ]
    render(
      <MemoryRouter>
        <TodayAgenda sessions={sessions} nextSessionId={null} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('Marco')).toBeInTheDocument()
  })

  it('highlights the next session', () => {
    const session = makeSession({ sessionLogId: 'sl-next' })
    render(
      <MemoryRouter>
        <TodayAgenda sessions={[session]} nextSessionId="sl-next" />
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: /Ana/ })
    expect(link.className).toContain('border-l-indigo-600')
  })

  it('renders zone2-today-agenda testid', () => {
    render(
      <MemoryRouter>
        <TodayAgenda sessions={[]} nextSessionId={null} />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('zone2-today-agenda')).toBeInTheDocument()
  })
})
