import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { VoiceUpdateDrawer } from './VoiceUpdateDrawer'
import { mergeExtractedIntoStudent } from '@/lib/voiceUpdateMerge'
import type { Student } from '@/api/students'
import type { ExtractedStudentProfile } from '@/api/studentExtraction'

const BASE_STUDENT: Student = {
  id: 's1',
  name: 'Ana',
  learningLanguage: 'Spanish',
  level: { cefrLevel: 'A2', officialCefrLevel: null, skillLevelOverrides: {} },
  languages: { nativeLanguages: ['English'], spokenLanguages: [] },
  identity: { birthYear: null, age: null, profession: null, countryOfOrigin: null, cityOfOrigin: null, countryOfResidence: null, cityOfResidence: null },
  profile: { interests: [], personalNotes: null, teachingNotes: null, learningGoals: [], weaknesses: [], difficulties: [], shortTermObjectives: [], teachingTodos: [], reasonForStudying: null },
  commercial: { isActive: true, isCorporate: false, rate: null },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const EMPTY_EXTRACTED: ExtractedStudentProfile = {
  name: null, birthYear: null, profession: null, countryOfResidence: null, cityOfResidence: null,
  reasonForStudying: null, nativeLanguages: [], spokenLanguages: [], cefrLevel: null,
  officialCefrLevel: null, shortTermObjectives: [], difficulties: [], teachingTodoTexts: [], interests: [],
}

function renderDrawer(extracted: Partial<ExtractedStudentProfile> = {}, student: Student = BASE_STUDENT) {
  const onSave = vi.fn()
  const onClose = vi.fn()
  render(
    <VoiceUpdateDrawer
      student={student}
      extracted={{ ...EMPTY_EXTRACTED, ...extracted }}
      saving={false}
      onSave={onSave}
      onClose={onClose}
    />
  )
  return { onSave, onClose }
}

describe('VoiceUpdateDrawer', () => {
  it('shows empty state when nothing is extracted', () => {
    renderDrawer()
    expect(screen.getByTestId('empty-extraction')).toBeInTheDocument()
    expect(screen.queryByTestId('drawer-save')).not.toBeInTheDocument()
  })

  it('renders CHANGED badge when scalar field has different existing value', () => {
    renderDrawer({ cefrLevel: 'B1' })
    expect(screen.getByTestId('badge-CHANGED')).toBeInTheDocument()
  })

  it('renders NEW badge when scalar field is currently null', () => {
    renderDrawer({ profession: 'Teacher' })
    expect(screen.getByTestId('badge-NEW')).toBeInTheDocument()
  })

  it('renders ADDED badge for list items', () => {
    renderDrawer({ interests: ['Cooking'] })
    expect(screen.getByTestId('badge-ADDED')).toBeInTheDocument()
  })

  it('remove icon drops a row and updates save count', () => {
    renderDrawer({ profession: 'Teacher', interests: ['Cooking'] })
    const removeButtons = screen.getAllByLabelText('Remove')
    expect(screen.getByTestId('drawer-save')).toHaveTextContent('Save 2 changes')
    fireEvent.click(removeButtons[0])
    expect(screen.getByTestId('drawer-save')).toHaveTextContent('Save 1 change')
  })

  it('save button is disabled when all rows removed', () => {
    renderDrawer({ profession: 'Teacher' })
    fireEvent.click(screen.getByLabelText('Remove'))
    expect(screen.getByTestId('drawer-save')).toBeDisabled()
  })

  it('inline edit updates row value', () => {
    renderDrawer({ profession: 'Teacher' })
    fireEvent.click(screen.getByLabelText('Edit'))
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Engineer' } })
    fireEvent.blur(input)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('cancel calls onClose without calling onSave', () => {
    const { onSave, onClose } = renderDrawer({ profession: 'Teacher' })
    fireEvent.click(screen.getByTestId('drawer-cancel'))
    expect(onClose).toHaveBeenCalled()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('save calls onSave with merged patch', () => {
    const { onSave } = renderDrawer({ profession: 'Teacher' })
    fireEvent.click(screen.getByTestId('drawer-save'))
    expect(onSave).toHaveBeenCalledTimes(1)
    const patch = onSave.mock.calls[0][0]
    expect(patch.profession).toBe('Teacher')
  })

  it('backdrop click calls onClose', () => {
    const { onClose } = renderDrawer({ profession: 'Teacher' })
    fireEvent.click(screen.getByTestId('drawer-backdrop'))
    expect(onClose).toHaveBeenCalled()
  })
})

describe('VoiceUpdateDrawer — create mode', () => {
  function renderCreateDrawer(extracted: Partial<ExtractedStudentProfile> = {}) {
    const onSave = vi.fn()
    const onClose = vi.fn()
    render(
      <VoiceUpdateDrawer
        mode="create"
        extracted={{ ...EMPTY_EXTRACTED, ...extracted }}
        saving={false}
        onSave={onSave}
        onClose={onClose}
      />
    )
    return { onSave, onClose }
  }

  it('shows empty state when nothing extracted (no name)', () => {
    renderCreateDrawer()
    expect(screen.getByTestId('empty-extraction')).toBeInTheDocument()
  })

  it('renders all rows with NEW badge', () => {
    renderCreateDrawer({ name: 'María', profession: 'Nurse', interests: ['Travel'] })
    const badges = screen.getAllByTestId('badge-NEW')
    expect(badges.length).toBeGreaterThanOrEqual(3)
    expect(screen.queryByTestId('badge-CHANGED')).not.toBeInTheDocument()
    expect(screen.queryByTestId('badge-ADDED')).not.toBeInTheDocument()
  })

  it('CTA label is "Create student"', () => {
    renderCreateDrawer({ name: 'María' })
    expect(screen.getByTestId('drawer-save')).toHaveTextContent('Create student')
  })

  it('shows name-required warning when name absent', () => {
    renderCreateDrawer({ profession: 'Nurse' })
    expect(screen.getByTestId('name-required-warning')).toBeInTheDocument()
    expect(screen.getByTestId('drawer-save')).toBeDisabled()
  })

  it('save is enabled when name is present', () => {
    renderCreateDrawer({ name: 'María', profession: 'Nurse' })
    expect(screen.queryByTestId('name-required-warning')).not.toBeInTheDocument()
    expect(screen.getByTestId('drawer-save')).not.toBeDisabled()
  })

  it('onSave receives rows when confirmed', () => {
    const { onSave } = renderCreateDrawer({ name: 'María', profession: 'Nurse' })
    fireEvent.click(screen.getByTestId('drawer-save'))
    expect(onSave).toHaveBeenCalledTimes(1)
    const rows = onSave.mock.calls[0][0]
    expect(Array.isArray(rows)).toBe(true)
    expect(rows.some((r: { fieldKey: string }) => r.fieldKey === 'name')).toBe(true)
  })
})

describe('mergeExtractedIntoStudent', () => {
  function makeRow(fieldKey: string, value: string, badge: 'CHANGED' | 'NEW' | 'ADDED' = 'NEW') {
    return { id: 'r1', fieldKey, label: fieldKey, badge, currentValue: null, value }
  }

  it('replaces scalar field', () => {
    const rows = [makeRow('cefrLevel', 'B2', 'CHANGED')]
    const patch = mergeExtractedIntoStudent(rows, BASE_STUDENT)
    expect(patch.cefrLevel).toBe('B2')
  })

  it('deduplicates interests case-insensitively', () => {
    const student: Student = { ...BASE_STUDENT, profile: { ...BASE_STUDENT.profile, interests: ['cooking'] } }
    const rows = [makeRow('interests', 'Cooking', 'ADDED')]
    const patch = mergeExtractedIntoStudent(rows, student)
    expect((patch as { interests: string[] }).interests).toEqual(['cooking'])
  })

  it('appends unique interest', () => {
    const rows = [makeRow('interests', 'Travel', 'ADDED')]
    const patch = mergeExtractedIntoStudent(rows, BASE_STUDENT)
    expect((patch as { interests: string[] }).interests).toContain('Travel')
  })

  it('always appends teachingTodos without dedup', () => {
    const existing = [{ id: 'e1', text: 'Practice vocab', createdAt: '2026-01-01T00:00:00Z', sourceSessionLogId: null, status: 'pending', coveredInSessionLogId: null }]
    const student: Student = { ...BASE_STUDENT, profile: { ...BASE_STUDENT.profile, teachingTodos: existing } }
    const rows = [makeRow('teachingTodos', 'Practice vocab', 'ADDED')]
    const patch = mergeExtractedIntoStudent(rows, student)
    expect((patch as { teachingTodos: unknown[] }).teachingTodos).toHaveLength(2)
  })

  it('deduplicates native languages case-insensitively', () => {
    const rows = [makeRow('nativeLanguages', 'english', 'ADDED')]
    const patch = mergeExtractedIntoStudent(rows, BASE_STUDENT)
    expect((patch as { nativeLanguages: string[] }).nativeLanguages).toEqual(['English'])
  })

  it('returns empty patch when no rows', () => {
    const patch = mergeExtractedIntoStudent([], BASE_STUDENT)
    expect(Object.keys(patch)).toHaveLength(0)
  })
})
