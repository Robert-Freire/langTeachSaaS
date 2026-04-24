import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
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
    lastSessionTopicTags: ['Subjuntivo', 'Concesivas'],
    lastSessionHomework: 'Redacción mi ciudad ideal',
    lastSessionFollowups: ['Prometí ejercicios de por/para'],
    teachingLanguage: 'Spanish',
    totalSessionCount: 14,
    ...overrides,
  }
}

afterEach(() => {
  vi.useRealTimers()
})

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

  it('shows Start session CTA linking to log-session route', () => {
    render(
      <MemoryRouter>
        <NextSessionHero session={makeSession()} />
      </MemoryRouter>,
    )
    const btn = screen.getByTestId('start-session-btn')
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveAttribute('href', '/students/student-1/log-session')
  })

  it('shows View profile link', () => {
    render(
      <MemoryRouter>
        <NextSessionHero session={makeSession()} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /View profile/ })).toHaveAttribute('href', '/students/student-1')
  })

  it('shows identity subtitle with language and session count', () => {
    render(
      <MemoryRouter>
        <NextSessionHero session={makeSession({ teachingLanguage: 'Spanish', totalSessionCount: 14 })} />
      </MemoryRouter>,
    )
    const subtitle = screen.getByTestId('hero-identity-subtitle')
    expect(subtitle).toHaveTextContent('Spanish')
    expect(subtitle).toHaveTextContent('Session #14')
  })

  it('hides identity subtitle when no language and count is 0', () => {
    render(
      <MemoryRouter>
        <NextSessionHero session={makeSession({ teachingLanguage: null, totalSessionCount: 0 })} />
      </MemoryRouter>,
    )
    expect(screen.queryByTestId('hero-identity-subtitle')).not.toBeInTheDocument()
  })

  it('shows green gradient badge for session within 2 hours', () => {
    render(
      <MemoryRouter>
        <NextSessionHero session={makeSession({ sessionDate: new Date(Date.now() + 30 * 60000).toISOString() })} />
      </MemoryRouter>,
    )
    expect(screen.getByText(/IN \d+ MIN/)).toBeInTheDocument()
  })

  it('shows neutral TODAY badge for session today but not imminent', () => {
    render(
      <MemoryRouter>
        <NextSessionHero session={makeSession({ sessionDate: new Date(Date.now() + 4 * 3600000).toISOString() })} />
      </MemoryRouter>,
    )
    expect(screen.getByText(/TODAY/)).toBeInTheDocument()
  })

  it('shows no badge for session more than 7 days away', () => {
    render(
      <MemoryRouter>
        <NextSessionHero session={makeSession({ sessionDate: new Date(Date.now() + 10 * 86400000).toISOString() })} />
      </MemoryRouter>,
    )
    // No IN badge should appear
    expect(screen.queryByText(/^IN \d/)).not.toBeInTheDocument()
    expect(screen.queryByText(/TODAY/)).not.toBeInTheDocument()
  })

  it('shows structured briefing: topics and promises', () => {
    render(
      <MemoryRouter>
        <NextSessionHero session={makeSession()} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Subjuntivo, Concesivas')).toBeInTheDocument()
    expect(screen.getByText('Prometí ejercicios de por/para')).toBeInTheDocument()
  })

  it('shows last session homework in briefing', () => {
    render(
      <MemoryRouter>
        <NextSessionHero session={makeSession()} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Redacción mi ciudad ideal')).toBeInTheDocument()
  })

  it('shows homework status card with previousHomeworkStatus', () => {
    render(
      <MemoryRouter>
        <NextSessionHero session={makeSession()} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Exercises page 42')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('hides briefing section when all briefing fields are empty', () => {
    render(
      <MemoryRouter>
        <NextSessionHero
          session={makeSession({
            lastSessionNotes: null,
            lastSessionTopicTags: [],
            lastSessionHomework: null,
            lastSessionFollowups: [],
            homeworkAssigned: null,
          })}
        />
      </MemoryRouter>,
    )
    expect(screen.queryByText('Topics')).not.toBeInTheDocument()
    expect(screen.queryByText('Promises made')).not.toBeInTheDocument()
  })

  describe('topic tag filtering', () => {
    it('hides TOPICS row when lastSessionTopicTags is an empty array', () => {
      render(
        <MemoryRouter>
          <NextSessionHero session={makeSession({ lastSessionTopicTags: [] })} />
        </MemoryRouter>,
      )
      expect(screen.queryByText('Topics')).not.toBeInTheDocument()
    })

    it('hides TOPICS row when lastSessionTopicTags contains a single empty string', () => {
      render(
        <MemoryRouter>
          <NextSessionHero session={makeSession({ lastSessionTopicTags: [''] })} />
        </MemoryRouter>,
      )
      expect(screen.queryByText('Topics')).not.toBeInTheDocument()
    })

    it('hides TOPICS row when lastSessionTopicTags contains only whitespace strings', () => {
      render(
        <MemoryRouter>
          <NextSessionHero session={makeSession({ lastSessionTopicTags: ['   ', '\t'] })} />
        </MemoryRouter>,
      )
      expect(screen.queryByText('Topics')).not.toBeInTheDocument()
    })

    it('shows only real tags when mixed with empty strings', () => {
      render(
        <MemoryRouter>
          <NextSessionHero session={makeSession({ lastSessionTopicTags: ['', 'Subjuntivo', '  ', 'Concesivas'] })} />
        </MemoryRouter>,
      )
      expect(screen.getByText('Subjuntivo, Concesivas')).toBeInTheDocument()
    })

    it('shows all real tags when none are empty', () => {
      render(
        <MemoryRouter>
          <NextSessionHero session={makeSession({ lastSessionTopicTags: ['Pretérito', 'Imperfecto'] })} />
        </MemoryRouter>,
      )
      expect(screen.getByText('Pretérito, Imperfecto')).toBeInTheDocument()
    })
  })

  it('refreshes countdown badge after 60 seconds', async () => {
    vi.useFakeTimers()
    // Session is 45 minutes away — renders as "IN 45 MIN"
    const sessionDate = new Date(Date.now() + 45 * 60000).toISOString()
    render(
      <MemoryRouter>
        <NextSessionHero session={makeSession({ sessionDate })} />
      </MemoryRouter>,
    )
    expect(screen.getByText(/IN 45 MIN/)).toBeInTheDocument()

    // Advance 61 seconds so the 60s interval fires and Date.now() moves forward
    await act(async () => {
      vi.advanceTimersByTime(61000)
    })

    // Badge label should now reflect the reduced time (~44 min)
    expect(screen.getByText(/IN 44 MIN/)).toBeInTheDocument()
  })
})
