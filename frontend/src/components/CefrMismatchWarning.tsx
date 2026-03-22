import { useEffect, useState } from 'react'
import { getCefrGap } from '../lib/cefr-colors'

interface CefrMismatchWarningProps {
  studentName: string
  studentLevel: string | undefined
  lessonLevel: string | undefined
}

export function CefrMismatchWarning({ studentName, studentLevel, lessonLevel }: CefrMismatchWarningProps) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setDismissed(false)
  }, [studentLevel, lessonLevel])

  const gap = getCefrGap(studentLevel, lessonLevel)
  if (gap < 2 || dismissed) return null

  const direction = (studentLevel && lessonLevel)
    ? (['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].indexOf(lessonLevel) > ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].indexOf(studentLevel) ? 'above' : 'below')
    : 'away from'

  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      <span className="mt-0.5 shrink-0">⚠️</span>
      <span className="flex-1">
        <strong>{studentName}</strong> is currently {studentLevel}. This lesson is set to{' '}
        {lessonLevel}, which is {gap} level{gap !== 1 ? 's' : ''} {direction} their current level.
        Is this intentional?
      </span>
      <button
        type="button"
        aria-label="Dismiss warning"
        onClick={() => setDismissed(true)}
        className="shrink-0 text-amber-600 hover:text-amber-800"
      >
        ✕
      </button>
    </div>
  )
}
