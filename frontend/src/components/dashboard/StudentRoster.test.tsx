import { render, screen } from '@testing-library/react'
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

  it('shows pending todo count badge when student has pending todos', () => {
    const student = makeStudent({ pendingTodos: [
      { id: 't1', text: 'Todo 1', createdAt: new Date().toISOString(), status: 'pending', sourceSessionLogId: null, coveredInSessionLogId: null },
    ] })
    render(
      <MemoryRouter>
        <StudentRoster students={[student]} />
      </MemoryRouter>,
    )
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('limits to 10 students maximum', () => {
    const students = Array.from({ length: 15 }, (_, i) =>
      makeStudent({ studentId: `s${i}`, name: `Student ${i}`, nextSessionDate: new Date(Date.now() + i * 86400000).toISOString() }),
    )
    render(
      <MemoryRouter>
        <StudentRoster students={students} />
      </MemoryRouter>,
    )
    expect(screen.getAllByTestId('zone3-student-row')).toHaveLength(10)
  })
})
