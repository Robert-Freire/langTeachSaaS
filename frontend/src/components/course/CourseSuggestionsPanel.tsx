import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sparkles, Check, X, Pencil, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { logger } from '../../lib/logger'
import {
  getSuggestions,
  generateSuggestions,
  respondToSuggestion,
  type CourseSuggestion,
} from '../../api/courseSuggestions'

interface Props {
  courseId: string
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  accepted: { label: 'Accepted', className: 'text-green-700 border-green-200 bg-green-50' },
  dismissed: { label: 'Dismissed', className: 'text-gray-500 border-gray-200 bg-gray-50' },
}

function SuggestionCard({ suggestion, courseId }: { suggestion: CourseSuggestion; courseId: string }) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(suggestion.proposedChange)
  const queryClient = useQueryClient()

  const respond = useMutation({
    mutationFn: ({ action, teacherEdit }: { action: 'accept' | 'dismiss'; teacherEdit?: string }) =>
      respondToSuggestion(courseId, suggestion.id, { action, teacherEdit }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-suggestions', courseId] })
    },
    onError: (err) => logger.error('CourseSuggestionsPanel', 'respond failed', err),
  })

  const isPending = suggestion.status === 'pending'
  const statusBadge = STATUS_BADGE[suggestion.status]

  return (
    <div
      className={cn(
        'rounded-lg border p-4 space-y-3',
        isPending ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 bg-gray-50/50',
      )}
      data-testid={`suggestion-card-${suggestion.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {suggestion.curriculumEntryTopic && (
            <Badge variant="outline" className="text-xs font-normal">
              {suggestion.curriculumEntryOrderIndex !== null
                ? `Session ${suggestion.curriculumEntryOrderIndex + 1}: `
                : ''}
              {suggestion.curriculumEntryTopic}
            </Badge>
          )}
          {!isPending && statusBadge && (
            <Badge variant="outline" className={cn('text-xs', statusBadge.className)}>
              {statusBadge.label}
            </Badge>
          )}
        </div>
      </div>

      <div>
        {editing ? (
          <textarea
            className="w-full rounded-md border border-gray-300 p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            value={editText}
            onChange={e => setEditText(e.target.value)}
            data-testid="edit-textarea"
          />
        ) : (
          <p className="text-sm font-medium text-gray-900">
            {suggestion.teacherEdit ?? suggestion.proposedChange}
          </p>
        )}
        <p className="mt-1 text-xs text-gray-500 italic">{suggestion.reasoning}</p>
      </div>

      {isPending && (
        <div className="flex items-center gap-2 flex-wrap">
          {editing ? (
            <>
              <Button
                size="sm"
                onClick={() => respond.mutate({ action: 'accept', teacherEdit: editText })}
                disabled={respond.isPending}
                data-testid="confirm-edit-btn"
              >
                {respond.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Confirm
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setEditing(false); setEditText(suggestion.proposedChange) }}
                disabled={respond.isPending}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-green-700 border-green-300 hover:bg-green-50"
                onClick={() => respond.mutate({ action: 'accept' })}
                disabled={respond.isPending}
                data-testid="accept-btn"
              >
                {respond.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Accept
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(true)}
                disabled={respond.isPending}
                data-testid="edit-btn"
              >
                <Pencil className="h-3 w-3" />
                Edit & Accept
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-gray-500"
                onClick={() => respond.mutate({ action: 'dismiss' })}
                disabled={respond.isPending}
                data-testid="dismiss-btn"
              >
                <X className="h-3 w-3" />
                Dismiss
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function CourseSuggestionsPanel({ courseId }: Props) {
  const [showHistory, setShowHistory] = useState(false)
  const queryClient = useQueryClient()

  const { data: suggestions, isLoading, isError } = useQuery({
    queryKey: ['course-suggestions', courseId],
    queryFn: () => getSuggestions(courseId),
  })

  const generate = useMutation({
    mutationFn: () => generateSuggestions(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-suggestions', courseId] })
    },
    onError: (err) => logger.error('CourseSuggestionsPanel', 'generate failed', err),
  })

  const pending = suggestions?.filter(s => s.status === 'pending') ?? []
  const history = suggestions?.filter(s => s.status !== 'pending') ?? []

  return (
    <div className="space-y-4" data-testid="course-suggestions-panel">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <h3 className="font-medium text-gray-900">Adaptive suggestions</h3>
          {pending.length > 0 && (
            <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
              {pending.length}
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          data-testid="generate-btn"
        >
          {generate.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
          Generate
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" data-testid="suggestions-error">
          Failed to load suggestions. Please try again.
        </div>
      )}

      {!isLoading && pending.length === 0 && !generate.isPending && (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center" data-testid="empty-state">
          <p className="text-sm text-gray-500">
            No suggestions yet. Click <span className="font-medium">Generate</span> to analyse recent lessons.
          </p>
        </div>
      )}

      {pending.length > 0 && (
        <div className="space-y-3">
          {pending.map(s => (
            <SuggestionCard key={s.id} suggestion={s} courseId={courseId} />
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div>
          <button
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            onClick={() => setShowHistory(h => !h)}
            data-testid="history-toggle"
          >
            {showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showHistory ? 'Hide' : 'Show'} history ({history.length})
          </button>
          {showHistory && (
            <div className="mt-3 space-y-3">
              {history.map(s => (
                <SuggestionCard key={s.id} suggestion={s} courseId={courseId} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
