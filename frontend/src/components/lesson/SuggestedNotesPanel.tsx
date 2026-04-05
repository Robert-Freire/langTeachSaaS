import { Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ExtractedReflection, SaveLessonNotesRequest } from '../../api/lessons'

interface SuggestedNotesPanelProps {
  suggestions: ExtractedReflection
  onApplyAll: (values: Partial<SaveLessonNotesRequest>) => void
  onDismiss: () => void
}

const SUGGESTION_FIELDS: {
  key: keyof ExtractedReflection
  formKey: keyof SaveLessonNotesRequest
  label: string
}[] = [
  { key: 'whatWasCovered', formKey: 'whatWasCovered', label: 'What was covered' },
  { key: 'areasToImprove', formKey: 'areasToImprove', label: 'Areas to improve' },
  { key: 'emotionalSignals', formKey: 'emotionalSignals', label: 'Emotional observations' },
  { key: 'homeworkAssigned', formKey: 'homeworkAssigned', label: 'Homework assigned' },
  { key: 'nextLessonIdeas', formKey: 'nextLessonIdeas', label: 'Next lesson ideas' },
]

export function SuggestedNotesPanel({ suggestions, onApplyAll, onDismiss }: SuggestedNotesPanelProps) {
  const availableFields = SUGGESTION_FIELDS.filter(f => suggestions[f.key])

  if (availableFields.length === 0) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800" data-testid="suggestions-empty">
        <p>No structured notes could be extracted from the transcription.</p>
        <Button variant="ghost" size="sm" className="mt-1 h-auto p-0 text-xs text-amber-600" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    )
  }

  function handleApplyAll() {
    const values = Object.fromEntries(
      SUGGESTION_FIELDS
        .filter(({ key }) => suggestions[key])
        .map(({ key, formKey }) => [formKey, suggestions[key]])
    ) as Partial<SaveLessonNotesRequest>
    onApplyAll(values)
  }

  function handleApplyOne(formKey: keyof SaveLessonNotesRequest, value: string) {
    onApplyAll({ [formKey]: value })
  }

  return (
    <div className="rounded-md border border-blue-200 bg-blue-50 p-3 space-y-2" data-testid="suggestions-panel">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-blue-800">
          <Sparkles className="h-3.5 w-3.5" />
          AI-extracted suggestions
        </div>
        <button
          onClick={onDismiss}
          className="text-blue-500 hover:text-blue-700"
          aria-label="Dismiss suggestions"
          data-testid="suggestions-dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-1.5">
        {availableFields.map(({ key, formKey, label }) => (
          <div key={key} className="flex items-start gap-2 text-xs" data-testid={`suggestion-${key}`}>
            <span className="shrink-0 font-medium text-blue-700 w-36">{label}:</span>
            <span className="flex-1 text-blue-900 line-clamp-2">{suggestions[key]}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-0 px-1.5 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-100 shrink-0"
              onClick={() => handleApplyOne(formKey, suggestions[key]!)}
              data-testid={`suggestion-use-${key}`}
            >
              Use
            </Button>
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
        onClick={handleApplyAll}
        data-testid="suggestions-apply-all"
      >
        Apply all suggestions
      </Button>
    </div>
  )
}
