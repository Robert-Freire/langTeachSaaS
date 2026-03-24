import type { Student } from '../api/students'

export const COMPLETENESS_FIELDS: Array<{ key: keyof Student; label: string }> = [
  { key: 'nativeLanguage', label: 'native language' },
  { key: 'cefrLevel', label: 'CEFR level' },
  { key: 'interests', label: 'interests' },
  { key: 'learningGoals', label: 'learning goals' },
  { key: 'weaknesses', label: 'known weaknesses' },
  { key: 'difficulties', label: 'documented difficulties' },
]

export function isFieldPopulated(student: Student, key: keyof Student): boolean {
  const value = student[key]
  if (value == null) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return false
}

export function computeProfileCompleteness(student: Student): { score: number; missingFields: string[] } {
  const populated = COMPLETENESS_FIELDS.filter(f => isFieldPopulated(student, f.key))
  const missing = COMPLETENESS_FIELDS.filter(f => !isFieldPopulated(student, f.key)).map(f => f.label)
  return {
    score: Math.round((populated.length / COMPLETENESS_FIELDS.length) * 100),
    missingFields: missing,
  }
}
