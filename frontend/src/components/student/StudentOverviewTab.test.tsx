import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StudentOverviewTab } from './StudentOverviewTab'
import type { Student } from '@/api/students'

vi.mock('@/api/followups', () => ({
  createFollowup: vi.fn(),
  updateFollowupStatus: vi.fn(),
}))

function dateOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const BASE_STUDENT: Student = {
  id: 'student-1',
  name: 'Ana García',
  learningLanguage: 'Spanish',
  cefrLevel: 'B1',
  interests: ['reading', 'travel'],
  personalNotes: null,
  teachingNotes: null,
  nativeLanguages: ['English'],
  learningGoals: ['Conversational fluency'],
  weaknesses: [],
  difficulties: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  birthYear: null,
  profession: 'Designer',
  countryOfOrigin: null,
  cityOfOrigin: null,
  countryOfResidence: null,
  cityOfResidence: null,
  reasonForStudying: 'Moving to Spain next year',
  officialCefrLevel: null,
  shortTermObjectives: [],
  isActive: true,
  isCorporate: false,
  rate: null,
  spokenLanguages: [],
  teachingTodos: [],
  skillLevelOverrides: {},
}

function renderOverview(student: Student) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <StudentOverviewTab student={student} />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('StudentOverviewTab', () => {
  it('renders overview tab', () => {
    renderOverview(BASE_STUDENT)
    expect(screen.getByTestId('student-overview-tab')).toBeInTheDocument()
  })

  it('shows empty state when no objectives', () => {
    renderOverview(BASE_STUDENT)
    expect(screen.getByText('No objectives set')).toBeInTheDocument()
  })

  it('shows primary objective text and date', () => {
    const student = {
      ...BASE_STUDENT,
      shortTermObjectives: [
        { id: 'obj-1', text: 'Pass DELE B1 exam', targetDate: dateOffset(50) },
      ],
    }
    renderOverview(student)
    expect(screen.getByTestId('objective-text')).toHaveTextContent('Pass DELE B1 exam')
    expect(screen.getByTestId('days-remaining')).toHaveTextContent('days left')
  })

  it('shows OVERDUE for past-due objective', () => {
    const student = {
      ...BASE_STUDENT,
      shortTermObjectives: [
        { id: 'obj-1', text: 'Complete workbook', targetDate: dateOffset(-5) },
      ],
    }
    renderOverview(student)
    expect(screen.getByTestId('days-remaining')).toHaveTextContent('OVERDUE')
  })

  it('shows critical treatment for objective within 6 weeks', () => {
    const student = {
      ...BASE_STUDENT,
      shortTermObjectives: [
        { id: 'obj-1', text: 'Prepare presentation', targetDate: dateOffset(20) },
      ],
    }
    renderOverview(student)
    const item = screen.getByTestId('objective-item')
    expect(item.className).toContain('border-orange')
  })

  it('shows count of additional objectives', () => {
    const student = {
      ...BASE_STUDENT,
      shortTermObjectives: [
        { id: 'obj-1', text: 'First objective', targetDate: dateOffset(50) },
        { id: 'obj-2', text: 'Second objective', targetDate: dateOffset(60) },
        { id: 'obj-3', text: 'Third objective', targetDate: dateOffset(70) },
      ],
    }
    renderOverview(student)
    expect(screen.getByText('+2 more objectives')).toBeInTheDocument()
  })

  it('sorts overdue before critical before normal', () => {
    const student = {
      ...BASE_STUDENT,
      shortTermObjectives: [
        { id: 'obj-normal', text: 'Normal objective', targetDate: dateOffset(60) },
        { id: 'obj-overdue', text: 'Overdue objective', targetDate: dateOffset(-10) },
        { id: 'obj-critical', text: 'Critical objective', targetDate: dateOffset(14) },
      ],
    }
    renderOverview(student)
    expect(screen.getByTestId('objective-text')).toHaveTextContent('Overdue objective')
  })
})
