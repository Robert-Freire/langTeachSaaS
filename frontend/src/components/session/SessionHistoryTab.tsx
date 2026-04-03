import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Trash2, ExternalLink, FileText } from 'lucide-react'
import { logger } from '../../lib/logger'
import { Link } from 'react-router-dom'
import { listSessions, deleteSession, parseTopicTags, type SessionLog } from '../../api/sessionLogs'
import { formatDate } from '../../utils/formatDate'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'

interface SessionHistoryTabProps {
  studentId: string
}

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`
  }
  const months = Math.floor(diffDays / 30)
  return `${months} month${months > 1 ? 's' : ''} ago`
}

const HOMEWORK_STATUS_STYLES: Record<string, string> = {
  Done: 'bg-green-50 text-green-700 border-green-200',
  Partial: 'bg-amber-50 text-amber-700 border-amber-200',
  NotDone: 'bg-red-50 text-red-700 border-red-200',
  NotApplicable: 'bg-zinc-100 text-zinc-500 border-zinc-200',
}

const HOMEWORK_STATUS_LABELS: Record<string, string> = {
  Done: 'HW: Done',
  Partial: 'HW: Partial',
  NotDone: 'HW: Not done',
  NotApplicable: 'HW: N/A',
}

const TAG_CATEGORY_STYLES: Record<string, string> = {
  grammar: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  vocabulary: 'bg-green-50 text-green-700 border-green-200',
  competency: 'bg-amber-50 text-amber-700 border-amber-200',
  communicativeFunction: 'bg-purple-50 text-purple-700 border-purple-200',
}

const TAG_CATEGORY_LABELS: Record<string, string> = {
  grammar: 'Grammar',
  vocabulary: 'Vocabulary',
  competency: 'Competency',
  communicativeFunction: 'Comm. function',
}

function notesCount(session: SessionLog): number {
  let count = 0
  if (session.generalNotes) count++
  if (session.nextSessionTopics) count++
  return count
}

function SessionEntry({ session, studentId }: { session: SessionLog; studentId: string }) {
  const [expanded, setExpanded] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { mutate: softDelete, isPending: isDeleting } = useMutation({
    mutationFn: () => deleteSession(studentId, session.id),
    onSuccess: () => {
      setDeleteOpen(false)
      setDeleteError(null)
      queryClient.invalidateQueries({ queryKey: ['sessions', studentId] })
    },
    onError: (err) => {
      logger.error('SessionHistoryTab', 'delete session failed', err)
      setDeleteError('Failed to delete session. Please try again.')
    },
  })

  const topicTags = parseTopicTags(session.topicTags)
  const notes = notesCount(session)
  const hwStatus = session.previousHomeworkStatusName

  return (
    <div
      className="border border-zinc-200 rounded-lg bg-white overflow-hidden"
      data-testid="session-entry"
    >
      {/* Inline preview row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left p-4 hover:bg-zinc-50 transition-colors"
        aria-expanded={expanded}
        data-testid="session-entry-toggle"
      >
        <div className="flex items-start justify-between gap-3 min-w-0">
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Date row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-zinc-900">
                {formatDate(session.sessionDate)}
              </span>
              <span className="text-xs text-zinc-400">{relativeTime(session.sessionDate)}</span>
              {notes > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                  <FileText className="h-3 w-3" />
                  {notes} {notes === 1 ? 'note' : 'notes'}
                </span>
              )}
            </div>

            {/* Planned */}
            {session.plannedContent && (
              <p className="text-xs text-zinc-500 truncate">
                <span className="font-medium text-zinc-700">Planned:</span>{' '}
                {session.plannedContent}
              </p>
            )}

            {/* Actual */}
            {session.actualContent && (
              <p className="text-xs text-zinc-600 truncate">
                <span className="font-medium text-zinc-700">Done:</span>{' '}
                {session.actualContent}
              </p>
            )}

            {/* Homework + status badges */}
            <div className="flex flex-wrap gap-1.5 items-center">
              {session.homeworkAssigned && (
                <span className="text-xs text-zinc-500 truncate max-w-[160px]">
                  HW: {session.homeworkAssigned}
                </span>
              )}
              {hwStatus && hwStatus !== 'NotApplicable' && (
                <Badge
                  variant="outline"
                  className={`text-xs ${HOMEWORK_STATUS_STYLES[hwStatus] ?? 'bg-zinc-100 text-zinc-500'}`}
                  data-testid="hw-status-badge"
                >
                  {HOMEWORK_STATUS_LABELS[hwStatus] ?? hwStatus}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-zinc-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-400" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div
          className="border-t border-zinc-100 p-4 space-y-3 bg-zinc-50/50"
          data-testid="session-entry-detail"
        >
          {session.plannedContent && (
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-0.5">What was planned</p>
              <p className="text-sm text-zinc-800 whitespace-pre-wrap">{session.plannedContent}</p>
            </div>
          )}

          {session.actualContent && (
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-0.5">What was done</p>
              <p className="text-sm text-zinc-800 whitespace-pre-wrap">{session.actualContent}</p>
            </div>
          )}

          {session.generalNotes && (
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-0.5">Notes</p>
              <p className="text-sm text-zinc-800 whitespace-pre-wrap">{session.generalNotes}</p>
            </div>
          )}

          {session.nextSessionTopics && (
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-0.5">Topics for next session</p>
              <p className="text-sm text-zinc-800 whitespace-pre-wrap">{session.nextSessionTopics}</p>
            </div>
          )}

          {topicTags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-1">Topic tags</p>
              <div className="flex flex-wrap gap-1.5" data-testid="topic-tags">
                {topicTags.map((tag, i) => {
                  const catClass = tag.category
                    ? (TAG_CATEGORY_STYLES[tag.category] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200')
                    : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                  const catLabel = tag.category
                    ? (TAG_CATEGORY_LABELS[tag.category] ?? tag.category)
                    : null
                  return (
                    <span
                      key={`${tag.tag}-${i}`}
                      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${catClass}`}
                      data-testid="topic-tag-chip"
                    >
                      {tag.tag}
                      {catLabel && (
                        <span className="opacity-60 text-[10px]">({catLabel})</span>
                      )}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {session.levelReassessmentSkill && session.levelReassessmentLevel && (
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-0.5">Level reassessment</p>
              <p className="text-sm text-zinc-800">
                {session.levelReassessmentSkill}: {session.levelReassessmentLevel}
              </p>
            </div>
          )}

          {session.linkedLessonId && (
            <div>
              <Link
                to={`/lessons/${session.linkedLessonId}`}
                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                data-testid="linked-lesson-link"
              >
                <ExternalLink className="h-3 w-3" />
                View linked lesson
              </Link>
            </div>
          )}

          {/* Delete action */}
          <div className="flex justify-end pt-1">
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                    disabled={isDeleting}
                    data-testid="delete-session-button"
                  />
                }
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete session log?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This session record will be removed. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  {deleteError && (
                    <p className="text-xs text-red-600 w-full text-center mb-1" data-testid="delete-session-error">
                      {deleteError}
                    </p>
                  )}
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => softDelete()}
                    disabled={isDeleting}
                    className="bg-red-600 hover:bg-red-700 text-white"
                    data-testid="confirm-delete-session"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </div>
  )
}

export function SessionHistoryTab({ studentId }: SessionHistoryTabProps) {
  const { data: sessions, isLoading, isError, refetch } = useQuery({
    queryKey: ['sessions', studentId],
    queryFn: () => listSessions(studentId),
  })

  if (isLoading) {
    return (
      <div className="space-y-3 pt-4" data-testid="session-history-loading">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border border-zinc-200 rounded-lg p-4 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 gap-3"
        data-testid="session-history-error"
      >
        <p className="text-sm text-zinc-500">Failed to load session history.</p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 gap-2"
        data-testid="session-history-empty"
      >
        <p className="text-sm text-zinc-500">
          No sessions logged yet. Use &lsquo;Log session&rsquo; to record your first class.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 pt-4" data-testid="session-history-list">
      {sessions.map((session) => (
        <SessionEntry key={session.id} session={session} studentId={studentId} />
      ))}
    </div>
  )
}
