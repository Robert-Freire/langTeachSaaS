import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { getCefrGap, CEFR_LEVELS } from '../lib/cefr-colors'

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

  const direction = CEFR_LEVELS.indexOf(lessonLevel as (typeof CEFR_LEVELS)[number]) > CEFR_LEVELS.indexOf(studentLevel as (typeof CEFR_LEVELS)[number])
    ? 'above'
    : 'below'

  return (
    <div data-testid="cefr-mismatch-warning" className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="flex-1">
        <strong>{studentName}</strong> is currently {studentLevel}. This lesson is set to{' '}
        {lessonLevel}, which is {gap} level{gap !== 1 ? 's' : ''} {direction} their current level.
        Is this intentional?
      </span>
      <button
        type="button"
        aria-label="Dismiss warning"
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded text-amber-600 hover:text-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
