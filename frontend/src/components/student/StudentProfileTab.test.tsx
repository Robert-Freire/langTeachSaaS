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
  learningGoals: [
    { id: '1', text: 'Dominar el subjuntivo', children: [{ id: '1a', text: 'Subjuntivo de deseo', children: [] }] },
    { id: '2', text: 'Preparar DELE C1', children: [] },
  ],
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
  skillLevelOverrides: { Reading: 'B2', Writing: 'B1' },
  teachingTodos: [
    { id: 'todo-1', text: 'Enviar ejercicios de por/para', createdAt: '2026-01-01T00:00:00Z', sourceSessionLogId: null, status: 'pending', coveredInSessionLogId: null },
    { id: 'todo-2', text: 'Explicar diferencia', createdAt: '2026-01-01T00:00:00Z', sourceSessionLogId: null, status: 'covered', coveredInSessionLogId: 'session-1' },
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
  weaknesses: [],
  difficulties: [],
  teachingTodos: [],
  skillLevelOverrides: {},
}

function renderProfile(
  student: Student,
  opts?: {
    onToggle?: (id: string, status: 'Active' | 'Covered') => void
    difficultyToggleError?: string | null
    onSaveReason?: (value: string) => Promise<void>
    onSaveInterests?: (value: string[]) => Promise<void>
    onSaveLearningGoal?: (text: string) => Promise<void>
    onSaveShortTermObjective?: (text: string) => Promise<void>
    onSaveDifficulty?: (vars: { competency: string; description: string }) => Promise<void>
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
          difficultyToggleError={opts?.difficultyToggleError}
          onToggleDifficultyStatus={opts?.onToggle}
          onSaveReasonForStudying={opts?.onSaveReason}
          onSaveInterests={opts?.onSaveInterests}
          onSaveLearningGoal={opts?.onSaveLearningGoal}
          onSaveShortTermObjective={opts?.onSaveShortTermObjective}
          onSaveDifficulty={opts?.onSaveDifficulty}
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

    it('shows empty state prompt when no reason', () => {
      renderProfile(EMPTY_STUDENT)
      expect(screen.getByTestId('reason-quote')).toHaveTextContent(`Why is this student learning ${EMPTY_STUDENT.learningLanguage}?`)
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

    it('switches to edit mode on trigger click', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)
      renderProfile(FULL_STUDENT, { onSaveReason: onSave })
      fireEvent.click(screen.getByTestId('reason-edit-trigger'))
      expect(screen.getByTestId('reason-textarea')).toBeInTheDocument()
    })

    it('calls onSaveReasonForStudying on blur with trimmed value', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)
      renderProfile(FULL_STUDENT, { onSaveReason: onSave })
      fireEvent.click(screen.getByTestId('reason-edit-trigger'))
      const textarea = screen.getByTestId('reason-textarea')
      fireEvent.change(textarea, { target: { value: '  New reason  ' } })
      fireEvent.blur(textarea)
      await waitFor(() => expect(onSave).toHaveBeenCalledWith('New reason'))
    })

    it('Escape exits edit mode and does not call onSave', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)
      renderProfile(FULL_STUDENT, { onSaveReason: onSave })
      fireEvent.click(screen.getByTestId('reason-edit-trigger'))
      const textarea = screen.getByTestId('reason-textarea')
      fireEvent.change(textarea, { target: { value: 'Changed' } })
      fireEvent.keyDown(textarea, { key: 'Escape' })
      // Edit mode exits: textarea gone, original quote restored
      expect(screen.queryByTestId('reason-textarea')).not.toBeInTheDocument()
      expect(screen.getByTestId('reason-quote')).toHaveTextContent('Vive en Barcelona')
      expect(onSave).not.toHaveBeenCalled()
    })

    it('shows SavedIndicator after successful save', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)
      renderProfile(FULL_STUDENT, { onSaveReason: onSave })
      fireEvent.click(screen.getByTestId('reason-edit-trigger'))
      const textarea = screen.getByTestId('reason-textarea')
      fireEvent.change(textarea, { target: { value: 'New reason' } })
      fireEvent.blur(textarea)
      await waitFor(() => expect(screen.getByTestId('saved-indicator')).toBeInTheDocument())
    })

    it('shows error message when onSave rejects', async () => {
      const onSave = vi.fn().mockRejectedValue(new Error('network'))
      renderProfile(FULL_STUDENT, { onSaveReason: onSave })
      fireEvent.click(screen.getByTestId('reason-edit-trigger'))
      const textarea = screen.getByTestId('reason-textarea')
      fireEvent.change(textarea, { target: { value: 'New reason' } })
      fireEvent.blur(textarea)
      await waitFor(() => expect(screen.getByTestId('reason-save-error')).toBeInTheDocument())
    })
  })

  describe('Working Memory sidebar (right col top, always visible)', () => {
    it('shows identity fields when populated', () => {
      renderProfile(FULL_STUDENT)
      expect(screen.getByText('Rome, Italy')).toBeInTheDocument()
      expect(screen.getByText('Barcelona, Spain')).toBeInTheDocument()
      // Born shows year and age (no "years" suffix)
      expect(screen.getByText(/^1998 \(\d+\)$/)).toBeInTheDocument()
      expect(screen.getByText('Film student')).toBeInTheDocument()
    })

    it('is always visible even when no identity data (unconditional render)', () => {
      renderProfile(EMPTY_STUDENT)
      // TWM right sidebar is now always rendered, no need to click show-all
      expect(screen.getByTestId('profile-about')).toBeInTheDocument()
      expect(screen.getByText('No identity details added yet')).toBeInTheDocument()
    })
  })

  describe('Interests section (right column, always-editable)', () => {
    it('renders interest chips', () => {
      renderProfile(FULL_STUDENT)
      const section = screen.getByTestId('profile-interests')
      expect(section).toBeInTheDocument()
      const tags = screen.getAllByTestId('interest-tag')
      expect(tags.some((t) => t.textContent?.includes('cinema'))).toBe(true)
    })

    it('chip input is always visible without any interaction', () => {
      renderProfile(FULL_STUDENT, { onSaveInterests: vi.fn().mockResolvedValue(undefined) })
      expect(screen.getByTestId('interests-input')).toBeInTheDocument()
    })

    it('Enter key adds chip and calls onSave', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)
      renderProfile(FULL_STUDENT, { onSaveInterests: onSave })
      const input = screen.getByTestId('interests-input')
      fireEvent.change(input, { target: { value: 'gaming' } })
      fireEvent.keyDown(input, { key: 'Enter' })
      await waitFor(() => expect(onSave).toHaveBeenCalledWith(['cinema', 'cooking', 'gaming']))
    })

    it('comma key adds chip and calls onSave', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)
      renderProfile(FULL_STUDENT, { onSaveInterests: onSave })
      const input = screen.getByTestId('interests-input')
      fireEvent.change(input, { target: { value: 'gaming' } })
      fireEvent.keyDown(input, { key: ',' })
      await waitFor(() => expect(onSave).toHaveBeenCalledWith(['cinema', 'cooking', 'gaming']))
    })

    it('clicking × removes chip and calls onSave', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)
      renderProfile(FULL_STUDENT, { onSaveInterests: onSave })
      const removeBtn = screen.getByTestId('interest-remove-cinema')
      fireEvent.click(removeBtn)
      await waitFor(() => expect(onSave).toHaveBeenCalledWith(['cooking']))
    })

    it('does not call onSave on each keystroke', () => {
      const onSave = vi.fn().mockResolvedValue(undefined)
      renderProfile(FULL_STUDENT, { onSaveInterests: onSave })
      const input = screen.getByTestId('interests-input')
      fireEvent.change(input, { target: { value: 'c' } })
      fireEvent.change(input, { target: { value: 'co' } })
      fireEvent.change(input, { target: { value: 'coo' } })
      expect(onSave).not.toHaveBeenCalled()
    })
  })

  describe('Language Ecosystem section', () => {
    it('shows native language with code badge', () => {
      renderProfile(FULL_STUDENT)
      const section = screen.getByTestId('profile-language-ecosystem')
      expect(section).toHaveTextContent('Italian')
      expect(section).toHaveTextContent('IT')
    })

    it('shows spoken languages as flat list', () => {
      renderProfile(FULL_STUDENT)
      const section = screen.getByTestId('profile-language-ecosystem')
      expect(section).toHaveTextContent('English, French')
    })

    it('shows learning language with CEFR badge', () => {
      renderProfile(FULL_STUDENT)
      const section = screen.getByTestId('profile-language-ecosystem')
      expect(section).toHaveTextContent('Spanish')
      expect(section).toHaveTextContent('C1')
    })

    it('shows official CEFR level when set', () => {
      renderProfile({ ...FULL_STUDENT, officialCefrLevel: 'B2' })
      const section = screen.getByTestId('profile-language-ecosystem')
      expect(section).toHaveTextContent('Official')
      expect(section).toHaveTextContent('B2')
    })
  })

  describe('Skill Assessment section (inside Pedagogical Diagnostic)', () => {
    it('shows skill overrides as square CEFR badges', () => {
      renderProfile(FULL_STUDENT)
      const section = screen.getByTestId('profile-skill-assessment')
      expect(section).toHaveTextContent('Reading')
      expect(section).toHaveTextContent('B2')
      expect(section).toHaveTextContent('Writing')
      expect(section).toHaveTextContent('B1')
    })

    it('does not render skill assessment when no overrides', () => {
      renderProfile(EMPTY_STUDENT)
      expect(screen.queryByTestId('profile-skill-assessment')).not.toBeInTheDocument()
    })
  })

  describe('Teacher\'s Working Memory (unified notes, dark section)', () => {
    it('renders personal notes', () => {
      renderProfile(FULL_STUDENT)
      expect(screen.getByText(/Muy motivado/)).toBeInTheDocument()
    })

    it('renders teaching notes', () => {
      renderProfile(FULL_STUDENT)
      expect(screen.getByText(/Nivel alto/)).toBeInTheDocument()
    })

    it('is hidden when both notes are empty (empty state collapse)', () => {
      renderProfile(EMPTY_STUDENT)
      expect(screen.queryByTestId('profile-teachers-working-memory')).not.toBeInTheDocument()
    })

    it('is hidden when personalNotes is a sentinel string', () => {
      renderProfile({ ...EMPTY_STUDENT, personalNotes: '[visual-seed]' })
      expect(screen.queryByTestId('profile-teachers-working-memory')).not.toBeInTheDocument()
    })

    it('does not render sentinel personalNotes text', () => {
      renderProfile({ ...EMPTY_STUDENT, personalNotes: '[scenario-seed]' })
      expect(screen.queryByText('[scenario-seed]')).not.toBeInTheDocument()
    })

    it('shows when revealed via show-all toggle', () => {
      renderProfile(EMPTY_STUDENT)
      const toggle = screen.getByTestId('show-empty-sections-btn')
      fireEvent.click(toggle)
      expect(screen.getByTestId('profile-teachers-working-memory')).toBeInTheDocument()
    })
  })

  describe('Learning Goals section', () => {
    it('renders goals as bullet list items', () => {
      renderProfile(FULL_STUDENT)
      expect(screen.getByText('Dominar el subjuntivo')).toBeInTheDocument()
      expect(screen.getByText('Preparar DELE C1')).toBeInTheDocument()
    })

    it('renders sub-goals indented under parent', () => {
      renderProfile(FULL_STUDENT)
      expect(screen.getByText('Subjuntivo de deseo')).toBeInTheDocument()
    })

    it('shows empty state when no goals', () => {
      renderProfile(EMPTY_STUDENT)
      expect(screen.getByText('No learning goals set')).toBeInTheDocument()
    })

    it('shows + button when onSaveLearningGoal is provided', () => {
      renderProfile(FULL_STUDENT, { onSaveLearningGoal: vi.fn().mockResolvedValue(undefined) })
      expect(screen.getByTestId('goal-add-btn')).toBeInTheDocument()
    })

    it('opens inline input when + is clicked', () => {
      renderProfile(FULL_STUDENT, { onSaveLearningGoal: vi.fn().mockResolvedValue(undefined) })
      fireEvent.click(screen.getByTestId('goal-add-btn'))
      expect(screen.getByTestId('goal-add-btn-input')).toBeInTheDocument()
    })

    it('calls onSaveLearningGoal on Enter key', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)
      renderProfile(FULL_STUDENT, { onSaveLearningGoal: onSave })
      fireEvent.click(screen.getByTestId('goal-add-btn'))
      const input = screen.getByTestId('goal-add-btn-input')
      fireEvent.change(input, { target: { value: 'New goal text' } })
      fireEvent.keyDown(input, { key: 'Enter' })
      await waitFor(() => expect(onSave).toHaveBeenCalledWith('New goal text'))
    })

    it('calls onSaveLearningGoal on save button click', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)
      renderProfile(FULL_STUDENT, { onSaveLearningGoal: onSave })
      fireEvent.click(screen.getByTestId('goal-add-btn'))
      fireEvent.change(screen.getByTestId('goal-add-btn-input'), { target: { value: 'Another goal' } })
      fireEvent.click(screen.getByTestId('goal-add-btn-save'))
      await waitFor(() => expect(onSave).toHaveBeenCalledWith('Another goal'))
    })

    it('closes input on Escape', () => {
      renderProfile(FULL_STUDENT, { onSaveLearningGoal: vi.fn().mockResolvedValue(undefined) })
      fireEvent.click(screen.getByTestId('goal-add-btn'))
      const input = screen.getByTestId('goal-add-btn-input')
      fireEvent.keyDown(input, { key: 'Escape' })
      expect(screen.queryByTestId('goal-add-btn-input')).not.toBeInTheDocument()
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

    it('shows Critical label for objective within 3 days', () => {
      const student = {
        ...FULL_STUDENT,
        shortTermObjectives: [
          { id: 'obj-1', text: 'Critical objective', targetDate: dateOffset(2) },
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

    it('shows + button when onSaveShortTermObjective is provided', () => {
      renderProfile(FULL_STUDENT, { onSaveShortTermObjective: vi.fn().mockResolvedValue(undefined) })
      expect(screen.getByTestId('objective-add-btn')).toBeInTheDocument()
    })

    it('opens inline input and saves on Enter', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)
      renderProfile(FULL_STUDENT, { onSaveShortTermObjective: onSave })
      fireEvent.click(screen.getByTestId('objective-add-btn'))
      const input = screen.getByTestId('objective-add-btn-input')
      fireEvent.change(input, { target: { value: 'New objective' } })
      fireEvent.keyDown(input, { key: 'Enter' })
      await waitFor(() => expect(onSave).toHaveBeenCalledWith('New objective'))
    })
  })

  describe('Focus Areas & Difficulties section', () => {
    it('renders difficulties as a table with Area, Subcategory, Trend, Status columns', () => {
      renderProfile(FULL_STUDENT)
      const section = screen.getByTestId('profile-focus-areas')
      expect(section).toBeInTheDocument()
      expect(section).toHaveTextContent('Area')
      expect(section).toHaveTextContent('Subcategory')
      expect(section).toHaveTextContent('Trend')
      expect(section).toHaveTextContent('Status')
    })

    it('renders difficulty area (competency) and subcategory', () => {
      renderProfile(FULL_STUDENT)
      expect(screen.getByText('Grammar')).toBeInTheDocument()
      expect(screen.getByText('subjuntivo')).toBeInTheDocument()
    })

    it('shows description as muted secondary line when subcategory and description are both set', () => {
      renderProfile(FULL_STUDENT)
      // d1 has subcategory 'subjuntivo' and description 'Subjuntivo en concesivas'
      expect(screen.getByText('subjuntivo')).toBeInTheDocument()
      expect(screen.getByText('Subjuntivo en concesivas')).toBeInTheDocument()
    })

    it('shows description as primary text when subcategory is empty', () => {
      renderProfile(FULL_STUDENT)
      // d2 has empty subcategory and description 'Registro formal'
      expect(screen.getByText('Registro formal')).toBeInTheDocument()
    })

    it('renders trend badge with capitalized value', () => {
      renderProfile(FULL_STUDENT)
      expect(screen.getByText('Stable')).toBeInTheDocument()
      expect(screen.getByText('Improving')).toBeInTheDocument()
    })

    it('renders Working status for Active difficulty', () => {
      renderProfile(FULL_STUDENT)
      expect(screen.getByTestId('difficulty-status-d1')).toHaveTextContent('Working')
    })

    it('renders Covered status for Covered difficulty', () => {
      renderProfile(FULL_STUDENT)
      expect(screen.getByTestId('difficulty-status-d2')).toHaveTextContent('Covered')
    })

    it('calls onToggleDifficultyStatus when toggle button is clicked', () => {
      const onToggle = vi.fn()
      renderProfile(FULL_STUDENT, { onToggle })
      const toggleBtn = screen.getByTestId('toggle-difficulty-status-d1')
      fireEvent.click(toggleBtn)
      expect(onToggle).toHaveBeenCalledWith('d1', 'Covered')
    })

    it('renders weaknesses with category badges', () => {
      renderProfile(FULL_STUDENT)
      const section = screen.getByTestId('profile-weaknesses')
      expect(section).toBeInTheDocument()
      expect(screen.getByText('Ser/Estar')).toBeInTheDocument()
      const badges = screen.getAllByTestId('weakness-type-badge')
      expect(badges.some((b) => b.textContent === 'Grammatical')).toBe(true)
    })

    it('shows empty state when both weaknesses and difficulties are empty', () => {
      renderProfile(EMPTY_STUDENT)
      expect(screen.getByText('No focus areas tracked')).toBeInTheDocument()
    })

    it('shows difficulties table when difficulties exist but weaknesses empty', () => {
      renderProfile({ ...EMPTY_STUDENT, difficulties: FULL_STUDENT.difficulties })
      expect(screen.getByTestId('profile-focus-areas')).toBeInTheDocument()
      expect(screen.queryByText('No focus areas tracked')).not.toBeInTheDocument()
    })

    it('shows weaknesses section when weaknesses exist but difficulties empty', () => {
      renderProfile({ ...EMPTY_STUDENT, weaknesses: FULL_STUDENT.weaknesses })
      expect(screen.getByTestId('profile-weaknesses')).toBeInTheDocument()
      expect(screen.queryByText('No focus areas tracked')).not.toBeInTheDocument()
    })

    it('shows + button when onSaveDifficulty is provided', () => {
      renderProfile(FULL_STUDENT, { onSaveDifficulty: vi.fn().mockResolvedValue(undefined) })
      expect(screen.getByTestId('difficulty-add-btn')).toBeInTheDocument()
    })

    it('opens two-field inline input when + is clicked', () => {
      renderProfile(FULL_STUDENT, { onSaveDifficulty: vi.fn().mockResolvedValue(undefined) })
      fireEvent.click(screen.getByTestId('difficulty-add-btn'))
      expect(screen.getByTestId('difficulty-add-competency')).toBeInTheDocument()
      expect(screen.getByTestId('difficulty-add-description')).toBeInTheDocument()
    })

    it('calls onSaveDifficulty with both fields on Enter', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)
      renderProfile(FULL_STUDENT, { onSaveDifficulty: onSave })
      fireEvent.click(screen.getByTestId('difficulty-add-btn'))
      fireEvent.change(screen.getByTestId('difficulty-add-competency'), { target: { value: 'Pronunciation' } })
      fireEvent.change(screen.getByTestId('difficulty-add-description'), { target: { value: 'Rolling R' } })
      fireEvent.keyDown(screen.getByTestId('difficulty-add-description'), { key: 'Enter' })
      await waitFor(() =>
        expect(onSave).toHaveBeenCalledWith({ competency: 'Pronunciation', description: 'Rolling R' })
      )
    })
  })

  describe('Teaching Todos section', () => {
    it('renders teaching todos', () => {
      renderProfile(FULL_STUDENT)
      expect(screen.getByTestId('teaching-todos-list')).toBeInTheDocument()
      expect(screen.getByText('Enviar ejercicios de por/para')).toBeInTheDocument()
    })

    it('displays section heading as "Ideas para Clases"', () => {
      renderProfile(FULL_STUDENT)
      expect(screen.getByText('Ideas para Clases')).toBeInTheDocument()
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

  describe('Empty state progressive disclosure', () => {
    it('shows "show all sections" toggle when left column dark TWM is empty', () => {
      renderProfile(EMPTY_STUDENT)
      // EMPTY_STUDENT has no notes, so left column dark TWM is collapsed
      expect(screen.getByTestId('show-empty-sections-btn')).toBeInTheDocument()
    })

    it('does not show the toggle when all sections have data', () => {
      renderProfile(FULL_STUDENT)
      // FULL_STUDENT has notes, so left column dark TWM is visible
      expect(screen.queryByTestId('show-empty-sections-btn')).not.toBeInTheDocument()
    })

    it('right sidebar TWM (profile-about) is always visible, not controlled by show-all', () => {
      renderProfile(EMPTY_STUDENT)
      // TWM right sidebar is unconditionally rendered
      expect(screen.getByTestId('profile-about')).toBeInTheDocument()
    })

    it('reveals left column dark TWM after clicking show-all', () => {
      renderProfile(EMPTY_STUDENT)
      expect(screen.queryByTestId('profile-teachers-working-memory')).not.toBeInTheDocument()
      fireEvent.click(screen.getByTestId('show-empty-sections-btn'))
      expect(screen.getByTestId('profile-teachers-working-memory')).toBeInTheDocument()
    })

    it('hides the toggle after expanding', () => {
      renderProfile(EMPTY_STUDENT)
      fireEvent.click(screen.getByTestId('show-empty-sections-btn'))
      expect(screen.queryByTestId('show-empty-sections-btn')).not.toBeInTheDocument()
    })
  })

  describe('difficulty toggle error', () => {
    it('shows error message when difficultyToggleError is set', () => {
      renderProfile(FULL_STUDENT, {
        difficultyToggleError: 'Could not update difficulty status. Please try again.',
      })
      expect(screen.getByTestId('difficulty-toggle-error')).toBeInTheDocument()
      expect(screen.getByText('Could not update difficulty status. Please try again.')).toBeInTheDocument()
    })

    it('does not show error message when difficultyToggleError is null', () => {
      renderProfile(FULL_STUDENT, { difficultyToggleError: null })
      expect(screen.queryByTestId('difficulty-toggle-error')).not.toBeInTheDocument()
    })
  })
})
