import { User, CheckCircle2, Circle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { Student } from '../api/students'

interface Props {
  student: Student
}

const COMPLETENESS_FIELDS: Array<{ key: keyof Student; label: string }> = [
  { key: 'nativeLanguage', label: 'native language' },
  { key: 'interests', label: 'interests' },
  { key: 'learningGoals', label: 'learning goals' },
  { key: 'weaknesses', label: 'known weaknesses' },
  { key: 'difficulties', label: 'documented difficulties' },
]

function isFieldPopulated(student: Student, key: keyof Student): boolean {
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

export function StudentProfileSummary({ student }: Props) {
  const { score, missingFields } = computeProfileCompleteness(student)

  return (
    <Card className="border-zinc-200 bg-zinc-50" data-testid="student-profile-summary">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
          <span className="text-xs font-medium text-zinc-800">{student.name}</span>
          <span className="text-xs text-zinc-500 ml-auto">
            {student.cefrLevel} {student.learningLanguage}
          </span>
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {COMPLETENESS_FIELDS.map(({ key, label }) => {
            const populated = isFieldPopulated(student, key)
            return (
              <div key={key} className="flex items-center gap-1 text-xs" data-testid={`profile-field-${key}`}>
                {populated
                  ? <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                  : <Circle className="h-3 w-3 text-zinc-300 shrink-0" />
                }
                <span className={populated ? 'text-zinc-600' : 'text-zinc-400'}>{label}</span>
                {key === 'nativeLanguage' && student.nativeLanguage && (
                  <span className="text-zinc-500">({student.nativeLanguage})</span>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${score}%` }}
              data-testid="completeness-bar"
            />
          </div>
          <span className="text-xs font-medium text-zinc-600 shrink-0" data-testid="completeness-score">{score}% complete</span>
        </div>

        {missingFields.length > 0 && (
          <p className="text-xs text-zinc-400" data-testid="missing-fields-hint">
            Adding {missingFields.join(', ')} would improve targeting.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
