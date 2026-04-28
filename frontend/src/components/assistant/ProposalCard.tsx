import { Calendar, CheckSquare, Loader2, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProposalWithStatus } from '@/hooks/useAtelierAssistant'

interface Props {
  proposal: ProposalWithStatus
  onApply: (id: string) => void
  onDismiss: (id: string) => void
  onUndo: (id: string) => void
  onRetry: (id: string) => void
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
} as const

export default function ProposalCard({ proposal, onApply, onDismiss, onUndo, onRetry }: Props) {
  const config = TYPE_CONFIG[proposal.type]
  const { Icon } = config

  const isDismissed = proposal.status === 'dismissed'
  const isApplied = proposal.status === 'applied'
  const isApplying = proposal.status === 'applying'
  const isError = proposal.status === 'error'

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

        {/* Diff */}
        <div className="text-sm font-inter text-zinc-700 mb-2.5 leading-relaxed">
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

        {/* Inline error */}
        {isError && proposal.errorMessage && (
          <p className="text-xs text-red-600 font-inter mb-2">{proposal.errorMessage}</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {proposal.status === 'proposed' && (
            <>
              <button
                onClick={() => onApply(proposal.id)}
                data-testid={`apply-btn-${proposal.id}`}
                className="text-xs font-semibold font-inter text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded-lg transition-colors"
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
