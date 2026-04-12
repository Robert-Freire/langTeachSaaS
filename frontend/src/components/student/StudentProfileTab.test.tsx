import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StudentProfileTab } from './StudentProfileTab'
import type { Student } from '@/api/students'
import type { TeacherFollowup } from '@/api/followups'

vi.mock('@/api/followups', () => ({
  createFollowup: vi.fn(),
  updateFollowupStatus: vi.fn(),
}))

vi.mock('@/api/students', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/students')>()
  return {
    ...actual,
    appendTeachingTodo: vi.fn(),
    updateTeachingTodo: vi.fn(),
    deleteTeachingTodo: vi.fn(),
  }
})

function dateOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const FULL_STUDENT: Student = {
  id: 'student-1',
  name: 'Matteo Russo',
  learningLanguage: 'Spanish',
  cefrLevel: 'C1',
  interests: ['cinema', 'cooking'],
  personalNotes: 'Muy motivado, cinefilo.',
  teachingNotes: 'Nivel alto pero con lagunas.',
  nativeLanguages: ['Italian'],
  learningGoals: ['Dominar el subjuntivo', 'Preparar DELE C1'],
  weaknesses: [{ description: 'Ser/Estar', weaknessType: 'grammatical' }],
  difficulties: [
    { id: 'd1', description: 'Subjuntivo en concesivas', competency: 'Grammar', subcategory: 'subjuntivo', severity: 'high', trend: 'stable', status: 'Active' },
    { id: 'd2', description: 'Registro formal', competency: 'Writing', subcategory: '', severity: 'medium', trend: 'improving', status: 'Covered' },
  ],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  birthYear: 1998,
  profession: 'Film student',
  countryOfOrigin: 'Italy',
  cityOfOrigin: 'Rome',
  countryOfResidence: 'Spain',
  cityOfResidence: 'Barcelona',
  reasonForStudying: 'Vive en Barcelona',
  officialCefrLevel: null,
  shortTermObjectives: [
    { id: 'obj-1', text: 'Redaccion formal semanal', targetDate: '2026-05-01' },
  ],
  isActive: true,
  isCorporate: false,
  rate: '25 EUR/h',
  spokenLanguages: ['English', 'French'],
  teachingTodos: [
    { id: 'todo-1', text: 'Enviar ejercicios de por/para', createdAt: '2026-01-01T00:00:00Z', sourceSessionLogId: null, status: 'Pending', coveredInSessionLogId: null },
    { id: 'todo-2', text: 'Explicar diferencia', createdAt: '2026-01-01T00:00:00Z', sourceSessionLogId: null, status: 'Covered', coveredInSessionLogId: 'session-1' },
  ],
}

const EMPTY_STUDENT: Student = {
  ...FULL_STUDENT,
  birthYear: null,
  profession: null,
  countryOfOrigin: null,
  cityOfOrigin: null,
  countryOfResidence: null,
  cityOfResidence: null,
  reasonForStudying: null,
  personalNotes: null,
  teachingNotes: null,
  interests: [],
  nativeLanguages: [],
  learningGoals: [],
  spokenLanguages: [],
  shortTermObjectives: [],
  difficulties: [],
  teachingTodos: [],
}

function renderProfile(
  student: Student,
  opts?: {
    onToggle?: (id: string, status: 'Active' | 'Covered') => void
    onSaveReason?: (value: string) => Promise<void>
    onSaveInterests?: (value: string[]) => Promise<void>
    followups?: TeacherFollowup[]
  }
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <StudentProfileTab
          student={student}
          onStudentChange={() => {}}
          onToggleDifficultyStatus={opts?.onToggle}
          onSaveReasonForStudying={opts?.onSaveReason}
          onSaveInterests={opts?.onSaveInterests}
          followups={opts?.followups}
        />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('StudentProfileTab', () => {
  it('renders the profile tab container', () => {
    renderProfile(FULL_STUDENT)
    expect(screen.getByTestId('student-profile-tab')).toBeInTheDocument()
  })

  describe('Hero section', () => {
    it('renders the reason as a quote', () => {
      renderProfile(FULL_STUDENT)
      const quote = screen.getByTestId('reason-quote')
      expect(quote).toHaveTextContent('Vive en Barcelona')
    })

    it('shows empty state when no reason', () => {
      renderProfile(EMPTY_STUDENT)
      expect(screen.getByTestId('reason-quote')).toHaveTextContent('No reason for studying added yet.')
    })

    it('shows interests beside the quote', () => {
      renderProfile(FULL_STUDENT)
      const heroInterests = screen.getByTestId('hero-interests')
      expect(heroInterests).toBeInTheDocument()
      const tags = screen.getAllByTestId('hero-interest-tag')
      expect(tags.length).toBeGreaterThan(0)
    })

    it('does not show hero interests when no interests', () => {
      renderProfile({ ...FULL_STUDENT, interests: [] })
      expect(screen.queryByTestId('hero-interests')).not.toBeInTheDocument()
    })

    it('shows edit button when onSaveReasonForStudying is provided', () => {
      renderProfile(FULL_STUDENT, { onSaveReason: vi.fn().mockResolvedValue(undefined) })
      expect(screen.getByTestId('reason-edit-btn')).toBeInTheDocument()
    })

    it('does not show edit button when no callback', () => {
      renderProfile(FULL_STUDENT)
      expect(screen.queryByTestId('reason-edit-btn')).not.toBeInTheDocument()
    })

    it('switches to edit mode on pencil click', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)
      renderProfile(FULL_STUDENT, { onSaveReason: onSave })
      fireEvent.click(screen.getByTestId('reason-edit-btn'))
      expect(screen.getByTestId('reason-textarea')).toBeInTheDocument()
    })

    it('calls onSaveReasonForStudying on save', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)
      renderProfile(FULL_STUDENT, { onSaveReason: onSave })
      fireEvent.click(screen.getByTestId('reason-edit-btn'))
      const textarea = screen.getByTestId('reason-textarea')
      fireEvent.change(textarea, { target: { value: 'New reason' } })
      fireEvent.click(screen.getByTestId('reason-save-btn'))
      await waitFor(() => expect(onSave).toHaveBeenCalledWith('New reason'))
    })

    it('cancels edit and restores original value', () => {
      const onSave = vi.fn().mockResolvedValue(undefined)
      renderProfile(FULL_STUDENT, { onSaveReason: onSave })
      fireEvent.click(screen.getByTestId('reason-edit-btn'))
      fireEvent.change(screen.getByTestId('reason-textarea'), { target: { value: 'Changed' } })
      fireEvent.click(screen.getByTestId('reason-cancel-btn'))
      expect(screen.getByTestId('reason-quote')).toHaveTextContent('Vive en Barcelona')
    })
  })

  describe('Identity Details section', () => {
    it('shows identity fields when populated', () => {
      renderProfile(FULL_STUDENT)
      expect(screen.getByText('Rome, Italy')).toBeInTheDocument()
      expect(screen.getByText('Barcelona, Spain')).toBeInTheDocument()
      expect(screen.getByText(/^1998 \(\d+ years\)$/)).toBeInTheDocument()
      expect(screen.getByText('Film student')).toBeInTheDocument()
    })

    it('shows empty state when no identity data', () => {
      renderProfile(EMPTY_STUDENT)
      expect(screen.getByText('No identity details added yet')).toBeInTheDocument()
    })
  })

  describe('Interests section (right column)', () => {
    it('renders interest tags', () => {
      renderProfile(FULL_STUDENT)
      const section = screen.getByTestId('profile-interests')
      expect(section).toBeInTheDocument()
      const tags = screen.getAllByTestId('interest-tag')
      expect(tags.some((t) => t.textContent === 'cinema')).toBe(true)
    })

    it('shows empty state when no interests', () => {
      renderProfile(EMPTY_STUDENT)
      expect(screen.getByText('No interests added yet')).toBeInTheDocument()
    })

    it('shows edit/add buttons when onSaveInterests provided', () => {
      renderProfile(FULL_STUDENT, { onSaveInterests: vi.fn().mockResolvedValue(undefined) })
      expect(screen.getByTestId('interests-edit-btn')).toBeInTheDocument()
      expect(screen.getByTestId('interests-add-btn')).toBeInTheDocument()
    })

    it('enters edit mode and shows input', () => {
      renderProfile(FULL_STUDENT, { onSaveInterests: vi.fn().mockResolvedValue(undefined) })
      fireEvent.click(screen.getByTestId('interests-edit-btn'))
      expect(screen.getByTestId('interests-input')).toBeInTheDocument()
    })

    it('calls onSaveInterests on save', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)
      renderProfile(FULL_STUDENT, { onSaveInterests: onSave })
      fireEvent.click(screen.getByTestId('interests-edit-btn'))
      fireEvent.click(screen.getByTestId('interests-save-btn'))
      await waitFor(() => expect(onSave).toHaveBeenCalled())
    })
  })

  describe('Languages section', () => {
    it('shows native, spoken, and learning languages', () => {
      renderProfile(FULL_STUDENT)
      expect(screen.getByText('Italian')).toBeInTheDocument()
      expect(screen.getByText('English, French')).toBeInTheDocument()
      expect(screen.getByText('Spanish (C1)')).toBeInTheDocument()
    })
  })

  describe('Notes sections', () => {
    it('renders personal notes', () => {
      renderProfile(FULL_STUDENT)
      expect(screen.getByText(/Muy motivado/)).toBeInTheDocument()
    })

    it('renders teaching notes', () => {
      renderProfile(FULL_STUDENT)
      expect(screen.getByText(/Nivel alto/)).toBeInTheDocument()
    })

    it('shows empty states for missing notes', () => {
      renderProfile(EMPTY_STUDENT)
      expect(screen.getByText('No personal notes')).toBeInTheDocument()
      expect(screen.getByText('No pedagogical observations')).toBeInTheDocument()
    })
  })

  describe('Learning Goals section', () => {
    it('renders goals as bullet list items', () => {
      renderProfile(FULL_STUDENT)
      expect(screen.getByText('Dominar el subjuntivo')).toBeInTheDocument()
      expect(screen.getByText('Preparar DELE C1')).toBeInTheDocument()
    })

    it('shows empty state when no goals', () => {
      renderProfile(EMPTY_STUDENT)
      expect(screen.getByText('No learning goals set')).toBeInTheDocument()
    })
  })

  describe('Short-Term Objectives section', () => {
    it('renders objectives with target dates', () => {
      renderProfile(FULL_STUDENT)
      expect(screen.getByText('Redaccion formal semanal')).toBeInTheDocument()
      expect(screen.getByText(/Target:/)).toBeInTheDocument()
    })

    it('shows empty state when no objectives', () => {
      renderProfile(EMPTY_STUDENT)
      expect(screen.getByText('No objectives set')).toBeInTheDocument()
    })

    it('shows OVERDUE label for past-due objective', () => {
      const student = {
        ...FULL_STUDENT,
        shortTermObjectives: [
          { id: 'obj-1', text: 'Overdue objective', targetDate: dateOffset(-5) },
        ],
      }
      renderProfile(student)
      expect(screen.getByTestId('objective-overdue-label')).toBeInTheDocument()
    })

    it('shows Critical label for objective within 6 weeks', () => {
      const student = {
        ...FULL_STUDENT,
        shortTermObjectives: [
          { id: 'obj-1', text: 'Critical objective', targetDate: dateOffset(20) },
        ],
      }
      renderProfile(student)
      expect(screen.getByTestId('objective-critical-label')).toBeInTheDocument()
    })

    it('does not show urgency labels for normal objectives', () => {
      const student = {
        ...FULL_STUDENT,
        shortTermObjectives: [
          { id: 'obj-1', text: 'Normal objective', targetDate: dateOffset(60) },
        ],
      }
      renderProfile(student)
      expect(screen.queryByTestId('objective-overdue-label')).not.toBeInTheDocument()
      expect(screen.queryByTestId('objective-critical-label')).not.toBeInTheDocument()
    })
  })

  describe('Difficulties section', () => {
    it('renders difficulties with competency and severity', () => {
      renderProfile(FULL_STUDENT)
      expect(screen.getByText('Subjuntivo en concesivas')).toBeInTheDocument()
      expect(screen.getByText('Grammar')).toBeInTheDocument()
      expect(screen.getByText('high')).toBeInTheDocument()
    })

    it('applies strikethrough to covered difficulties', () => {
      renderProfile(FULL_STUDENT)
      const covered = screen.getByText('Registro formal')
      expect(covered.className).toContain('line-through')
    })

    it('calls onToggleDifficultyStatus when toggle button is clicked', () => {
      const onToggle = vi.fn()
      renderProfile(FULL_STUDENT, { onToggle })
      const toggleBtn = screen.getByTestId('toggle-difficulty-status-d1')
      fireEvent.click(toggleBtn)
      expect(onToggle).toHaveBeenCalledWith('d1', 'Covered')
    })

    it('shows empty state when no difficulties', () => {
      renderProfile(EMPTY_STUDENT)
      expect(screen.getByText('No difficulties tracked')).toBeInTheDocument()
    })
  })

  describe('Teaching Todos section', () => {
    it('renders teaching todos', () => {
      renderProfile(FULL_STUDENT)
      expect(screen.getByTestId('teaching-todos-list')).toBeInTheDocument()
      expect(screen.getByText('Enviar ejercicios de por/para')).toBeInTheDocument()
    })
  })

  describe('Pending Followups section', () => {
    const FOLLOWUP: TeacherFollowup = {
      id: 'fu-1',
      studentId: 'student-1',
      studentName: 'Matteo Russo',
      text: 'Enviar ejercicio de subjuntivo',
      status: 'pending',
      createdAt: new Date().toISOString(),
      dueDate: null,
      completedAt: null,
      sourceSessionLogId: null,
    }

    it('renders the followups section container', () => {
      renderProfile(FULL_STUDENT)
      expect(screen.getByTestId('profile-followups')).toBeInTheDocument()
    })

    it('renders a passed followup item', () => {
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
      render(
        <QueryClientProvider client={qc}>
          <MemoryRouter>
            <StudentProfileTab student={FULL_STUDENT} followups={[FOLLOWUP]} onFollowupChange={vi.fn()} onStudentChange={() => {}} />
          </MemoryRouter>
        </QueryClientProvider>
      )
      expect(screen.getByText('Enviar ejercicio de subjuntivo')).toBeInTheDocument()
    })

    it('renders empty state when no followups passed', () => {
      renderProfile(FULL_STUDENT)
      expect(screen.getByText(/No pending followups/)).toBeInTheDocument()
    })
  })

  describe('Commercial section', () => {
    it('shows active/private status and rate', () => {
      renderProfile(FULL_STUDENT)
      expect(screen.getByTestId('active-status-badge')).toHaveTextContent('Active')
      expect(screen.getByText('Private')).toBeInTheDocument()
      expect(screen.getByText('25 EUR/h')).toBeInTheDocument()
    })

    it('shows Former status when inactive', () => {
      renderProfile({ ...FULL_STUDENT, isActive: false })
      expect(screen.getByTestId('active-status-badge')).toHaveTextContent('Former')
    })

    it('shows Corporate badge when corporate', () => {
      renderProfile({ ...FULL_STUDENT, isCorporate: true })
      expect(screen.getByText('Corporate')).toBeInTheDocument()
    })
  })
})
