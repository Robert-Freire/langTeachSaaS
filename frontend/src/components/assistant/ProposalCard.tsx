import { useState } from 'react'
import { Calendar, CheckSquare, Loader2, User, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { NewSessionData, NewStudentData, ProposalWithStatus } from '@/hooks/useAtelierAssistant'
import NewStudentFields from './NewStudentFields'

interface Props {
  proposal: ProposalWithStatus
  onApply: (id: string) => void
  onDismiss: (id: string) => void
  onUndo: (id: string) => void
  onRetry: (id: string) => void
  onModify: (id: string, newValue: string) => void
  onRedirectToChat: (prefill: string) => void
  onEditPayload?: (id: string, payload: NewStudentData | NewSessionData) => void
  studentId?: string | null
}

const MULTILINE_FIELDS = new Set(['actualContent', 'generalNotes', 'homeworkAssigned'])

function getRedirectPrefill(type: string): string {
  if (type === 'session') return 'Actually for the student profile not the session — '
  if (type === 'student') return 'Actually for the session not the student — '
  return 'Actually — '
}

const TYPE_CONFIG = {
  student: {
    Icon: User,
    accent: 'bg-indigo-500',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
  },
  session: {
    Icon: Calendar,
    accent: 'bg-violet-500',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
  },
  todo: {
    Icon: CheckSquare,
    accent: 'bg-emerald-500',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  newStudent: {
    Icon: UserPlus,
    accent: 'bg-teal-500',
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
  },
  newSession: {
    Icon: Calendar,
    accent: 'bg-amber-500',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
} as const

export default function ProposalCard({ proposal, onApply, onDismiss, onUndo, onRetry, onModify, onRedirectToChat, onEditPayload, studentId }: Props) {
  const config = TYPE_CONFIG[proposal.type]
  const { Icon } = config

  const isDismissed = proposal.status === 'dismissed'
  const isApplied = proposal.status === 'applied'
  const isApplying = proposal.status === 'applying'
  const isError = proposal.status === 'error'

  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')

  function startEdit() {
    setEditValue(proposal.newValue)
    setEditing(true)
  }

  function commitEdit() {
    const trimmed = editValue.trim()
    setEditing(false)
    if (trimmed && trimmed !== proposal.newValue) {
      onModify(proposal.id, trimmed)
    }
  }

  function cancelEdit() {
    setEditing(false)
  }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      commitEdit()
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  function handleEditBlur() {
    const trimmed = editValue.trim()
    setEditing(false)
    if (trimmed && trimmed !== proposal.newValue) {
      onModify(proposal.id, trimmed)
    }
  }

  const isMultiline = MULTILINE_FIELDS.has(proposal.field)
  const isNewStudent = proposal.type === 'newStudent'
  const isNewSession = proposal.type === 'newSession'
  const newSessionPayload = isNewSession ? (proposal.payload as NewSessionData | null | undefined) : null
  const newSessionApplyDisabled = isNewSession && !studentId

  return (
    <div
      data-testid={`proposal-card-${proposal.id}`}
      className={cn(
        'flex rounded-xl overflow-hidden transition-opacity duration-200',
        'bg-white shadow-[0_1px_4px_0_rgb(0_0_0_/_0.06)]',
        isDismissed && 'opacity-40',
      )}
    >
      {/* Accent bar */}
      <div className={cn('w-1 shrink-0', config.accent)} />

      <div className="flex-1 px-3 py-3 min-w-0">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-2">
          <span className={cn('h-6 w-6 rounded-full flex items-center justify-center shrink-0', config.iconBg)}>
            <Icon className={cn('h-3.5 w-3.5', config.iconColor)} aria-hidden="true" />
          </span>
          <span className="text-xs font-bold font-inter text-zinc-500 uppercase tracking-wide flex-1 truncate">
            {proposal.label}
          </span>
          {/* Status pill */}
          {isApplied && (
            <span className="text-[0.625rem] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-inter shrink-0">
              Applied
            </span>
          )}
          {isDismissed && (
            <span className="text-[0.625rem] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-400 font-inter shrink-0">
              Dismissed
            </span>
          )}
          {isError && (
            <span className="text-[0.625rem] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-inter shrink-0">
              Error
            </span>
          )}
        </div>

        {/* Content */}
        <div className="mb-2.5">
          {isNewSession ? (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold font-inter text-zinc-800">{proposal.newValue}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-inter text-zinc-500">Date:</span>
                <input
                  type="date"
                  value={newSessionPayload?.sessionDate ?? ''}
                  onChange={e => {
                    const date = e.target.value
                    if (date && onEditPayload) {
                      onEditPayload(proposal.id, {
                        title: newSessionPayload?.title ?? proposal.newValue,
                        sessionDate: date,
                      })
                    }
                  }}
                  data-testid={`session-date-input-${proposal.id}`}
                  className="text-sm font-inter border border-zinc-200 rounded-md px-2 py-0.5 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              {newSessionApplyDisabled && (
                <p className="text-xs text-zinc-500 font-inter">Open from a student's screen to schedule a session.</p>
              )}
            </div>
          ) : isNewStudent ? (
            <NewStudentFields
              payload={proposal.payload as NewStudentData ?? { name: proposal.newValue }}
              proposalId={proposal.id}
              onEditPayload={onEditPayload ?? (() => {})}
            />
          ) : editing ? (
            <div className="text-sm font-inter text-zinc-700 leading-relaxed">
              {isMultiline ? (
                <Textarea
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  onBlur={handleEditBlur}
                  rows={3}
                  autoFocus
                  data-testid={`modify-input-${proposal.id}`}
                  className="text-sm font-inter resize-none"
                />
              ) : (
                <Input
                  type="text"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  onBlur={handleEditBlur}
                  autoFocus
                  data-testid={`modify-input-${proposal.id}`}
                  className="text-sm font-inter"
                />
              )}
            </div>
          ) : (
            <div className="text-sm font-inter text-zinc-700 leading-relaxed">
              {proposal.oldValue ? (
                <span>
                  <span className="line-through text-zinc-400">{proposal.oldValue}</span>
                  {' '}
                  <span className="text-zinc-400 mx-0.5">→</span>
                  {' '}
                  <span className="font-semibold text-zinc-800">{proposal.newValue}</span>
                </span>
              ) : (
                <span className="font-semibold text-zinc-800">{proposal.newValue}</span>
              )}
            </div>
          )}
        </div>

        {/* Inline error */}
        {isError && proposal.errorMessage && (
          <p className="text-xs text-red-600 font-inter mb-2">{proposal.errorMessage}</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {proposal.status === 'proposed' && !editing && (
            <>
              <button
                onClick={() => !newSessionApplyDisabled && onApply(proposal.id)}
                disabled={newSessionApplyDisabled}
                data-testid={`apply-btn-${proposal.id}`}
                className={cn(
                  'text-xs font-semibold font-inter px-3 py-1 rounded-lg transition-colors',
                  newSessionApplyDisabled
                    ? 'text-zinc-400 bg-zinc-100 cursor-not-allowed'
                    : 'text-white bg-indigo-600 hover:bg-indigo-700'
                )}
              >
                Apply
              </button>
              <button
                onClick={() => onDismiss(proposal.id)}
                data-testid={`dismiss-btn-${proposal.id}`}
                className="text-xs font-semibold font-inter text-zinc-500 hover:text-zinc-700 px-3 py-1 rounded-lg hover:bg-zinc-100 transition-colors"
              >
                Dismiss
              </button>
              {!isNewStudent && !isNewSession && (
                <button
                  onClick={startEdit}
                  data-testid={`modify-btn-${proposal.id}`}
                  className="text-xs font-semibold font-inter text-indigo-600 hover:text-indigo-700 px-3 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  Modify
                </button>
              )}
            </>
          )}

          {proposal.status === 'proposed' && editing && (
            <>
              <button
                onMouseDown={e => { e.preventDefault(); commitEdit() }}
                data-testid={`modify-save-btn-${proposal.id}`}
                className="text-xs font-semibold font-inter text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded-lg transition-colors"
              >
                Save
              </button>
              <button
                onMouseDown={e => { e.preventDefault(); cancelEdit() }}
                data-testid={`modify-cancel-btn-${proposal.id}`}
                className="text-xs font-semibold font-inter text-zinc-500 hover:text-zinc-700 px-3 py-1 rounded-lg hover:bg-zinc-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onMouseDown={e => { e.preventDefault(); cancelEdit(); onRedirectToChat(getRedirectPrefill(proposal.type)) }}
                data-testid={`redirect-to-chat-btn-${proposal.id}`}
                className="text-xs font-inter text-zinc-400 hover:text-indigo-600 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors ml-auto"
                title="Wrong entity or scope? Redirect to chat"
              >
                Wrong entity?
              </button>
            </>
          )}

          {isApplying && (
            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" aria-label="Applying…" />
          )}

          {isDismissed && proposal.undoVisible && (
            <button
              onClick={() => onUndo(proposal.id)}
              data-testid={`undo-btn-${proposal.id}`}
              className="text-xs font-semibold font-inter text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              Undo
            </button>
          )}

          {isError && (
            <>
              <button
                onClick={() => onRetry(proposal.id)}
                data-testid={`retry-btn-${proposal.id}`}
                className="text-xs font-semibold font-inter text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded-lg transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => onDismiss(proposal.id)}
                className="text-xs font-semibold font-inter text-zinc-500 hover:text-zinc-700 px-3 py-1 rounded-lg hover:bg-zinc-100 transition-colors"
              >
                Dismiss
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
