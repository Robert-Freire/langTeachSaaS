import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { getConstrainedSkills } from '../lib/competency-constraints'

interface CompetencyGapWarningProps {
  teacherNotes: string
  sessionCount: number
}

export function CompetencyGapWarning({ teacherNotes, sessionCount }: CompetencyGapWarningProps) {
  const [dismissed, setDismissed] = useState(false)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setDismissed(false)
  }, [teacherNotes])
  /* eslint-enable react-hooks/set-state-in-effect */

  const skills = getConstrainedSkills(teacherNotes)
  const count = isNaN(sessionCount) ? 0 : sessionCount

  if (skills.length === 0 || count < 3 || dismissed) return null

  const skillList = skills.length === 1
    ? skills[0]
    : skills.slice(0, -1).join(', ') + ' and ' + skills[skills.length - 1]

  return (
    <div data-testid="competency-gap-warning" className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="flex-1">
        Your teacher notes suggest <strong>{skillList}</strong> may be excluded from these{' '}
        {count} sessions. Removing core skills from multiple sessions may create competency gaps
        per CEFR guidelines. Is this intentional?
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
