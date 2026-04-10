import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { NextSessionHero } from './NextSessionHero'
import type { NextSession } from '@/api/dashboard'

function makeSession(overrides: Partial<NextSession> = {}): NextSession {
  return {
    sessionLogId: 's1',
    studentId: 'student-1',
    studentName: 'Ana García',
    studentCefrLevel: 'B1',
    sessionDate: new Date(Date.now() + 3600000).toISOString(),
    plannedContent: 'Subjunctive mood',
    lastSessionNotes: 'Struggles with ser/estar',
    lastSessionDate: new Date(Date.now() - 7 * 86400000).toISOString(),
    homeworkAssigned: 'Exercises page 42',
    previousHomeworkStatus: '3',
    ...overrides,
  }
}

describe('NextSessionHero', () => {
  it('renders empty state when no session', () => {
    render(
      <MemoryRouter>
        <NextSessionHero session={null} />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('zone1-empty')).toBeInTheDocument()
    expect(screen.getByText(/No sessions scheduled/)).toBeInTheDocument()
  })

  it('renders session hero with student name', () => {
    render(
      <MemoryRouter>
        <NextSessionHero session={makeSession()} />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('zone1-next-session')).toBeInTheDocument()
    expect(screen.getByText('Ana García')).toBeInTheDocument()
  })

  it('shows CEFR badge', () => {
    render(
      <MemoryRouter>
        <NextSessionHero session={makeSession()} />
      </MemoryRouter>,
    )
    expect(screen.getByText('B1')).toBeInTheDocument()
  })

  it('shows planned content', () => {
    render(
      <MemoryRouter>
        <NextSessionHero session={makeSession()} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Subjunctive mood')).toBeInTheDocument()
  })

  it('shows last session notes', () => {
    render(
      <MemoryRouter>
        <NextSessionHero session={makeSession()} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Struggles with ser/estar')).toBeInTheDocument()
  })

  it('shows homework assignment and status', () => {
    render(
      <MemoryRouter>
        <NextSessionHero session={makeSession()} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Exercises page 42')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('shows link to student profile', () => {
    render(
      <MemoryRouter>
        <NextSessionHero session={makeSession()} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /View profile/ })).toHaveAttribute('href', '/students/student-1')
  })

  it('shows countdown badge', () => {
    render(
      <MemoryRouter>
        <NextSessionHero session={makeSession()} />
      </MemoryRouter>,
    )
    expect(screen.getByText(/IN \d+/)).toBeInTheDocument()
  })
})
