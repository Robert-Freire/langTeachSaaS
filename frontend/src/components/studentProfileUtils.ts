import type { Student } from '../api/students'

interface CompletenessField {
  key: string
  label: string
  getValue: (s: Student) => unknown
}

export const COMPLETENESS_FIELDS: CompletenessField[] = [
  { key: 'nativeLanguages', label: 'native language', getValue: s => s.languages.nativeLanguages },
  { key: 'cefrLevel', label: 'CEFR level', getValue: s => s.level.cefrLevel },
  { key: 'interests', label: 'interests', getValue: s => s.profile.interests },
  { key: 'learningGoals', label: 'learning goals', getValue: s => s.profile.learningGoals },
  { key: 'weaknesses', label: 'known weaknesses', getValue: s => s.profile.weaknesses },
  { key: 'difficulties', label: 'documented difficulties', getValue: s => s.profile.difficulties },
]

export function isFieldPopulated(student: Student, field: CompletenessField): boolean {
  const value = field.getValue(student)
  if (value == null) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return false
}

export function computeProfileCompleteness(student: Student): { score: number; missingFields: string[] } {
  const populated = COMPLETENESS_FIELDS.filter(f => isFieldPopulated(student, f))
  const missing = COMPLETENESS_FIELDS.filter(f => !isFieldPopulated(student, f)).map(f => f.label)
  return {
    score: Math.round((populated.length / COMPLETENESS_FIELDS.length) * 100),
    missingFields: missing,
  }
}
