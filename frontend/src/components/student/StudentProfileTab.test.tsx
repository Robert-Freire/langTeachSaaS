import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { StudentProfileTab } from './StudentProfileTab'
import type { Student } from '@/api/students'

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
  nativeLanguages: [],
  learningGoals: [],
  spokenLanguages: [],
  shortTermObjectives: [],
  difficulties: [],
  teachingTodos: [],
}

function renderProfile(student: Student, onToggle?: (id: string, status: 'Active' | 'Covered') => void) {
  return render(
    <MemoryRouter>
      <StudentProfileTab student={student} onToggleDifficultyStatus={onToggle} />
    </MemoryRouter>
  )
}

describe('StudentProfileTab', () => {
  it('renders the profile tab container', () => {
    renderProfile(FULL_STUDENT)
    expect(screen.getByTestId('student-profile-tab')).toBeInTheDocument()
  })

  describe('About section', () => {
    it('shows identity fields when populated', () => {
      renderProfile(FULL_STUDENT)
      expect(screen.getByText('Rome, Italy')).toBeInTheDocument()
      expect(screen.getByText('Barcelona, Spain')).toBeInTheDocument()
      expect(screen.getByText('1998')).toBeInTheDocument()
      expect(screen.getByText('Film student')).toBeInTheDocument()
      expect(screen.getByText('Vive en Barcelona')).toBeInTheDocument()
    })

    it('shows empty state when no identity data', () => {
      renderProfile(EMPTY_STUDENT)
      expect(screen.getByText('No identity details added yet')).toBeInTheDocument()
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
      expect(screen.getByText('No teaching notes')).toBeInTheDocument()
    })
  })

  describe('Learning Goals section', () => {
    it('renders goals as chips', () => {
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
      renderProfile(FULL_STUDENT, onToggle)
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
