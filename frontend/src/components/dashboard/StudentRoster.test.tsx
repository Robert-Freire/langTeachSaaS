import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { StudentRoster } from './StudentRoster'
import type { ActiveStudent } from '@/api/dashboard'

function makeStudent(overrides: Partial<ActiveStudent> = {}): ActiveStudent {
  return {
    studentId: 'student-1',
    name: 'Ana García',
    cefrLevel: 'B1',
    nativeLanguages: ['English'],
    isActive: true,
    lastSessionDate: '2026-04-01T10:00:00Z',
    nextSessionDate: '2026-04-15T10:00:00Z',
    totalSessions: 5,
    teachingTodosCount: 0,
    pendingTodos: [],
    cancelledSessionsLast30Days: 0,
    ...overrides,
  }
}

describe('StudentRoster', () => {
  it('renders student rows', () => {
    render(
      <MemoryRouter>
        <StudentRoster students={[makeStudent()]} />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('zone3-student-row')).toBeInTheDocument()
    expect(screen.getByText('Ana García')).toBeInTheDocument()
  })

  it('renders zone3-student-roster testid', () => {
    render(
      <MemoryRouter>
        <StudentRoster students={[makeStudent()]} />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('zone3-student-roster')).toBeInTheDocument()
  })

  it('renders link to student detail', () => {
    render(
      <MemoryRouter>
        <StudentRoster students={[makeStudent()]} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Ana García' })).toHaveAttribute('href', '/students/student-1')
  })

  it('renders link to full students list', () => {
    render(
      <MemoryRouter>
        <StudentRoster students={[makeStudent()]} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /View entire student base/i })).toHaveAttribute('href', '/students')
  })

  it('shows empty state when no students', () => {
    render(
      <MemoryRouter>
        <StudentRoster students={[]} />
      </MemoryRouter>,
    )
    expect(screen.getByText(/No students yet/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Add your first student/i })).toBeInTheDocument()
  })

  it('shows student count', () => {
    render(
      <MemoryRouter>
        <StudentRoster students={[makeStudent(), makeStudent({ studentId: 's2', name: 'Marco Rossi' })]} />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('student-count')).toHaveTextContent('2 active enrollments')
  })

  it('shows singular enrollment for one student', () => {
    render(
      <MemoryRouter>
        <StudentRoster students={[makeStudent()]} />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('student-count')).toHaveTextContent('1 active enrollment')
  })

  it('shows L1 native language', () => {
    render(
      <MemoryRouter>
        <StudentRoster students={[makeStudent({ nativeLanguages: ['Spanish'] })]} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Spanish')).toBeInTheDocument()
  })

  it('shows dash for missing native language', () => {
    render(
      <MemoryRouter>
        <StudentRoster students={[makeStudent({ nativeLanguages: [] })]} />
      </MemoryRouter>,
    )
    const cells = screen.getAllByText('—')
    expect(cells.length).toBeGreaterThan(0)
  })

  it('shows paired last/next dates with arrow when both exist', () => {
    render(
      <MemoryRouter>
        <StudentRoster students={[makeStudent({
          lastSessionDate: new Date(Date.now() - 3 * 86400000).toISOString(),
          nextSessionDate: new Date(Date.now() + 5 * 86400000).toISOString(),
        })]} />
      </MemoryRouter>,
    )
    const row = screen.getByTestId('zone3-student-row')
    expect(row.textContent).toMatch(/→/)
    // The → appears in the data cell, not just the nav link
    const cells = row.querySelectorAll('td')
    const lastNextCell = Array.from(cells).find(td => td.textContent?.includes('→'))
    expect(lastNextCell).toBeTruthy()
  })

  it('shows only last date when no next session', () => {
    render(
      <MemoryRouter>
        <StudentRoster students={[makeStudent({ nextSessionDate: null })]} />
      </MemoryRouter>,
    )
    const row = screen.getByTestId('zone3-student-row')
    // The data row itself should not contain →
    expect(row.textContent).not.toMatch(/→/)
  })

  it('shows relative Today for last session today', () => {
    render(
      <MemoryRouter>
        <StudentRoster students={[makeStudent({ lastSessionDate: new Date().toISOString(), nextSessionDate: null })]} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Today')).toBeInTheDocument()
  })

  it('shows Review pending signal when student has pending todos', () => {
    const student = makeStudent({ pendingTodos: [
      { id: 't1', text: 'Todo 1', createdAt: new Date().toISOString(), status: 'pending', sourceSessionLogId: null, coveredInSessionLogId: null },
    ] })
    render(
      <MemoryRouter>
        <StudentRoster students={[student]} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Review pending')).toBeInTheDocument()
  })

  it('shows Cancelled 2x signal when cancelledSessionsLast30Days >= 2', () => {
    const student = makeStudent({ cancelledSessionsLast30Days: 2 })
    render(
      <MemoryRouter>
        <StudentRoster students={[student]} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Cancelled 2x')).toBeInTheDocument()
  })

  it('shows Inactive signal when last session >= 14 days ago and no next session', () => {
    const student = makeStudent({
      lastSessionDate: new Date(Date.now() - 20 * 86400000).toISOString(),
      nextSessionDate: null,
    })
    render(
      <MemoryRouter>
        <StudentRoster students={[student]} />
      </MemoryRouter>,
    )
    expect(screen.getByText(/Inactive \d+d/)).toBeInTheDocument()
  })

  it('renders sort dropdown showing Last Session by default', () => {
    render(
      <MemoryRouter>
        <StudentRoster students={[makeStudent()]} />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('roster-sort')).toHaveTextContent('Last Session')
  })

  it('sorts by name when Name option selected', () => {
    const students = [
      makeStudent({ studentId: 's1', name: 'Zara' }),
      makeStudent({ studentId: 's2', name: 'Ana' }),
    ]
    render(
      <MemoryRouter>
        <StudentRoster students={students} />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByTestId('roster-sort'))
    fireEvent.click(screen.getByTestId('roster-sort-option-name'))
    const rows = screen.getAllByTestId('zone3-student-row')
    expect(rows[0]).toHaveTextContent('Ana')
    expect(rows[1]).toHaveTextContent('Zara')
  })
})
